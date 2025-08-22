import React, { useState, useEffect, useRef } from 'react';
import { MapPin, AlertTriangle, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface AddressSuggestion {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

interface AddressData {
  address: string;
  city: string;
  postalCode: string;
  lat?: number;
  lon?: number;
  isCurrentLocation?: boolean;
}

interface AddressAutocompleteProps {
  value: AddressData;
  onChange: (address: AddressData) => void;
  onLocationChange?: (coords: { lat: number; lon: number }) => void;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  onLocationChange
}) => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState(value.address);
  const [currentLocationCoords, setCurrentLocationCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locationMismatch, setLocationMismatch] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const suggestionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearchInput(value.address);
  }, [value.address]);

  const searchAddresses = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=ke&q=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      setSuggestions(data);
    } catch (error) {
      console.error('Error searching addresses:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setSearchInput(inputValue);
    
    // Clear timeout and set new one
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      if (inputValue.length >= 3) {
        searchAddresses(inputValue);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    // Update the address in real-time but clear city/postal if manually typing
    onChange({
      ...value,
      address: inputValue,
      isCurrentLocation: false,
      lat: undefined,
      lon: undefined
    });
  };

  const handleSuggestionClick = (suggestion: AddressSuggestion) => {
    const newAddress = {
      address: suggestion.display_name,
      city: suggestion.address.city || suggestion.address.town || suggestion.address.village || '',
      postalCode: suggestion.address.postcode || '',
      lat: parseFloat(suggestion.lat),
      lon: parseFloat(suggestion.lon),
      isCurrentLocation: false
    };

    setSearchInput(suggestion.display_name);
    onChange(newAddress);
    setSuggestions([]);
    setShowSuggestions(false);

    // Check for location mismatch
    if (currentLocationCoords) {
      const distance = calculateDistance(
        currentLocationCoords.lat,
        currentLocationCoords.lon,
        newAddress.lat!,
        newAddress.lon!
      );
      setLocationMismatch(distance > 10); // More than 10km difference
    }

    if (onLocationChange) {
      onLocationChange({ lat: newAddress.lat!, lon: newAddress.lon! });
    }
  };

  const getCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocationCoords({ lat: latitude, lon: longitude });
          
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
            );
            const data = await response.json();
            
            const newAddress = {
              address: data.display_name,
              city: data.address?.city || data.address?.town || data.address?.village || '',
              postalCode: data.address?.postcode || '',
              lat: latitude,
              lon: longitude,
              isCurrentLocation: true
            };

            setSearchInput(data.display_name);
            onChange(newAddress);
            setLocationMismatch(false);

            if (onLocationChange) {
              onLocationChange({ lat: latitude, lon: longitude });
            }
          } catch (error) {
            console.error('Error getting address:', error);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const dismissLocationMismatch = () => {
    setLocationMismatch(false);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="space-y-4">
      {locationMismatch && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-amber-800">
              The delivery address differs from your current location. Are you ordering for someone else or using a different address?
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissLocationMismatch}
              className="ml-2 h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-2 mb-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={getCurrentLocation}
          className="flex items-center gap-2"
        >
          <MapPin className="h-4 w-4" />
          Use Current Location
        </Button>
        {value.isCurrentLocation && (
          <span className="text-sm text-green-600">📍 Location detected</span>
        )}
      </div>

      <div className="relative" ref={suggestionRef}>
        <div>
          <Label htmlFor="address">Street Address</Label>
          <Input
            id="address"
            value={searchInput}
            onChange={handleInputChange}
            placeholder="Start typing an address (e.g., Sagana, Nyeri...)"
            className="w-full"
          />
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="px-4 py-2 hover:bg-muted cursor-pointer border-b border-border last:border-b-0"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <div className="font-medium text-sm">
                  {suggestion.address.road || suggestion.address.suburb || 'Unnamed location'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {[
                    suggestion.address.city || suggestion.address.town || suggestion.address.village,
                    suggestion.address.county,
                    suggestion.address.state
                  ].filter(Boolean).join(', ')}
                </div>
              </div>
            ))}
          </div>
        )}

        {loading && showSuggestions && (
          <div className="absolute top-full left-0 right-0 z-50 bg-background border border-border rounded-md shadow-lg p-4">
            <div className="text-sm text-muted-foreground">Searching addresses...</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={value.city}
            onChange={(e) =>
              onChange({ ...value, city: e.target.value, isCurrentLocation: false })
            }
            placeholder="City"
            readOnly={!!value.lat}
            className={cn(
              value.lat && "bg-muted cursor-not-allowed"
            )}
          />
        </div>
        <div>
          <Label htmlFor="postalCode">Postal Code</Label>
          <Input
            id="postalCode"
            value={value.postalCode}
            onChange={(e) =>
              onChange({ ...value, postalCode: e.target.value, isCurrentLocation: false })
            }
            placeholder="Postal Code"
            readOnly={!!value.lat}
            className={cn(
              value.lat && "bg-muted cursor-not-allowed"
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default AddressAutocomplete;