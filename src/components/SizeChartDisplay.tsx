import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Ruler } from 'lucide-react';

interface SizeChartDisplayProps {
  showJacketChart?: boolean;
  showPantsChart?: boolean;
  className?: string;
}

export const SizeChartDisplay: React.FC<SizeChartDisplayProps> = ({
  showJacketChart = false,
  showPantsChart = false,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeChart, setActiveChart] = useState<'jacket' | 'pants'>('jacket');

  // Don't render if no charts are enabled
  if (!showJacketChart && !showPantsChart) return null;

  const handleChartSelect = (chartType: 'jacket' | 'pants') => {
    setActiveChart(chartType);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Size Guide</h3>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <Ruler className="h-4 w-4" />
              View Size Chart
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Ruler className="h-5 w-5" />
                Size Chart
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Chart selector if both charts are available */}
              {showJacketChart && showPantsChart && (
                <div className="flex gap-2">
                  <Button
                    variant={activeChart === 'jacket' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleChartSelect('jacket')}
                  >
                    Jacket Size Chart
                  </Button>
                  <Button
                    variant={activeChart === 'pants' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleChartSelect('pants')}
                  >
                    Pants Size Chart
                  </Button>
                </div>
              )}
              
              {/* Display active chart */}
              <div className="space-y-4">
                {((activeChart === 'jacket' && showJacketChart) || (!showPantsChart && showJacketChart)) && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-sm">Jacket Sizing</Badge>
                    </div>
                    <div className="rounded-lg overflow-hidden border shadow-lg">
                      <img
                        src="/jacket_chart.jpg"
                        alt="Jacket Size Chart"
                        className="w-full h-auto object-contain bg-background"
                        loading="lazy"
                      />
                    </div>
                  </div>
                )}
                
                {((activeChart === 'pants' && showPantsChart) || (!showJacketChart && showPantsChart)) && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-sm">Pants Sizing</Badge>
                    </div>
                    <div className="rounded-lg overflow-hidden border shadow-lg">
                      <img
                        src="/pants_chart.jpg"
                        alt="Pants Size Chart"
                        className="w-full h-auto object-contain bg-background"
                        loading="lazy"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Helpful sizing tips */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium text-sm mb-2">Sizing Tips:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Measure yourself against the chart for the best fit</li>
                  <li>• When in doubt, choose the larger size</li>
                  <li>• Contact us if you need help choosing the right size</li>
                </ul>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Compact preview */}
      <div className="text-sm text-muted-foreground">
        <p className="flex items-center gap-1">
          <Ruler className="h-3 w-3" />
          Size charts available: 
          {showJacketChart && <Badge variant="outline" className="text-xs ml-1">Jacket</Badge>}
          {showPantsChart && <Badge variant="outline" className="text-xs ml-1">Pants</Badge>}
        </p>
      </div>
    </div>
  );
};

export default SizeChartDisplay;