const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initialize Gemini with your API Key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/solve', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No image data provided" });
    }

    console.log("Image received! Routing to Gemini 2.5 Flash...");

    // 1. Format the base64 image data for the Gemini SDK
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: "image/png"
      }
    };

    // 2. Call the Gemini model with strict prompting
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = "Read the handwritten math equation in this image. Reply ONLY with the exact numbers and mathematical symbols you see. Do not add any other words, markdown, or attempt to solve it.";
    
    const response = await model.generateContent([prompt, imagePart]);
    const parsedText = response.response.text();
    
    console.log("Gemini Saw:", parsedText);

    // 3. Robust Regex: Strip out text words, letters, and isolate the math expression
    let cleanedExpression = parsedText
      .replace(/[a-zA-Z]/g, '') // Strip out all alphabetic characters
      .replace(/=/g, '')        // Strip out existing equals signs
      .trim();

    // 4. Safely evaluate the expression inside Node.js
    let evaluation = "";
    if (/^[0-9+\-*/().\s]+$/.test(cleanedExpression) && cleanedExpression.length > 0) {
      try {
        const mathResult = new Function(`return ${cleanedExpression}`)();
        evaluation = mathResult.toString();
      } catch (mathErr) {
        evaluation = "?";
      }
    } else {
      evaluation = "?";
    }

    // 5. Send back formatted math representation for the React frontend
    const finalLaTeX = `${cleanedExpression} = ${evaluation}`;
    res.json({ result: finalLaTeX });

  } catch (error) {
    console.error("Gemini API Error:", error.message);
    
    // GRACEFUL FALLBACK: Keep the UI working even if Gemini fails
    res.json({ 
      result: "2 + 2 = 4 \\text{ (Gemini Offline - Fallback Mode)}" 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});