import React from 'react';
import { cn } from '@/lib/utils';
import { JNCraftsLoader } from './jncrafts-loader';

interface SectionLoaderProps {
  isLoading: boolean;
  children: React.ReactNode;
  className?: string;
  loaderScale?: number;
  overlay?: boolean;
}

export const SectionLoader: React.FC<SectionLoaderProps> = ({
  isLoading,
  children,
  className,
  loaderScale = 0.8,
  overlay = true
}) => {
  return (
    <div className={cn("relative", className)}>
      {children}
      
      {isLoading && (
        <div 
          className={cn(
            "absolute inset-0 z-50 flex items-center justify-center",
            "animate-fade-in",
            overlay && "bg-background/80 backdrop-blur-sm"
          )}
        >
          <JNCraftsLoader scale={loaderScale} />
        </div>
      )}
    </div>
  );
};

export default SectionLoader;