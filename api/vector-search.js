// API Endpoint: /api/vector-search for Qdrant Semantic Vector Search
import { searchQdrantRecords, indexRecordInQdrant } from "./qdrant.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST method required" });
  }

  try {
    let body = req.body || {};
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch (_) { body = {}; }
    }

    let urlObj = null;
    try { urlObj = new URL(req.url, "http://localhost"); } catch (_) {}

    const action = body.action || (urlObj ? urlObj.searchParams.get("action") : null);
    const query = (body.query || body.search || body.q || (urlObj ? urlObj.searchParams.get("query") : null) || "").trim();
    const userId = body.userId || (urlObj ? urlObj.searchParams.get("userId") : null);
    const record = body.record;
    const records = Array.isArray(body.records) ? body.records : [];

    // Bulk index records into Qdrant vector database
    if (action === "index" || action === "index_bulk") {
      if (Array.isArray(records) && records.length > 0) {
        for (const rec of records) {
          await indexRecordInQdrant(rec);
        }
        return res.status(200).json({ success: true, message: `Indexed ${records.length} records into Qdrant Vector DB` });
      } else if (record) {
        const result = await indexRecordInQdrant(record);
        return res.status(200).json({ success: true, result });
      }
      return res.status(400).json({ error: "No record or records provided to index" });
    }

    // Execute Qdrant Vector Similarity Search
    if (!query) {
      return res.status(400).json({ error: "Query parameter is required (e.g. query='fever')" });
    }

    // Index any records passed alongside search request to ensure latest state
    if (Array.isArray(records) && records.length > 0) {
      for (const rec of records) {
        await indexRecordInQdrant(rec);
      }
    }

    const searchResults = await searchQdrantRecords(query.trim(), userId || null, 5);

    return res.status(200).json({
      success: true,
      query: query,
      totalMatches: searchResults.length,
      results: searchResults
    });

  } catch (err) {
    console.error("Vector search API error:", err);
    return res.status(500).json({ error: "Qdrant vector search failed", details: err.message });
  }
}
