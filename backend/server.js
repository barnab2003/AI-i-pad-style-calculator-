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

    console.log("Image received! Sending to Gemini Advanced Engine...");

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: "image/png"
      }
    };

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    // The new God-Mode Prompt
    const prompt = `You are an expert math and physics engine. Analyze the provided image and solve the problem. 
    - If it is basic arithmetic, calculate the result.
    - If it is a system of equations, solve for the variables (e.g., x=..., y=...).
    - If it is a physics free-body diagram, identify the forces and solve for the obvious unknown.
    CRITICAL INSTRUCTION: Output ONLY raw LaTeX code representing the final solution. Do NOT use markdown blocks. Do not add any conversational text. Use '\\\\' for line breaks.`;
    
    const response = await model.generateContent([prompt, imagePart]);
    
    // Gemini returns the pure, finished LaTeX!
    let finalLaTeX = response.response.text().trim();
    
    // Safety check: Remove markdown formatting if Gemini disobeys and includes it
    finalLaTeX = finalLaTeX.replace(/^```latex/, '').replace(/^```/, '').replace(/```$/, '').trim();

    console.log("Gemini Output:", finalLaTeX);

    // Send it directly to the React frontend
    res.json({ result: finalLaTeX });

  } catch (error) {
    console.error("Gemini API Error:", error.message);
    res.json({ 
      result: "\\text{Error: Could not evaluate problem. Please draw clearly.}" 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});