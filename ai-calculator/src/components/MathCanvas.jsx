import React, { useRef, useState, useEffect } from 'react';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';
import './MathCanvas.css';
import customLogo from '../assets/my-logo.png';
// Add this to your other imports at the top
import { useAuth } from '../context/AuthContext';
// Near your other imports at the top
import AuthModal from './AuthModal';

const MathCanvas = () => {
  const { token, isAuthenticated, logout } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Tools & Interaction State
  const [tool, setTool] = useState('pen'); // 'pen', 'line', 'rect', 'circle', 'eraser'
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [snapshot, setSnapshot] = useState(null);

  // Undo History State
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);

  // Initialize Canvas and set the base history state
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 500; 
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1A1B26'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#3EE08F'; 
    ctx.lineWidth = 3;

    // Save the initial blank canvas to history
    const initialState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory([initialState]);
    setHistoryStep(0);

    const handleResize = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempCanvas.getContext('2d').drawImage(canvas, 0, 0);
        
        canvas.width = canvas.parentElement.clientWidth;
        ctx.fillStyle = '#1A1B26';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.lineCap = 'round';
        
        // Ensure we keep the most recent history step accurate after resize
        const resizedState = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setHistory(prev => [...prev.slice(0, historyStep), resizedState]);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startInteraction = (e) => {
    e.preventDefault();
    const { x, y } = getPos(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    setIsDrawing(true);
    setStartX(x);
    setStartY(y);
    setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const drawInteraction = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (tool !== 'pen' && tool !== 'eraser' && snapshot) {
      ctx.putImageData(snapshot, 0, 0);
    }

    // Set styling based on whether it's a pen or an eraser
    ctx.strokeStyle = tool === 'eraser' ? '#1A1B26' : '#3EE08F';
    ctx.lineWidth = tool === 'eraser' ? 25 : 3;

    if (tool === 'pen' || tool === 'eraser') {
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === 'line') {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === 'rect') {
      ctx.beginPath();
      ctx.rect(startX, startY, x - startX, y - startY);
      ctx.stroke();
    } else if (tool === 'circle') {
      ctx.beginPath();
      const radius = Math.sqrt(Math.pow(startX - x, 2) + Math.pow(startY - y, 2));
      ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
      ctx.stroke();
    }
  };

  const stopInteraction = (e) => {
    e.preventDefault();
    if (isDrawing) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Take a new snapshot and push it to the history array
      const currentCanvasState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const newHistory = history.slice(0, historyStep + 1); // Discard any "redo" futures if we draw something new
      newHistory.push(currentCanvasState);
      
      setHistory(newHistory);
      setHistoryStep(newHistory.length - 1);
    }
    setIsDrawing(false);
  };

  // --- UNDO FUNCTION ---
  const undo = () => {
    if (historyStep > 0) {
      const prevStep = historyStep - 1;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.putImageData(history[prevStep], 0, 0);
      setHistoryStep(prevStep);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1A1B26';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Save the cleared state to history
    const clearedState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(clearedState);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
    
    setResult('');
  };

  const calculateMath = async () => {

    if (!isAuthenticated) {
      setResult("\\text{Please log in to use the AI engine.}");
      return;
    }

    const canvas = canvasRef.current;
    const base64Image = canvas.toDataURL('image/png');
    setIsLoading(true);
    setResult('');

    try {
      const response = await fetch('https://ai-i-pad-style-calculator.onrender.com/api/solve', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          // Securely pass the JWT to your Render backend
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ image: base64Image })
      });
      const data = await response.json();
      if (response.ok) {
        setResult(data.result);
      } else {
        setResult("\\text{Error: " + (data.error || "Unknown server error") + "}");
      }
    } catch (error) {
      setResult("\\text{Error: Could not connect to the server.}");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dark-theme-wrapper">
      <header className="glass-header">
        <div className="logo-container">
          
          <img src={customLogo} alt="CAL-C-PAD Logo" className="custom-logo-img" />
          <h1 className="logo-text">CAL-C-PAD</h1>
        </div>
        <nav className="glass-nav">
          <a href="#home">Home</a>
          <a href="#about">About</a>
          <a href="#how">How it Works</a>
        </nav>
        {/* Dynamically swap the button based on auth state */}
        {isAuthenticated ? (
          <button className="btn-outline" onClick={logout}>Log out</button>
        ) : (
          <button className="btn-outline" onClick={() => setIsAuthModalOpen(true)}>Log in</button>
        )}
      </header>

      <main className="main-content">
        <div className="hero-text">
          <h2>Make your complex problems<br/>make complete sense</h2>
          <p>Draw equations, geometry, or physics diagrams and get your solutions instantly.</p>
        </div>

        <div className="app-container glass-card">
          
          {/* TOOLBAR */}
          <div className="toolbar">
            <div className="tool-group">
              <button className={`tool-btn ${tool === 'pen' ? 'active' : ''}`} onClick={() => setTool('pen')}>✎ Pen</button>
              <button className={`tool-btn ${tool === 'line' ? 'active' : ''}`} onClick={() => setTool('line')}>— Line</button>
              <button className={`tool-btn ${tool === 'rect' ? 'active' : ''}`} onClick={() => setTool('rect')}>▭ Rect</button>
              <button className={`tool-btn ${tool === 'circle' ? 'active' : ''}`} onClick={() => setTool('circle')}>◯ Circle</button>
              <button className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`} onClick={() => setTool('eraser')}>▱ Eraser</button>
            </div>
            <div className="action-group">
              <button onClick={undo} disabled={historyStep <= 0} className="btn-text" style={{ opacity: historyStep <= 0 ? 0.5 : 1 }}>
                ↩ Undo
              </button>
              <button onClick={clearCanvas} className="btn-text">Clear</button>
              <button onClick={calculateMath} disabled={isLoading} className="btn-primary">
                {isLoading ? 'Solving...' : 'Calculate Now'}
              </button>
            </div>
          </div>

          {/* CANVAS */}
          <div className="canvas-wrapper">
            <canvas
              ref={canvasRef}
              onMouseDown={startInteraction}
              onMouseMove={drawInteraction}
              onMouseUp={stopInteraction}
              onMouseLeave={stopInteraction}
              onTouchStart={startInteraction}
              onTouchMove={drawInteraction}
              onTouchEnd={stopInteraction}
              onTouchCancel={stopInteraction}
            />
          </div>

          {/* RESULT */}
          {result && (
            <div className="result-glass">
              <BlockMath math={result} />
            </div>
          )}
        </div>
      </main>
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </div>
  );
};

export default MathCanvas;