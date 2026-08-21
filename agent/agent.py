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
import os
import urllib.request
import urllib.parse

from dotenv import load_dotenv
from livekit import agents
from livekit.agents import Agent, AgentSession, JobContext, RoomInputOptions, WorkerOptions, cli, inference, llm
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

    @llm.ai_callable(description="Book an appointment for a patient and sync to Google Calendar & Google Sheet")
    async def book_appointment(
        self,
        patient_name: str,
        phone_number: str,
        doctor_or_specialty: str,
        date_time: str,
        insurance_details: str = "N/A",
        notes: str = "Booked via voice agent",
    ) -> str:
        """Call when patient confirms an appointment booking."""
        logger.info(
            "Booking appointment tool called: patient=%s doctor=%s date_time=%s",
            patient_name,
            doctor_or_specialty,
            date_time,
        )
        payload = {
            "patient_name": patient_name,
            "phone_number": phone_number,
            "doctor_or_specialty": doctor_or_specialty,
            "date_time": date_time,
            "insurance_details": insurance_details,
            "notes": notes,
        }
        
        # 1. Dispatch to local Node endpoint if running
        api_url = os.getenv("API_SERVER_URL", "http://localhost:3000/api/book-appointment")
        webhook_url = os.getenv("GOOGLE_WEBHOOK_URL", "")

        target_url = webhook_url if webhook_url else api_url
        try:
            req = urllib.request.Request(
                target_url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                logger.info("Appointment booking synced to %s successfully (status=%s)", target_url, resp.status)
        except Exception as e:
            logger.warning("Appointment booking webhook call exception: %s", e)

        return f"Successfully scheduled appointment for {patient_name} with {doctor_or_specialty} on {date_time}."

    @llm.ai_callable(description="Looks up a patient profile and past medical records from Supabase using their 2-digit Patient Number (e.g. 14, 42).")
    async def lookup_patient_by_number(self, patient_no: int) -> str:
        """Call when a caller on a phone call mentions their 2-digit Patient Number."""
        supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
        supabase_key = os.getenv("SUPABASE_ANON_KEY", "")
        if not supabase_url or not supabase_key:
            return f"Patient Number {patient_no} recorded, but Supabase credentials are missing."

        try:
            url = f"{supabase_url}/rest/v1/profiles?patient_no=eq.{patient_no}&select=*"
            req = urllib.request.Request(url, headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if data and isinstance(data, list) and len(data) > 0:
                    profile = data[0]
                    return f"Found Supabase patient record: Name: {profile.get('full_name')}, Phone: {profile.get('phone_number')}, Patient No: #{profile.get('patient_no')}."
        except Exception as e:
            logger.warning("Supabase patient lookup exception: %s", e)

        return f"No record found in Supabase for Patient Number #{patient_no}."

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
    tts_model = os.getenv("RIME_MODEL", "coda")  # Rime Coda model for spoken output
    logger.info("booth session: industry=%s voice=%s (%s) tts_model=%s", industry, voice_id, voice["char"], tts_model)

    session = AgentSession(
        stt=inference.STT(model="deepgram/nova-3", language="multi"),
        llm=openai.LLM.with_groq(model="openai/gpt-oss-120b"),
        tts=rime.TTS(
            model=tts_model,
            speaker=voice_id,
            time_scale_factor=voice_speed(voice_id),
        ),
        vad=silero.VAD.load(),
        turn_detection="manual",  # push-to-talk: the visitor drives turn boundaries
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
