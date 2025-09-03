import React from 'react';
import { cn } from '@/lib/utils';

interface JNCraftsLoaderProps {
  className?: string;
  scale?: number;
}

export const JNCraftsLoader: React.FC<JNCraftsLoaderProps> = ({ 
  className, 
  scale = 1 
}) => {
  return (
    <div 
      className={cn(
        "relative flex items-center justify-center h-[120px] w-auto",
        "font-semibold text-2xl select-none text-white",
        className
      )}
      style={{ 
        scale: scale,
        fontFamily: '"Inter", "Poppins", sans-serif',
      }}
    >
      {/* JNCRAFTS Letters */}
      {['J', 'N', 'C', 'R', '', 'A', 'F', 'T', 'S'].map((letter, index) => (
        <span
          key={index}
          className="inline-block opacity-0 animate-loader-letter z-[2]"
          style={{
            animationDelay: `${0.1 + index * 0.105}s`,
          }}
        >
          {letter}
        </span>
      ))}

      {/* Animated Loader Effect */}
      <div 
        className="absolute top-0 left-0 h-full w-full z-[1] bg-transparent"
        style={{
          mask: `repeating-linear-gradient(
            90deg,
            transparent 0,
            transparent 6px,
            black 7px,
            black 8px
          )`
        }}
      >
        <div 
          className="absolute top-0 left-0 w-full h-full animate-loader-effect"
          style={{
            backgroundImage: `
              radial-gradient(circle at 50% 50%, #ffff00 0%, transparent 50%),
              radial-gradient(circle at 45% 45%, #ff0000 0%, transparent 45%),
              radial-gradient(circle at 55% 55%, #00ffff 0%, transparent 45%),
              radial-gradient(circle at 45% 55%, #00ff00 0%, transparent 45%),
              radial-gradient(circle at 55% 45%, #0000ff 0%, transparent 45%)
            `,
            mask: `radial-gradient(
              circle at 50% 50%,
              transparent 0%,
              transparent 10%,
              black 25%
            )`
          }}
        />
      </div>
    </div>
  );
};

export default JNCraftsLoader;