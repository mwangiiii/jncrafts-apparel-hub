import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Globe, ChevronDown } from 'lucide-react';
import { useCurrency, SUPPORTED_CURRENCIES } from '@/contexts/CurrencyContext';

export const CurrencySelector = () => {
  const { selectedCurrency, setCurrency, isLoading } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          disabled={isLoading}
        >
          <Globe className="w-4 h-4" />
          <span className="font-medium">{selectedCurrency.code}</span>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {SUPPORTED_CURRENCIES.map((currency) => (
          <DropdownMenuItem
            key={currency.code}
            onClick={() => {
              setCurrency(currency);
              setIsOpen(false);
            }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{currency.symbol}</span>
              <span>{currency.code}</span>
            </div>
            <span className="text-sm text-muted-foreground">{currency.name}</span>
            {selectedCurrency.code === currency.code && (
              <Badge variant="secondary" className="ml-2">Active</Badge>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};