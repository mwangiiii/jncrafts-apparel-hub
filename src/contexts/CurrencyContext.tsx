import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export const SUPPORTED_CURRENCIES: Currency[] = [
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
];

interface ExchangeRates {
  [key: string]: number;
}

interface CurrencyContextType {
  selectedCurrency: Currency;
  exchangeRates: ExchangeRates;
  isLoading: boolean;
  setCurrency: (currency: Currency) => void;
  convertPrice: (price: number, fromCurrency?: string) => number;
  formatPrice: (price: number, fromCurrency?: string) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(SUPPORTED_CURRENCIES[0]); // Default to KES
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchExchangeRates = async () => {
    try {
      setIsLoading(true);
      // Using a free exchange rate API (exchangerate-api.com)
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/KES');
      const data = await response.json();
      
      // Convert from KES base to our needed currencies
      const rates: ExchangeRates = {
        KES: 1,
        USD: data.rates.USD || 0.0075, // Fallback rates in case API fails
        EUR: data.rates.EUR || 0.0067,
      };
      
      setExchangeRates(rates);
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error);
      // Fallback exchange rates (approximate)
      setExchangeRates({
        KES: 1,
        USD: 0.0075,
        EUR: 0.0067,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExchangeRates();
    // Refresh rates every hour
    const interval = setInterval(fetchExchangeRates, 3600000);
    return () => clearInterval(interval);
  }, []);

  const setCurrency = (currency: Currency) => {
    setSelectedCurrency(currency);
    localStorage.setItem('selectedCurrency', JSON.stringify(currency));
  };

  // Load saved currency preference on mount
  useEffect(() => {
    const saved = localStorage.getItem('selectedCurrency');
    if (saved) {
      try {
        const currency = JSON.parse(saved);
        setSelectedCurrency(currency);
      } catch (error) {
        console.error('Failed to parse saved currency:', error);
      }
    }
  }, []);

  const convertPrice = (price: number, fromCurrency: string = 'KES'): number => {
    if (!exchangeRates[selectedCurrency.code] || !exchangeRates[fromCurrency]) {
      return price;
    }

    // Convert from source currency to KES, then to target currency
    const priceInKES = price / exchangeRates[fromCurrency];
    return priceInKES * exchangeRates[selectedCurrency.code];
  };

  const formatPrice = (price: number, fromCurrency: string = 'KES'): string => {
    const convertedPrice = convertPrice(price, fromCurrency);
    
    // Format based on currency
    const formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: selectedCurrency.code === 'KES' ? 0 : 2,
      maximumFractionDigits: selectedCurrency.code === 'KES' ? 0 : 2,
    });

    return `${selectedCurrency.symbol}${formatter.format(convertedPrice)}`;
  };

  return (
    <CurrencyContext.Provider
      value={{
        selectedCurrency,
        exchangeRates,
        isLoading,
        setCurrency,
        convertPrice,
        formatPrice,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};