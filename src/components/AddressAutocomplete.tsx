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
    amenity?: string;
    shop?: string;
    office?: string;
    building?: string;
  };
  type?: string;
  importance?: number;
}

interface AddressData {
  address: string;
  city: string;
  postalCode: string;
  lat?: number;
  lon?: number;
  isCurrentLocation?: boolean;
  formattedAddress?: string;
  landmark?: string;
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
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8&countrycodes=ke&extratags=1&namedetails=1&q=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      
      // Sort by importance and type (amenities/landmarks first)
      const sortedData = data.sort((a: AddressSuggestion, b: AddressSuggestion) => {
        const aIsLandmark = !!(a.address.amenity || a.address.shop || a.address.office || a.address.building);
        const bIsLandmark = !!(b.address.amenity || b.address.shop || b.address.office || b.address.building);
        
        if (aIsLandmark && !bIsLandmark) return -1;
        if (!aIsLandmark && bIsLandmark) return 1;
        
        return (b.importance || 0) - (a.importance || 0);
      });
      
      setSuggestions(sortedData);
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
    // Create a formatted address for display
    const landmark = suggestion.address.amenity || suggestion.address.shop || 
                    suggestion.address.office || suggestion.address.building;
    const streetPart = suggestion.address.road || suggestion.address.suburb || landmark || 'Location';
    const areaPart = [
      suggestion.address.town || suggestion.address.village,
      suggestion.address.city,
      suggestion.address.county
    ].filter(Boolean).join(', ');
    
    const formattedAddress = landmark ? `${landmark}, ${areaPart}` : `${streetPart}, ${areaPart}`;
    
    const newAddress = {
      address: streetPart,
      city: suggestion.address.city || suggestion.address.town || suggestion.address.village || '',
      postalCode: suggestion.address.postcode || '',
      lat: parseFloat(suggestion.lat),
      lon: parseFloat(suggestion.lon),
      isCurrentLocation: false,
      formattedAddress,
      landmark: landmark || undefined
    };

    setSearchInput(formattedAddress);
    onChange(newAddress);
    setSuggestions([]);
    setShowSuggestions(false);

    // Check for location mismatch with more sophisticated logic
    if (currentLocationCoords) {
      const distance = calculateDistance(
        currentLocationCoords.lat,
        currentLocationCoords.lon,
        newAddress.lat!,
        newAddress.lon!
      );
      // Alert if more than 5km away (more sensitive for delivery)
      setLocationMismatch(distance > 5);
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
      {locationMismatch && currentLocationCoords && value.lat && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="flex items-start justify-between gap-3">
            <div className="text-amber-800 dark:text-amber-200 text-sm">
              <div className="font-medium mb-1">Location Mismatch Detected</div>
              <div className="text-xs opacity-90">
                Your current location appears to be {calculateDistance(
                  currentLocationCoords.lat,
                  currentLocationCoords.lon,
                  value.lat,
                  value.lon
                ).toFixed(1)}km away from the selected delivery address.
              </div>
              <div className="text-xs opacity-75 mt-1">
                Please confirm if you're ordering for someone else or need to update your address.
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissLocationMismatch}
              className="ml-2 h-6 w-6 p-0 hover:bg-amber-100 dark:hover:bg-amber-900/50"
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Address Confirmation Card */}
      {value.lat && value.formattedAddress && (
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm mb-1">Selected Delivery Address</div>
              <div className="text-sm text-muted-foreground">
                {value.formattedAddress}
              </div>
              {value.landmark && (
                <div className="text-xs text-primary mt-1 font-medium">
                  📍 {value.landmark}
                </div>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span>📮 {value.postalCode || 'No postal code'}</span>
                {value.isCurrentLocation && (
                  <span className="text-green-600 font-medium">📍 Current Location</span>
                )}
              </div>
            </div>
          </div>
        </div>
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
          <div className="absolute top-full left-0 right-0 z-50 bg-background border border-border rounded-md shadow-lg max-h-80 overflow-y-auto">
            {suggestions.map((suggestion, index) => {
              const landmark = suggestion.address.amenity || suggestion.address.shop || 
                              suggestion.address.office || suggestion.address.building;
              const streetPart = suggestion.address.road || suggestion.address.suburb || landmark || 'Location';
              const areaParts = [
                suggestion.address.town || suggestion.address.village,
                suggestion.address.city,
                suggestion.address.county
              ].filter(Boolean);
              
              return (
                <div
                  key={index}
                  className="px-4 py-3 hover:bg-muted cursor-pointer border-b border-border last:border-b-0 transition-colors"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {landmark ? (
                          <span className="text-primary">{landmark}</span>
                        ) : (
                          streetPart
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {areaParts.join(', ')}
                        {suggestion.address.postcode && (
                          <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded">
                            {suggestion.address.postcode}
                          </span>
                        )}
                      </div>
                      {landmark && streetPart !== landmark && (
                        <div className="text-xs text-muted-foreground opacity-75">
                          {streetPart}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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