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
    const prompt = `You are an expert math and physics engine. Analyze the image and solve the problem step-by-step.
    - Basic arithmetic: calculate the result.
    - System of equations: solve for the variables.
    - Physics: identify forces and solve for the unknown.
    
    CRITICAL INSTRUCTION: Output ONLY KaTeX-compatible math LaTeX. 
    DO NOT output \\documentclass, \\usepackage, \\begin{document}, or \\end{document}. 
    DO NOT use markdown formatting like \`\`\`latex.
    DO NOT use dollar signs ($) for inline math. The entire response must be a single valid math block.
    If you need to include English words, you MUST wrap them in \\text{your words here}. 
    Separate EVERY step with a double backslash (\\\\).`;
    
    const response = await model.generateContent([prompt, imagePart]);
    
    // Gemini returns the pure, finished LaTeX!
    let finalLaTeX = response.response.text().trim();
    
    finalLaTeX = finalLaTeX
      .replace(/```latex/gi, '')         // Strip markdown start
      .replace(/```/g, '')               // Strip markdown end
      .replace(/\\documentclass\{.*?\}/g, '') 
      .replace(/\\usepackage\{.*?\}/g, '')    
      .replace(/\\begin\{document\}/g, '')    
      .replace(/\\end\{document\}/g, '')      
      .replace(/\$/g, '')                // CRITICAL: Strip all dollar signs
      .trim();

    console.log("Cleaned KaTeX Output:", finalLaTeX);

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