// Vercel serverless function: OCR text extraction using OCR.space API.
const OCR_API_KEY = process.env.OCR_API_KEY || "K83874560888957";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST method required" });
  }

  try {
    let body = req.body || {};
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch (_) { body = {}; }
    }

    const { base64Data, fileUrl, fileType } = body;
    if (!base64Data && !fileUrl) {
      return res.status(400).json({ error: "base64Data or fileUrl is required" });
    }

    const formData = new URLSearchParams();
    formData.append("apikey", OCR_API_KEY);
    formData.append("language", "eng");
    formData.append("isOverlayRequired", "false");
    formData.append("detectOrientation", "true");
    formData.append("scale", "true");
    formData.append("OCREngine", "2");

    if (base64Data) {
      // Ensure data URI prefix format if needed
      let formattedBase64 = base64Data;
      if (!formattedBase64.startsWith("data:")) {
        const mime = fileType || "image/png";
        formattedBase64 = `data:${mime};base64,${base64Data}`;
      }
      formData.append("base64Image", formattedBase64);
    } else if (fileUrl) {
      formData.append("url", fileUrl);
    }

    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString()
    });

    const data = await response.json();

    if (data && data.ParsedResults && data.ParsedResults.length > 0) {
      const extractedText = data.ParsedResults
        .map(result => result.ParsedText || "")
        .join("\n")
        .trim();

      return res.status(200).json({
        success: true,
        ocrText: extractedText || "No readable text found in document.",
        rawResult: data
      });
    } else {
      const errorMsg = data && data.ErrorMessage ? data.ErrorMessage.join(", ") : "OCR parsing returned no text.";
      return res.status(200).json({
        success: false,
        ocrText: "",
        message: errorMsg
      });
    }
  } catch (err) {
    console.error("OCR API error:", err);
    return res.status(500).json({ error: "Failed to parse document text", details: err.message });
  }
}
