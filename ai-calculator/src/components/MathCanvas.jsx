import React, { useRef, useState, useEffect } from 'react';
import 'katex/dist/katex.min.css'; // The styling that makes the math look good
import { BlockMath } from 'react-katex'; // The component that renders the math
import './MathCanvas.css'; //
const MathCanvas = () => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // NEW: State variables to handle the server response and loading status
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = 800; 
    canvas.height = 500;
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 4;
  }, []);

  // --- MOUSE & TOUCH EVENTS (Unchanged) ---
  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.closePath();
    setIsDrawing(false);
  };

  const getTouchPos = (canvas, touchEvent) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: touchEvent.touches[0].clientX - rect.left,
      y: touchEvent.touches[0].clientY - rect.top
    };
  };

  const startTouchDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const { x, y } = getTouchPos(canvas, e.nativeEvent);
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const drawTouch = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const { x, y } = getTouchPos(canvas, e.nativeEvent);
    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopTouchDrawing = (e) => {
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    ctx.closePath();
    setIsDrawing(false);
  };

  // --- CLEAR FUNCTION ---
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; // Fill with white instead of making it transparent
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setResult(''); // Clear the result text when the canvas is cleared
  };

  // --- CAPTURE AND SEND (The Bridge) ---
  const calculateMath = async () => {
    const canvas = canvasRef.current;
    const base64Image = canvas.toDataURL('image/png');
    
    setIsLoading(true);
    setResult('');

    try {
      // Send the POST request to your Node.js server
      const response = await fetch('https://ai-i-pad-style-calculator.onrender.com/solve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: base64Image })
      });

      const data = await response.json();

      if (response.ok) {
        // Update the state with the mock LaTeX sent from the server
        setResult(data.latex);
      } else {
        setResult("Error: " + data.error);
      }
    } catch (error) {
      console.error("Failed to connect to server:", error);
      setResult("Error: Could not connect to the server. Is it running?");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      
      {/* The Controls Area */}
      <div className="controls-bar">
        <button 
          onClick={clearCanvas}
          className="neo-btn btn-clear"
        >
          Clear Canvas
        </button>

        <button 
          onClick={calculateMath}
          disabled={isLoading}
          className="neo-btn btn-solve"
        >
          {isLoading ? 'Solving...' : 'Solve Equation'}
        </button>
      </div>

      {/* The Canvas */}
      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startTouchDrawing}
          onTouchMove={drawTouch}
          onTouchEnd={stopTouchDrawing}
          onTouchCancel={stopTouchDrawing}
          style={{ cursor: 'crosshair', touchAction: 'none' }} 
        />
      </div>

      {/* The LaTeX Result */}
      {result && (
        <div className="result-container">
          <BlockMath math={result.replace(/\$/g, '')} />
        </div>
      )}

    </div>
  );
};

export default MathCanvas;