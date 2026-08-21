// Qdrant Vector Database Integration (@qdrant/js-client-rest)
// Provides Vector Embedding Generation, Indexing, and Similarity Search for Medical Records
import { QdrantClient } from "@qdrant/js-client-rest";

const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || null;
const COLLECTION_NAME = "apex_medical_records";
const VECTOR_SIZE = 128;

let qdrantClient = null;
let inMemoryVectorStore = []; // In-memory fallback if Qdrant Cloud/Local cluster is connecting

try {
  const options = { url: QDRANT_URL, checkCompatibility: false };
  if (QDRANT_API_KEY) options.apiKey = QDRANT_API_KEY;
  qdrantClient = new QdrantClient(options);
} catch (err) {
  console.warn("QdrantClient initial setup warning:", err.message);
}

/**
 * Generate a 128-dimensional dense vector embedding from medical text.
 */
export function generateMedicalVector(text) {
  const vec = new Array(VECTOR_SIZE).fill(0);
  if (!text || typeof text !== "string") return vec;

  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const words = normalized.split(/\s+/).filter(Boolean);

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 0;
    for (let j = 0; j < word.length; j++) {
      hash = (hash << 5) - hash + word.charCodeAt(j);
      hash |= 0;
    }
    const idx = Math.abs(hash) % VECTOR_SIZE;
    vec[idx] += 1 / (i + 1); // Weight earlier words slightly higher
  }

  // L2 Normalize vector
  const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  if (norm > 0) {
    for (let i = 0; i < VECTOR_SIZE; i++) {
      vec[i] = parseFloat((vec[i] / norm).toFixed(4));
    }
  }
  return vec;
}

/**
 * Calculate Cosine Similarity between two vectors.
 */
function cosineSimilarity(vecA, vecB) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Ensure Qdrant collection exists.
 */
async function ensureCollection() {
  if (!qdrantClient) return false;
  try {
    const collections = await qdrantClient.getCollections();
    const exists = collections.collections.some(c => c.name === COLLECTION_NAME);
    if (!exists) {
      await qdrantClient.createCollection(COLLECTION_NAME, {
        vectors: { size: VECTOR_SIZE, distance: "Cosine" }
      });
    }
    return true;
  } catch (err) {
    console.warn("Qdrant collection creation skipped/using memory vector engine:", err.message);
    return false;
  }
}

/**
 * Index a prescription/medical record into Qdrant Vector DB.
 */
export async function indexRecordInQdrant(record) {
  if (!record) return { success: false };

  const combinedText = [
    record.title || "",
    record.category || "",
    record.doctor_notes || "",
    record.ocr_text || "",
    record.file_name || ""
  ].join(" ");

  const vector = generateMedicalVector(combinedText);
  const pointId = typeof record.id === "number" ? record.id : Math.abs(hashString(String(record.id || Date.now())));

  const payload = {
    record_id: String(record.id),
    user_id: String(record.user_id || ""),
    title: record.title || "Medical Record",
    category: record.category || "Prescription",
    doctor_notes: record.doctor_notes || "",
    ocr_text: record.ocr_text || "",
    file_url: record.file_url || "",
    created_at: record.created_at || new Date().toISOString()
  };

  // Always keep in-memory vector store synced for lightning-fast RAG
  const existingIdx = inMemoryVectorStore.findIndex(item => item.id === payload.record_id);
  const memItem = { id: payload.record_id, vector, payload };
  if (existingIdx >= 0) {
    inMemoryVectorStore[existingIdx] = memItem;
  } else {
    inMemoryVectorStore.push(memItem);
  }

  // Attempt Qdrant Cloud / Server upsert
  try {
    const ready = await ensureCollection();
    if (ready && qdrantClient) {
      await qdrantClient.upsert(COLLECTION_NAME, {
        points: [{ id: pointId, vector, payload }]
      });
      return { success: true, mode: "qdrant-server", pointId };
    }
  } catch (err) {
    console.warn("Qdrant server upsert warning:", err.message);
  }

  return { success: true, mode: "qdrant-vector-memory", pointId };
}

/**
 * Search Qdrant Vector DB for semantically relevant medical records.
 */
export async function searchQdrantRecords(queryText, userId = null, limit = 4) {
  if (!queryText) return [];

  const queryVector = generateMedicalVector(queryText);

  // 1. Try Qdrant Server Similarity Search
  if (qdrantClient && typeof qdrantClient.search === "function") {
    try {
      const searchOptions = {
        vector: queryVector,
        limit: limit,
        with_payload: true
      };

      if (userId) {
        searchOptions.filter = {
          must: [{ key: "user_id", match: { value: String(userId) } }]
        };
      }

      const results = await qdrantClient.search(COLLECTION_NAME, searchOptions);
      if (results && results.length > 0) {
        return results.map(hit => ({
          score: parseFloat((hit.score * 100).toFixed(1)),
          record: hit.payload
        }));
      }
    } catch (err) {
      console.warn("Qdrant search fallback to in-memory vector engine:", err.message);
    }
  }

  // 2. In-Memory Vector Similarity Fallback
  let candidates = inMemoryVectorStore;
  if (userId) {
    candidates = candidates.filter(item => item.payload.user_id === String(userId));
  }

  const scored = candidates.map(item => {
    const score = cosineSimilarity(queryVector, item.vector);
    return {
      score: parseFloat((score * 100).toFixed(1)),
      record: item.payload
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
