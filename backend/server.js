const express = require('express');
const cors = require('cors');
require('dotenv').config();

// 1. ADD THIS: Import the Gemini library
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = 3000;

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json({ limit: '50mb' })); 

// --- ROUTES ---
app.post('/api/solve', async (req, res) => {
    try {
        const { image } = req.body;

        if (!image) {
            return res.status(400).json({ error: "No image provided." });
        }

        console.log("Image received by server! Preparing to process...");
        
        // ==========================================
        // CALLING THE GEMINI API
        // ==========================================
        
        // 2. ADD THIS: Initialize Gemini using the secret key from your .env file
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // 3. ADD THIS: Clean the base64 string so Gemini can read it
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

        // 4. ADD THIS: Package the image data
        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType: "image/png"
            }
        };

        // 5. ADD THIS: Tell Gemini exactly what to do
        const prompt = "You are a highly accurate mathematical OCR tool. Look at this handwritten image and transcribe it into LaTeX. Return ONLY the raw LaTeX string. Do not include any markdown formatting, do not include the $ symbols, and do not provide any explanations.";

        // 6. ADD THIS: Send the request and wait for the AI to answer
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        
        // Clean up any extra formatting the AI might try to add
        let cleanLatex = response.text().replace(/```latex|```/g, '').trim();

        console.log("Gemini translation:", cleanLatex);

        // Send the real, AI-generated result back to the frontend
        res.json({ 
            success: true, 
            message: "Image processed successfully",
            latex: cleanLatex 
        });

    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`Server is running and listening on http://localhost:${PORT}`);
});