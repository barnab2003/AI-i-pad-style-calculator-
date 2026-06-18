import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './AuthModal.css';

const AuthModal = ({ isOpen, onClose }) => {
  const { login } = useAuth();
  
  // Local state for the form
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    const endpoint = isLoginMode ? '/api/login' : '/api/register';
    const url = `https://ai-i-pad-style-calculator.onrender.com${endpoint}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        if (isLoginMode) {
          // Success! Pass the token to the global Context and close modal
          login(data.token);
          onClose();
        } else {
          // Registered successfully! Switch to login mode
          setMessage("Registration successful! Please log in.");
          setIsLoginMode(true);
          setPassword(''); // clear password for safety
        }
      } else {
        setError(data.error || "Something went wrong.");
      }
    } catch (err) {
      setError("Failed to connect to the server.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setError('');
    setMessage('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* e.stopPropagation prevents clicks inside the modal from closing it */}
      <div className="modal-glass-card" onClick={(e) => e.stopPropagation()}>
        
        <button className="close-btn" onClick={onClose}>&times;</button>
        
        <h2 className="modal-title">{isLoginMode ? 'Welcome Back' : 'Create Account'}</h2>
        <p className="modal-subtitle">
          {isLoginMode ? 'Log in to sync your calculations.' : 'Join to save your math history.'}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label>Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required 
              className="glass-input"
              placeholder="Enter your username"
            />
          </div>
          
          <div className="input-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              className="glass-input"
              placeholder="Enter your password"
            />
          </div>

          {error && <div className="error-message">{error}</div>}
          {message && <div className="success-message">{message}</div>}

          <button type="submit" className="btn-primary full-width" disabled={isLoading}>
            {isLoading ? 'Processing...' : (isLoginMode ? 'Log In' : 'Register')}
          </button>
        </form>

        <div className="modal-footer">
          <p>
            {isLoginMode ? "Don't have an account? " : "Already have an account? "}
            <button className="text-link" onClick={toggleMode}>
              {isLoginMode ? 'Register here' : 'Log in here'}
            </button>
          </p>
        </div>

      </div>
    </div>
  );
};

export default AuthModal;