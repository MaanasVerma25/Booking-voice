"""AI4 booth voice agent, LiveKit port of bryanbamf/rime-voice-agent.

Stack (per the Rime + LiveKit quickstart and the chosen options):
  STT  : LiveKit Inference, deepgram/nova-3 (keyless, LiveKit Cloud creds only)
  LLM  : Claude Haiku 4.5 via the Anthropic plugin (ANTHROPIC_API_KEY)
  TTS  : Rime Coda via the Rime plugin, per-voice time_scale_factor (RIME_API_KEY)
  Turn : MultilingualModel turn detection + Silero VAD + BVC noise cancellation

Each session is one industry + one voice (a voice/industry change is a fresh
call by design). The browser frontend creates the room with JSON metadata
{"industry": "...", "voice": "..."} and the agent configures itself from it.
"""
import json
import logging

from dotenv import load_dotenv
from livekit import agents
from livekit.agents import Agent, AgentSession, JobContext, RoomInputOptions, WorkerOptions, cli, inference
from livekit.plugins import noise_cancellation, openai, rime, silero

from personas import SCENARIOS, build_instructions, voice_entry, voice_speed
from pronounce import display_text, tts_pronounce

load_dotenv()
logger = logging.getLogger("ai4-booth")

DEFAULT_INDUSTRY = "healthcare"


def _resolve_config(ctx: JobContext):
    """Read {industry, voice} from room (or job) metadata, with safe defaults."""
    raw = (ctx.room.metadata or "").strip() or (ctx.job.metadata or "").strip()
    industry, voice = DEFAULT_INDUSTRY, SCENARIOS[DEFAULT_INDUSTRY]["recommended"]
    if raw:
        try:
            data = json.loads(raw)
            if data.get("industry") in SCENARIOS:
                industry = data["industry"]
                voice = SCENARIOS[industry]["recommended"]
            if data.get("voice"):
                voice = data["voice"]
        except (ValueError, TypeError):
            logger.warning("could not parse room metadata: %r", raw)
    entry = voice_entry(industry, voice)  # validates + falls back to recommended
    return industry, entry


class BoothAgent(Agent):
    """Buffers the full reply before TTS (one full-context request, like the
    browser demo) and hardens pronunciation via tts_pronounce."""

    async def tts_node(self, text, model_settings):
        async def hardened():
            full = ""
            async for chunk in text:
                full += chunk
            yield tts_pronounce(full)

        async for frame in Agent.default.tts_node(self, hardened(), model_settings):
            yield frame

    async def transcription_node(self, text, model_settings):
        # Show the original text (Rime, AI4) cleaned of expressive tokens and
        # stress markers; tts_node still feeds the hardened text to the TTS.
        full = ""
        async for chunk in text:
            full += chunk
        yield display_text(full)


async def entrypoint(ctx: JobContext):
    await ctx.connect()

    industry, voice = _resolve_config(ctx)
    voice_id = voice["id"]
    logger.info("booth session: industry=%s voice=%s (%s)", industry, voice_id, voice["char"])

    session = AgentSession(
        stt=inference.STT(model="deepgram/nova-3", language="multi"),
        llm=openai.LLM.with_groq(model="llama-3.3-70b-versatile"),
        tts=rime.TTS(
            model="coda",
            speaker=voice_id,
            time_scale_factor=voice_speed(voice_id),  # luna 1.1, vespera 1.05
        ),
        vad=silero.VAD.load(),
        turn_detection="manual",  # push-to-talk: the visitor drives turn boundaries
        # Start LLM + TTS on interim transcripts while the visitor is still
        # talking, so the reply is largely synthesized by the time they tap
        # send. Cuts seconds of dead air on booth wifi; a discarded
        # speculation costs only a few LLM tokens.
        preemptive_generation=True,
    )

    @session.on("user_input_transcribed")
    def _on_user_transcript(ev):
        logger.info("STT heard: %r (final=%s)", getattr(ev, "transcript", None), getattr(ev, "is_final", None))

    await session.start(
        room=ctx.room,
        agent=BoothAgent(instructions=build_instructions(industry, voice_id)),
        room_input_options=RoomInputOptions(noise_cancellation=noise_cancellation.BVC()),
    )

    # Push-to-talk (strict half-duplex): the agent listens only during a turn
    # the visitor starts, so mic and agent audio never overlap. The frontend's
    # mic button drives these over RPC.
    session.input.set_audio_enabled(False)

    @ctx.room.local_participant.register_rpc_method("start_turn")
    async def _start_turn(data):
        session.interrupt()        # stop any agent speech immediately
        session.clear_user_turn()  # discard any buffered input
        session.input.set_audio_enabled(True)
        return "ok"

    @ctx.room.local_participant.register_rpc_method("end_turn")
    async def _end_turn(data):
        session.input.set_audio_enabled(False)
        session.commit_user_turn()  # process the turn and generate the reply
        return "ok"

    @ctx.room.local_participant.register_rpc_method("cancel_turn")
    async def _cancel_turn(data):
        session.input.set_audio_enabled(False)
        session.clear_user_turn()   # discard the turn without replying
        return "ok"

    # Scripted first line for this voice. The transcript shows the original text;
    # tts_node hardens pronunciation (Rime -> Rhyme, AI4).
    await session.say(voice["greeting"], allow_interruptions=True)


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, agent_name="booth-agent"))
