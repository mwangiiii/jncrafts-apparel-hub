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
        "relative flex items-center justify-center min-h-[200px] w-full",
        "font-bold text-4xl md:text-5xl select-none text-foreground",
        "bg-gradient-to-br from-background via-muted/30 to-background",
        "border border-border/20 rounded-xl shadow-elegant backdrop-blur-sm",
        "p-8 md:p-12",
        className
      )}
      style={{ 
        scale: scale,
        fontFamily: '"Inter", "Poppins", sans-serif',
      }}
    >
      {/* Elegant Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-accent/20 animate-pulse" />
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              radial-gradient(circle at 25% 25%, hsl(var(--primary)) 0%, transparent 25%),
              radial-gradient(circle at 75% 75%, hsl(var(--accent)) 0%, transparent 25%)
            `,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      {/* Premium Brand Badge */}
      <div className="absolute top-4 right-4 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
        <span className="text-xs font-medium text-primary tracking-wider">PREMIUM</span>
      </div>

      {/* JNCRAFTS Letters with Enhanced Styling */}
      <div className="relative z-10 flex items-center justify-center space-x-1">
        {['J', 'N', 'C', 'R', '', 'A', 'F', 'T', 'S'].map((letter, index) => (
          <span
            key={index}
            className={cn(
              "inline-block opacity-0 animate-loader-letter transition-all duration-300",
              "bg-gradient-to-b from-foreground via-primary to-foreground bg-clip-text text-transparent",
              "drop-shadow-lg tracking-wide"
            )}
            style={{
              animationDelay: `${0.1 + index * 0.08}s`,
            }}
          >
            {letter}
          </span>
        ))}
      </div>

      {/* Sophisticated Animated Effect */}
      <div 
        className="absolute inset-0 z-[1] rounded-xl overflow-hidden"
        style={{
          mask: `repeating-linear-gradient(
            90deg,
            transparent 0,
            transparent 8px,
            black 9px,
            black 11px
          )`
        }}
      >
        <div 
          className="absolute inset-0 animate-loader-effect opacity-30"
          style={{
            background: `
              radial-gradient(circle at 50% 50%, hsl(var(--primary)) 0%, transparent 40%),
              radial-gradient(circle at 30% 70%, hsl(var(--accent)) 0%, transparent 35%),
              radial-gradient(circle at 70% 30%, hsl(var(--primary)) 0%, transparent 35%),
              radial-gradient(circle at 80% 80%, hsl(var(--accent)) 0%, transparent 30%)
            `,
            filter: 'blur(2px)'
          }}
        />
      </div>

      {/* Loading Progress Indicator */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
        <div className="flex space-x-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-primary/40 animate-pulse"
              style={{
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1.2s'
              }}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2 tracking-wider">
          Loading Excellence...
        </p>
      </div>

      {/* Subtle Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 rounded-xl animate-pulse" />
    </div>
  );
};

export default JNCraftsLoader;