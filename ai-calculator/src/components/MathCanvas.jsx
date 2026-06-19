import React, { useRef, useState, useEffect } from 'react';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';
import './MathCanvas.css';
import customLogo from '../assets/my-logo.png';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';
import HistorySidebar from './HistorySidebar'; 

const MathCanvas = () => {
  const { token, isAuthenticated, logout } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Tools & Interaction State
  const [tool, setTool] = useState('pen'); 
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [snapshot, setSnapshot] = useState(null);

  // NEW: UI States for Dropdown and Text Box
  const [isShapeMenuOpen, setIsShapeMenuOpen] = useState(false);
  const [textInput, setTextInput] = useState({ visible: false, x: 0, y: 0, text: '' });

  // NEW: Curve State Machine
  // step 0: inactive, step 1: drawing line, step 2: bending line
  const [curveStep, setCurveStep] = useState(0); 
  const [curveEnd, setCurveEnd] = useState({ x: 0, y: 0 });

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
    if (textInput.visible) return; // Don't draw if currently typing

    const { x, y } = getPos(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Handle the Text Tool
    if (tool === 'text') {
      setTextInput({ visible: true, x, y, text: '' });
      return;
    }

    // Handle Curve Step 2 (Bending)
    if (tool === 'curve' && curveStep === 1) {
      setIsDrawing(true);
      return; 
    }

    // Standard starting logic for all other tools (and Curve Step 1)
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
      ctx.putImageData(snapshot, 0, 0); // Reset preview
    }

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
    } else if (tool === 'arrow') {
      // Draw Line
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(x, y);
      ctx.stroke();
      // Calculate and Draw Arrowhead
      const headlen = 15;
      const angle = Math.atan2(y - startY, x - startX);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - headlen * Math.cos(angle - Math.PI / 6), y - headlen * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(x, y);
      ctx.lineTo(x - headlen * Math.cos(angle + Math.PI / 6), y - headlen * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
    } else if (tool === 'curve') {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      if (curveStep === 0) {
        // Step 1: Draw the initial straight line
        ctx.lineTo(x, y);
      } else if (curveStep === 1) {
        // Step 2: Bend the line (Quadratic Bezier)
        ctx.quadraticCurveTo(x, y, curveEnd.x, curveEnd.y);
      }
      ctx.stroke();
    }
  };

  const stopInteraction = (e) => {
    e.preventDefault();
    if (!isDrawing) return;

    const { x, y } = getPos(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Special logic for the Curve Tool's 2-step process
    if (tool === 'curve') {
      if (curveStep === 0) {
        setCurveEnd({ x, y });
        setCurveStep(1); // Ready to bend
        setIsDrawing(false);
        return; // Don't save history yet!
      } else if (curveStep === 1) {
        setCurveStep(0); // Finished bending, reset
      }
    }
    
    // Save to history for all completed strokes
    const currentCanvasState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(currentCanvasState);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
    
    setIsDrawing(false);
  };

  // NEW: Function to finalize text from the floating input
  const finalizeText = () => {
    if (!textInput.text.trim()) {
      setTextInput({ visible: false, x: 0, y: 0, text: '' });
      return;
    }
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.font = '20px Inter';
    ctx.fillStyle = '#3EE08F';
    ctx.fillText(textInput.text, textInput.x, textInput.y + 20); // +20 offsets baseline
    
    // Save to history
    const currentCanvasState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(currentCanvasState);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);

    setTextInput({ visible: false, x: 0, y: 0, text: '' });
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
          {isAuthenticated && (
            <button className="text-link" onClick={() => setIsSidebarOpen(true)}>
              My History
            </button>
          )}
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
          {/* <h2>Make your complex problems<br/>make complete sense</h2> */}
          <p>Draw equations, geometry, or physics diagrams and get your solutions instantly.</p>
        </div>

        <div className="app-container glass-card">
          
          {/* TOOLBAR */}
          <div className="toolbar">
            <div className="tool-group">
              <button className={`tool-btn ${tool === 'pen' ? 'active' : ''}`} onClick={() => setTool('pen')}>✎</button>
              <button className={`tool-btn ${tool === 'line' ? 'active' : ''}`} onClick={() => setTool('line')}>—</button>
              <button className={`tool-btn ${tool === 'curve' ? 'active' : ''}`} onClick={() => { setTool('curve'); setCurveStep(0); }}>〰</button>
              
              {/* SHAPE DROPDOWN */}
              <div className="dropdown-container">
                <button 
                  className={`tool-btn ${['rect', 'circle', 'arrow'].includes(tool) ? 'active' : ''}`} 
                  onClick={() => setIsShapeMenuOpen(!isShapeMenuOpen)}
                >
                  {tool === 'rect' ? '▭' : tool === 'circle' ? '◯' : tool === 'arrow' ? '↗' : '△ Shapes ▼'}
                </button>
                
                {isShapeMenuOpen && (
                  <div className="dropdown-menu">
                    <button onClick={() => { setTool('rect'); setIsShapeMenuOpen(false); }}>▭ Rectangle</button>
                    <button onClick={() => { setTool('circle'); setIsShapeMenuOpen(false); }}>◯ Circle</button>
                    <button onClick={() => { setTool('arrow'); setIsShapeMenuOpen(false); }}>↗ Arrow</button>
                  </div>
                )}
              </div>

              <button className={`tool-btn ${tool === 'text' ? 'active' : ''}`} onClick={() => setTool('text')}>Text</button>
              <button className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`} onClick={() => setTool('eraser')}>▱ Eraser</button>
            </div>
            
            <div className="action-group">
              <button onClick={undo} disabled={historyStep <= 0} className="btn-text" style={{ opacity: historyStep <= 0 ? 0.5 : 1 }}>↩</button>
              <button onClick={clearCanvas} className="btn-text">Clear</button>
              <button onClick={calculateMath} disabled={isLoading} className="btn-primary">
                {isLoading ? 'Solving...' : 'Solve'}
              </button>
            </div>
          </div>

          {/* CANVAS */}
          <div className="canvas-wrapper" style={{ position: 'relative' }}>
            {/* FLOATING TEXT INPUT */}
            {textInput.visible && (
              <input
                type="text"
                autoFocus
                className="floating-text-input"
                style={{ left: textInput.x, top: textInput.y }}
                value={textInput.text}
                onChange={(e) => setTextInput({ ...textInput, text: e.target.value })}
                onBlur={finalizeText}
                onKeyDown={(e) => { if (e.key === 'Enter') finalizeText(); }}
                placeholder="Type & Enter"
              />
            )}

            <canvas
              ref={canvasRef}
              // ... keep your existing onMouseDown/Touch events here ...
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
      <HistorySidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
    </div>
  );
};

export default MathCanvas;