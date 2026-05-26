import React from 'react';
import MathCanvas from './components/MathCanvas';
// Import the CSS file so the header gets the new styles!
import './components/MathCanvas.css'; 

function App() {
  return (
    <div style={{ paddingTop: '40px', textAlign: 'center' }}>
      
      {/* The New Graphic Header */}
      <div className="header-container">
        <h1 className="app-title">CAL-C-PAD</h1>
        <p className="app-subtitle">Draw your equation below to calculate the result.</p>
      </div>
      
      <MathCanvas />
      
    </div>
  );
}

export default App;