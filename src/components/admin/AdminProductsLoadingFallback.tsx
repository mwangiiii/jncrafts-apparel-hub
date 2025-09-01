import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const AdminProductsLoadingFallback: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header Loading */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-muted to-muted/80">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-6 w-80" />
          </div>
          <Skeleton className="h-12 w-32" />
        </div>
      </div>

      {/* Products Grid Loading */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="overflow-hidden">
            <div className="space-y-4">
              {/* Image skeleton */}
              <Skeleton className="w-full h-80" />
              
              {/* Content skeleton */}
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-8 w-24" />
                </div>
                
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                
                <div className="pt-2 border-t">
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardContent>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminProductsLoadingFallback;