import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Percent, Tag } from 'lucide-react';

interface Discount {
  id: string;
  code: string;
  name: string;
  description: string;
  discount_type: string;
  discount_value: number;
  end_date: string | null;
}

const DiscountsSection = () => {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveDiscounts();
  }, []);

  const fetchActiveDiscounts = async () => {
    try {
      const { data, error } = await supabase
        .from('discounts')
        .select('*')
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDiscounts(data || []);
    } catch (error) {
      console.error('Error fetching discounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatEndDate = (endDate: string) => {
    const date = new Date(endDate);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) {
      return 'Ends today!';
    } else if (diffDays <= 7) {
      return `${diffDays} days left`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading || discounts.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-accent/5">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-brand mb-4">
            🔥 Special Offers
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Don't miss out on our limited-time deals and exclusive discounts
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {discounts.map((discount) => (
            <Card key={discount.id} className="border-accent hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-accent/10 to-background">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-accent" />
                    <span className="font-mono text-lg font-bold text-brand">
                      {discount.code}
                    </span>
                  </div>
                  <Badge variant="secondary" className="bg-accent text-accent-foreground">
                    <Percent className="h-3 w-3 mr-1" />
                    {discount.discount_type === 'percentage' 
                      ? `${discount.discount_value}% OFF`
                      : `$${discount.discount_value} OFF`
                    }
                  </Badge>
                </div>

                <h3 className="font-semibold text-brand mb-2">
                  {discount.name}
                </h3>
                
                <p className="text-muted-foreground text-sm mb-4">
                  {discount.description}
                </p>

                {discount.end_date && (
                  <div className="flex items-center gap-2 text-sm text-accent">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">
                      {formatEndDate(discount.end_date)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DiscountsSection;