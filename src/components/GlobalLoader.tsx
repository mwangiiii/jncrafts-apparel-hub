import React from 'react';
import { useLoading } from '@/contexts/LoadingContext';

interface GlobalLoaderProps {
  message?: string;
}

export const GlobalLoader: React.FC<GlobalLoaderProps> = ({ message }) => {
  const { isLoading, loadingMessage } = useLoading();
  
  if (!isLoading) return null;

  return (
    <div className="global-loader-overlay">
      <div className="global-loader-content">
        <div className="loader-wrapper">
          <span className="loader-letter">J</span>
          <span className="loader-letter">N</span>
          <span className="loader-letter">C</span>
          <span className="loader-letter">R</span>
          <span className="loader-letter"></span>
          <span className="loader-letter">A</span>
          <span className="loader-letter">F</span>
          <span className="loader-letter">T</span>
          <span className="loader-letter">S</span>
          <div className="loader"></div>
        </div>
        {(message || loadingMessage) && (
          <p className="loader-message">
            {message || loadingMessage}
          </p>
        )}
      </div>
    </div>
  );
};

// Enhanced loader with custom content
export const LoaderOverlay: React.FC<{ 
  show: boolean; 
  message?: string;
  children?: React.ReactNode;
}> = ({ show, message, children }) => {
  if (!show) return null;

  return (
    <div className="global-loader-overlay">
      <div className="global-loader-content">
        <div className="loader-wrapper">
          <span className="loader-letter">J</span>
          <span className="loader-letter">N</span>
          <span className="loader-letter">C</span>
          <span className="loader-letter">R</span>
          <span className="loader-letter"></span>
          <span className="loader-letter">A</span>
          <span className="loader-letter">F</span>
          <span className="loader-letter">T</span>
          <span className="loader-letter">S</span>
          <div className="loader"></div>
        </div>
        {message && (
          <p className="loader-message">{message}</p>
        )}
        {children}
      </div>
    </div>
  );
};