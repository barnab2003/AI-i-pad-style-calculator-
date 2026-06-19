import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BlockMath } from 'react-katex';
import './HistorySidebar.css';

const HistorySidebar = ({ isOpen, onClose }) => {
  const { token, isAuthenticated } = useAuth();
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // NEW: State to track which history item is currently expanded
  const [expandedIndex, setExpandedIndex] = useState(null);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchHistory();
    }
  }, [isOpen, isAuthenticated]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://ai-i-pad-style-calculator.onrender.com/api/history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setHistory(data.history);
      }
    } catch (error) {
      console.error("Failed to fetch history", error);
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Helper function to extract just the first step of the solution
  const getFirstLine = (latexString) => {
    if (!latexString) return '';
    // Split by the double backslash that separates LaTeX lines and return the first part
    return latexString.split('\\\\')[0];
  };

  // NEW: Toggle function to open/close tabs
  const toggleExpand = (index) => {
    // If clicking the already open tab, close it. Otherwise, open the new one.
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}></div>
      
      <div className={`glass-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3>Your Saved Math</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="sidebar-content">
          {!isAuthenticated ? (
            <p className="empty-state">Please log in to see your history.</p>
          ) : isLoading ? (
            <p className="empty-state">Loading history...</p>
          ) : history.length === 0 ? (
            <p className="empty-state">No calculations saved yet. Start drawing!</p>
          ) : (
            <div className="history-list">
              {history.map((item, index) => {
                const isExpanded = expandedIndex === index;
                
                return (
                  <div key={index} className={`history-card ${isExpanded ? 'expanded' : ''}`}>
                    
                    {/* The Clickable Tab Header */}
                    <div className="history-card-header" onClick={() => toggleExpand(index)}>
                      <div className="history-preview">
                        <BlockMath math={getFirstLine(item.latexResult)} />
                      </div>
                      <div className="history-meta">
                        <span className="history-date">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                        <span className={`chevron ${isExpanded ? 'open' : ''}`}>▼</span>
                      </div>
                    </div>

                    {/* The Hidden Full Solution */}
                    {isExpanded && (
                      <div className="history-card-body">
                        <BlockMath math={item.latexResult} />
                      </div>
                    )}
                    
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default HistorySidebar;