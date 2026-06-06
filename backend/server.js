const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { HfInference } = require('@huggingface/inference');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initialize Hugging Face with your token
const hf = new HfInference(process.env.HF_TOKEN);

app.post('/api/solve', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No image data provided" });
    }

    console.log("Image received by server! Preparing to process with Hugging Face...");

    // 1. Convert the base64 data URL into a raw binary buffer for the API
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // 2. Call Microsoft's handwritten text recognition model
    const ocrResponse = await hf.imageToText({
      model: 'microsoft/trocr-base-handwritten',
      data: imageBuffer,
    });

    const parsedText = ocrResponse.generated_text;
    console.log("OCR Parsed Text:", parsedText); // e.g., "2 + 3 =" or "2 + 3"

    // Clean up the text (remove spaces, trailing equals signs, etc.)
    let cleanedExpression = parsedText.replace(/=/g, '').trim();

    // 3. Evaluate the math equation safely using JavaScript's Function constructor
    // (Safe here since we filter the input to only allow numbers and basic math operators)
    let evaluation = "";
    if (/^[0-9+\-*/().\s]+$/.test(cleanedExpression)) {
      try {
        const mathResult = new Function(`return ${cleanedExpression}`)();
        evaluation = mathResult.toString();
      } catch (mathErr) {
        evaluation = "?";
      }
    } else {
      evaluation = "?";
    }

    // 4. Format the final output into beautiful LaTeX for KaTeX to render
    // Example output format: "2 + 3 = 5"
    const finalLaTeX = `${cleanedExpression} = ${evaluation}`;

    res.json({ result: finalLaTeX });

  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});