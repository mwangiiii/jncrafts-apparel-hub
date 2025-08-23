import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Percent, Tag, Flame } from 'lucide-react';

interface Discount {
  id: string;
  code: string;
  name: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  end_date: string | null;
  banner_message: string | null;
  applies_to: string;
  requires_code: boolean;
}

interface Settings {
  special_offers_visible: boolean;
  special_offers_title: string;
  special_offers_subtitle: string;
}

const DiscountsSection = () => {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [settings, setSettings] = useState<Settings>({
    special_offers_visible: true,
    special_offers_title: '🔥 Special Offers',
    special_offers_subtitle: "Don't miss out on our limited-time deals and exclusive discounts"
  });
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<{[key: string]: string}>({});

  useEffect(() => {
    fetchSettings();
    fetchActiveDiscounts();
  }, []);

  useEffect(() => {
    if (discounts.length > 0) {
      const interval = setInterval(updateCountdowns, 1000);
      return () => clearInterval(interval);
    }
  }, [discounts]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['special_offers_visible', 'special_offers_title', 'special_offers_subtitle']);

      if (error) throw error;
      
      const settingsMap = data?.reduce((acc: any, setting: any) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {});

      if (settingsMap) {
        setSettings({
          special_offers_visible: settingsMap.special_offers_visible === 'true' || settingsMap.special_offers_visible === true,
          special_offers_title: settingsMap.special_offers_title || '🔥 Special Offers',
          special_offers_subtitle: settingsMap.special_offers_subtitle || "Don't miss out on our limited-time deals and exclusive discounts"
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchActiveDiscounts = async () => {
    try {
      const { data, error } = await supabase
        .from('discounts')
        .select('*')
        .eq('is_active', true)
        .or('end_date.is.null,end_date.gte.' + new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDiscounts((data || []) as Discount[]);
    } catch (error) {
      console.error('Error fetching discounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCountdowns = () => {
    const now = new Date().getTime();
    const newTimeRemaining: {[key: string]: string} = {};

    discounts.forEach((discount) => {
      if (discount.end_date) {
        const endTime = new Date(discount.end_date).getTime();
        const difference = endTime - now;

        if (difference > 0) {
          const days = Math.floor(difference / (1000 * 60 * 60 * 24));
          const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((difference % (1000 * 60)) / 1000);

          if (days > 0) {
            newTimeRemaining[discount.id] = `${days}d ${hours}h ${minutes}m`;
          } else if (hours > 0) {
            newTimeRemaining[discount.id] = `${hours}h ${minutes}m ${seconds}s`;
          } else {
            newTimeRemaining[discount.id] = `${minutes}m ${seconds}s`;
          }
        } else {
          newTimeRemaining[discount.id] = 'Expired';
        }
      }
    });

    setTimeRemaining(newTimeRemaining);
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

  if (!settings.special_offers_visible || loading || discounts.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-accent/5">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4 flex items-center justify-center gap-2">
            <Flame className="h-8 w-8 text-orange-500 animate-pulse" />
            {settings.special_offers_title}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {settings.special_offers_subtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {discounts.map((discount) => (
            <Card key={discount.id} className="border-2 border-accent/20 hover:border-accent/40 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-accent/5 via-background to-primary/5 relative overflow-hidden group">
              {discount.banner_message && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold py-1 px-3 text-center">
                  {discount.banner_message}
                </div>
              )}
              <CardContent className={`p-6 ${discount.banner_message ? 'pt-8' : ''}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-accent" />
                    {discount.requires_code ? (
                      <span className="font-mono text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        {discount.code}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Auto-applied
                      </span>
                    )}
                  </div>
                  <Badge variant="secondary" className="bg-gradient-to-r from-accent to-primary text-primary-foreground shadow-md">
                    <Percent className="h-3 w-3 mr-1" />
                    {discount.discount_type === 'percentage' 
                      ? `${discount.discount_value}% OFF`
                      : `$${discount.discount_value} OFF`
                    }
                  </Badge>
                </div>

                <h3 className="font-semibold text-brand mb-2 text-lg">
                  {discount.name}
                </h3>
                
                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                  {discount.description}
                </p>

                {discount.applies_to !== 'all' && (
                  <div className="mb-3">
                    <Badge variant="outline" className="text-xs">
                      {discount.applies_to === 'specific' ? 'Selected Products' : 'Category Specific'}
                    </Badge>
                  </div>
                )}

                {discount.end_date && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Expires:</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-primary">
                        {formatEndDate(discount.end_date)}
                      </div>
                      {timeRemaining[discount.id] && timeRemaining[discount.id] !== 'Expired' && (
                        <div className="text-xs text-orange-600 font-mono mt-1 animate-pulse">
                          {timeRemaining[discount.id]} left
                        </div>
                      )}
                    </div>
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