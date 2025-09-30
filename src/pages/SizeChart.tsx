import React from 'react';

const SizeChart = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Size Chart</h1>
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold mb-2">TrackSuit Jacket Size Chart</h2>
          <img
            src="/trackSuit-jacket-chart.jpg"
            alt="TrackSuit Jacket Size Chart"
            className="w-full max-w-md mx-auto"
          />
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">TrackSuit Pants Size Chart</h2>
          <img
            src="/trackSuit-pants-chart.jpg"
            alt="TrackSuit Pants Size Chart"
            className="w-full max-w-md mx-auto"
          />
        </div>
      </div>
    </div>
  );
};

export default SizeChart;