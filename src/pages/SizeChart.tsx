import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Ruler } from 'lucide-react';

const SizeChart = () => {
  const charts = [
    {
      id: 1,
      title: 'TrackSuit Jacket',
      subtitle: 'Find your perfect jacket fit',
      image: '/trackSuit-jacket-chart.jpg',
      alt: 'TrackSuit Jacket Size Chart'
    },
    {
      id: 2,
      title: 'TrackSuit Pants',
      subtitle: 'Find your perfect pants fit',
      image: '/trackSuit-pants-chart.jpg',
      alt: 'TrackSuit Pants Size Chart'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-12 md:py-16">
        {/* Header Section */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            {/* <Ruler className="w-8 h-8 text-primary" /> */}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-3">
            Size Chart
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Use our detailed size charts to find the perfect fit for your TrackSuit
          </p>
        </div>

        <Separator className="mb-12" />

        {/* Size Charts Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {charts.map((chart, index) => (
            <Card 
              key={chart.id}
              className="group shadow-card hover:shadow-card-hover transition-all duration-300 border-border/50 backdrop-blur-sm bg-card/80 overflow-hidden animate-scale-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                  {chart.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {chart.subtitle}
                </p>
              </CardHeader>
              <CardContent className="pb-6">
                <div className="relative overflow-hidden rounded-lg border border-border/50 bg-muted/30 p-4 group-hover:border-primary/30 transition-all duration-300">
                  <img
                    src={chart.image}
                    alt={chart.alt}
                    className="w-full h-auto object-contain transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-12 max-w-3xl mx-auto">
          <Card className="border-primary/20 bg-primary/5 shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-2">Measurement Tips</h3>
                  <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                    <li>Measure yourself wearing light clothing</li>
                    <li>Use a soft measuring tape for accuracy</li>
                    <li>If between sizes, we recommend sizing up</li>
                    <li>All measurements are in Inches</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SizeChart;
