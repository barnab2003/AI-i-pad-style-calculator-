const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { InferenceClient } = require('@huggingface/inference');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const hf = new InferenceClient(process.env.HF_TOKEN);

app.post('/api/solve', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No image data provided" });
    }

    console.log("Image received! Routing to Hugging Face Vision model...");

    // 1. Use the modern chatCompletion API with a flagship, always-on VLM
    const response = await hf.chatCompletion({
      model: "Qwen/Qwen2-VL-7B-Instruct",
      messages: [
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: "Read the handwritten math equation in this image. Reply ONLY with the exact numbers and symbols you see (e.g., '1 + 2 ='). Do not add any other words or attempt to solve it." 
            },
            { 
              type: "image_url", 
              image_url: { url: image } // Passes the raw data URL seamlessly
            } 
          ]
        }
      ],
      max_tokens: 20
    });

    // 2. Extract the AI's transcription
    const parsedText = response.choices[0].message.content;
    console.log("AI Saw:", parsedText);

    // 3. Clean up the text (remove any trailing equals signs or weird spacing)
    let cleanedExpression = parsedText.replace(/=/g, '').trim();

    // 4. Safely evaluate the math equation in Node.js
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

    // 5. Package it into LaTeX for your React frontend
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