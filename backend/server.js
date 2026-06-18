const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ==========================================
// 1. DATABASE SETUP (MongoDB)
// ==========================================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB Atlas!'))
  .catch(err => console.error('MongoDB connection error:', err));

// Database Schemas
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});
const User = mongoose.model('User', UserSchema);

const HistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  latexResult: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const History = mongoose.model('History', HistorySchema);

// ==========================================
// 2. SECURITY & AUTHENTICATION
// ==========================================

// Rate Limiter: Max 20 requests per 15 minutes per IP to protect the AI
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 20, 
  message: { error: "Too many calculations requested. Please wait 15 minutes." }
});

// Middleware to verify JWT tokens
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <token>"

  if (!token) return res.status(401).json({ error: "Access denied. Please log in." });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token." });
    req.user = user;
    next();
  });
};

// ==========================================
// 3. ROUTES
// ==========================================

// --- Auth: Register ---
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    
    res.status(201).json({ message: "User registered successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Username might already be taken." });
  }
});

// --- Auth: Login ---
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: "User not found." });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: "Invalid password." });

    // Generate JWT Token valid for 24 hours
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, message: "Logged in successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Login failed." });
  }
});

// --- Fetch User History ---
app.get('/api/history', authenticateToken, async (req, res) => {
  try {
    const history = await History.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(10);
    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch history." });
  }
});

// --- The Core Engine (Protected & Rate Limited) ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/solve', apiLimiter, authenticateToken, async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: "No image data provided" });

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const imagePart = { inlineData: { data: base64Data, mimeType: "image/png" } };

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `You are an expert math and physics engine. Analyze the image and solve the problem step-by-step.
    CRITICAL INSTRUCTION: Output ONLY KaTeX-compatible math LaTeX. 
    DO NOT output \\documentclass, \\usepackage, \\begin{document}, or \\end{document}. 
    DO NOT use markdown formatting like \`\`\`latex.
    DO NOT use dollar signs ($) for inline math. The entire response must be a single valid math block.
    If you need to include English words, you MUST wrap them in \\text{your words here}. 
    Separate EVERY step with a double backslash (\\\\).`;
    
    const response = await model.generateContent([prompt, imagePart]);
    
    let finalLaTeX = response.response.text().trim();
    finalLaTeX = finalLaTeX
      .replace(/```latex/gi, '').replace(/```/g, '')
      .replace(/\\documentclass\{.*?\}/g, '').replace(/\\usepackage\{.*?\}/g, '')
      .replace(/\\begin\{document\}/g, '').replace(/\\end\{document\}/g, '')
      .replace(/\$/g, '').trim();

    // Save successful calculation to MongoDB
    const newHistoryEntry = new History({
      userId: req.user._id,
      latexResult: finalLaTeX
    });
    await newHistoryEntry.save();

    res.json({ result: finalLaTeX });

  } catch (error) {
    console.error("API Error:", error.message);
    res.status(500).json({ error: "AI Processing Failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));