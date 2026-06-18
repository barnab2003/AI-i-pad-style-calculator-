import React, { createContext, useState, useEffect, useContext } from 'react';

// 1. Create the Context (The empty shell)
const AuthContext = createContext();

// 2. Create the Provider (The global engine)
export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // When the app first loads, check if the user already has a saved ticket
  useEffect(() => {
    const savedToken = localStorage.getItem('calcpad_token');
    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
    }
  }, []);

  // The function to call after a successful login API request
  const login = (newToken) => {
    localStorage.setItem('calcpad_token', newToken); // Save to browser memory
    setToken(newToken);
    setIsAuthenticated(true);
  };

  // The function to call when the user clicks 'Log out'
  const logout = () => {
    localStorage.removeItem('calcpad_token'); // Destroy the ticket
    setToken(null);
    setIsAuthenticated(false);
  };

  // Provide these values and functions to the rest of the app
  return (
    <AuthContext.Provider value={{ token, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// 3. Create a custom hook so other components can easily access the engine
export const useAuth = () => {
  return useContext(AuthContext);
};