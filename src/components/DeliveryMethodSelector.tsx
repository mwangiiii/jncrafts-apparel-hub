import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { MapPin, Truck, Building, User, Globe } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useToast } from "@/hooks/use-toast";

export type DeliveryMethod = 'home_delivery' | 'pickup_mtaani' | 'pickup_in_town' | 'customer_logistics' | 'international_delivery';

interface DeliveryDetails {
  method: DeliveryMethod;
  cost: number;
  location: string;
  distanceFromCBD: number;
  courierDetails?: {
    name: string;
    phone: string;
    company?: string;
    pickupWindow?: string;
  };
}

interface DeliveryMethodSelectorProps {
  deliveryDetails: DeliveryDetails | null;
  onDeliveryChange: (details: DeliveryDetails | null) => void;
  shippingAddress: {
    address: string;
    city: string;
    postalCode: string;
  };
}

// Nairobi CBD coordinates (approximately City Hall/Uhuru Park area)
const NAIROBI_CBD_COORDS = { lat: -1.2921, lng: 36.8219 };

const DeliveryMethodSelector = ({ 
  deliveryDetails, 
  onDeliveryChange, 
  shippingAddress 
}: DeliveryMethodSelectorProps) => {
  const [selectedMethod, setSelectedMethod] = useState<DeliveryMethod | null>(deliveryDetails?.method || null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [pickupAgent, setPickupAgent] = useState("");
  const [courierDetails, setCourierDetails] = useState({
    name: "",
    phone: "",
    company: "",
    pickupWindow: "",
  });
  const [hasReviewedDelivery, setHasReviewedDelivery] = useState(false);
  const { formatPrice } = useCurrency();
  const { toast } = useToast();

  // Calculate distance from CBD to given coordinates
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Determine zone based on distance from CBD
  const getZoneFromDistance = (distanceKm: number): 'CBD' | 'Mtaani' | 'Mashinani' => {
    if (distanceKm <= 5) return 'CBD';
    if (distanceKm <= 20) return 'Mtaani';
    return 'Mashinani';
  };

  // Fetch delivery rate from API
  const fetchDeliveryRate = async (
    originZone: 'CBD' | 'Mtaani' | 'Mashinani',
    destZone: 'CBD' | 'Mtaani' | 'Mashinani',
    service: 'pickup_mtaani' | 'doorstep' | 'pickup_in_town' | 'customer_courier',
    fallbackDistanceKm: number
  ): Promise<number> => {
    try {
      const response = await fetch(
        `${window.location.origin}/functions/v1/delivery-rates?origin_zone=${originZone}&dest_zone=${destZone}&service=${service}`,
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch delivery rate');
      }
      
      const data = await response.json();
      return data.rate_ksh || Math.round(fallbackDistanceKm * 55);
    } catch (error) {
      console.error('Error fetching delivery rate:', error);
      // Fallback to distance-based calculation
      return Math.round(fallbackDistanceKm * 55);
    }
  };

  // Calculate delivery cost using API or fallback to distance-based pricing
  const calculateDeliveryCost = async (
    distanceKm: number,
    deliveryMethod: DeliveryMethod
  ): Promise<number> => {
    const originZone = 'CBD'; // We're shipping from CBD
    const destZone = getZoneFromDistance(distanceKm);
    
    let service: 'pickup_mtaani' | 'doorstep' | 'pickup_in_town' | 'customer_courier';
    
    switch (deliveryMethod) {
      case 'home_delivery':
        service = 'doorstep';
        break;
      case 'pickup_mtaani':
        service = 'pickup_mtaani';
        break;
      case 'pickup_in_town':
        service = 'pickup_in_town';
        break;
      case 'customer_logistics':
        service = 'customer_courier';
        break;
      default:
        return Math.round(distanceKm * 55);
    }

    return await fetchDeliveryRate(originZone, destZone, service, distanceKm);
  };

  // Get coordinates for an address using OpenStreetMap Nominatim API
  const getCoordinatesForAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const query = `${address}, ${shippingAddress.city}, Kenya`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
      return null;
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  };

  // Handle delivery method selection
  const handleMethodSelection = async (method: DeliveryMethod) => {
    setSelectedMethod(method);
    setIsCalculating(true);

    try {
      let cost = 0;
      let location = "";
      let distanceFromCBD = 0;

      switch (method) {
        case 'home_delivery':
          if (shippingAddress.address) {
            const coords = await getCoordinatesForAddress(shippingAddress.address);
            if (coords) {
              distanceFromCBD = calculateDistance(
                NAIROBI_CBD_COORDS.lat, 
                NAIROBI_CBD_COORDS.lng, 
                coords.lat, 
                coords.lng
              );
              cost = await calculateDeliveryCost(distanceFromCBD, method);
              location = `${shippingAddress.address}, ${shippingAddress.city}`;
            } else {
              // Fallback: assume 10km from CBD if geocoding fails
              distanceFromCBD = 10;
              cost = await calculateDeliveryCost(distanceFromCBD, method);
              location = `${shippingAddress.address}, ${shippingAddress.city}`;
              toast({
                title: "Distance Estimation",
                description: "Using estimated distance. Actual delivery cost may vary.",
              });
            }
          }
          break;

        case 'pickup_mtaani':
          if (pickupAgent) {
            // For now, assume average 15km from CBD for Mtaani locations
            distanceFromCBD = 15;
            cost = await calculateDeliveryCost(distanceFromCBD, method);
            location = pickupAgent;
          }
          break;

        case 'pickup_in_town':
          cost = 0; // Free pickup at Nairobi Archives
          location = "Nairobi Archives";
          distanceFromCBD = 0;
          break;

        case 'customer_logistics':
          cost = 300; // Default standard delivery price KES 300
          location = "Customer arranged pickup";
          distanceFromCBD = 0;
          break;

        case 'international_delivery':
          cost = 0; // Cost to be determined through contact
          location = "International shipping - Contact us for quote";
          distanceFromCBD = 0;
          break;
      }

      const details: DeliveryDetails = {
        method,
        cost,
        location,
        distanceFromCBD,
        courierDetails: method === 'customer_logistics' ? courierDetails : undefined,
      };

      onDeliveryChange(details);
    } catch (error) {
      console.error('Error calculating delivery:', error);
      toast({
        variant: "destructive",
        title: "Calculation Error",
        description: "Could not calculate delivery cost. Please try again.",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    if (selectedMethod) {
      handleMethodSelection(selectedMethod);
    }
  }, [pickupAgent, courierDetails]);

  const deliveryOptions = [
    {
      id: 'home_delivery' as DeliveryMethod,
      title: 'Home Delivery (Doorstep)',
      description: 'Coming Soon - Direct delivery to your address',
      icon: <Truck className="h-5 w-5" />,
      disabled: true,
      comingSoon: true,
    },
    {
      id: 'pickup_mtaani' as DeliveryMethod,
      title: 'Pickup Mtaani',
      description: 'Coming Soon - Collect at nearest agent location',
      icon: <MapPin className="h-5 w-5" />,
      disabled: true,
      comingSoon: true,
    },
    {
      id: 'pickup_in_town' as DeliveryMethod,
      title: 'Pickup in Town',
      description: 'Collect at Nairobi Archives (FREE)',
      icon: <Building className="h-5 w-5" />,
      disabled: false,
    },
    {
      id: 'customer_logistics' as DeliveryMethod,
      title: 'Customer-Preferred Logistics',
      description: 'Your own courier/rider arrangement (KES 300)',
      icon: <User className="h-5 w-5" />,
      disabled: false,
    },
    {
      id: 'international_delivery' as DeliveryMethod,
      title: 'International Delivery',
      description: 'Worldwide shipping - Contact us for details',
      icon: <Truck className="h-5 w-5" />,
      disabled: false,
      international: true,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Delivery Method (Required)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup
          value={selectedMethod || ""}
          onValueChange={(value) => handleMethodSelection(value as DeliveryMethod)}
        >
          {deliveryOptions.map((option) => (
            <div key={option.id} className="flex items-start space-x-3">
               <RadioGroupItem 
                 value={option.id} 
                 id={option.id}
                 disabled={Boolean(option.disabled)}
               />
              <div className="flex-1">
                <label
                  htmlFor={option.id}
                  className={`flex items-center gap-2 cursor-pointer ${
                    option.disabled ? 'opacity-50' : ''
                  }`}
                >
                  {option.icon}
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {option.title}
                      {option.comingSoon && (
                        <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {option.description}
                    </div>
                  </div>
                </label>
                
                {selectedMethod === option.id && (
                  <div className="mt-3 ml-7 space-y-3">
                    {option.id === 'pickup_mtaani' && (
                      <div>
                        <Label htmlFor="pickupAgent">Select Pickup Agent</Label>
                        <Input
                          id="pickupAgent"
                          placeholder="e.g., Thika Road Mall, Westgate, etc."
                          value={pickupAgent}
                          onChange={(e) => setPickupAgent(e.target.value)}
                        />
                      </div>
                    )}
                    
                    {option.id === 'international_delivery' && (
                      <div className="space-y-3">
                        <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                            📧 Contact Required for International Orders
                          </h4>
                          <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                            Please contact us via WhatsApp for international shipping quotes and delivery arrangements.
                          </p>
                          <div className="text-sm text-muted-foreground">
                            <strong>Note:</strong> You can proceed with placing your order. After confirmation, 
                            we'll automatically send your order details to our admin team via WhatsApp for 
                            international shipping coordination.
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {option.id === 'customer_logistics' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="courierName">Courier Name</Label>
                            <Input
                              id="courierName"
                              placeholder="Courier/rider name"
                              value={courierDetails.name}
                              onChange={(e) => setCourierDetails(prev => ({
                                ...prev,
                                name: e.target.value
                              }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="courierPhone">Phone Number</Label>
                            <Input
                              id="courierPhone"
                              placeholder="Courier phone"
                              value={courierDetails.phone}
                              onChange={(e) => setCourierDetails(prev => ({
                                ...prev,
                                phone: e.target.value
                              }))}
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="courierCompany">Company (Optional)</Label>
                          <Input
                            id="courierCompany"
                            placeholder="Logistics company"
                            value={courierDetails.company}
                            onChange={(e) => setCourierDetails(prev => ({
                              ...prev,
                              company: e.target.value
                            }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="pickupWindow">Pickup Window (Optional)</Label>
                          <Input
                            id="pickupWindow"
                            placeholder="e.g., 9 AM - 5 PM"
                            value={courierDetails.pickupWindow}
                            onChange={(e) => setCourierDetails(prev => ({
                              ...prev,
                              pickupWindow: e.target.value
                            }))}
                          />
                        </div>
                        <div className="text-sm text-muted-foreground bg-accent/10 p-3 rounded">
                          <strong>Note:</strong> You will pay your courier directly. 
                          Pickup will be arranged at our CBD location.
                        </div>
                      </div>
                    )}
                    
                    {deliveryDetails && !isCalculating && (
                      <div className="bg-accent/10 p-3 rounded">
                        <div className="text-sm">
                          <div><strong>Location:</strong> {deliveryDetails.location}</div>
                          {deliveryDetails.distanceFromCBD > 0 && (
                            <div><strong>Distance from CBD:</strong> {deliveryDetails.distanceFromCBD.toFixed(1)} km</div>
                          )}
                          <div className="text-lg font-semibold text-brand mt-1">
                            <strong>Cost:</strong> {formatPrice(deliveryDetails.cost)}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {isCalculating && (
                      <div className="text-sm text-muted-foreground">
                        Calculating delivery cost...
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </RadioGroup>
        
        {deliveryDetails && (
          <div className="flex items-center space-x-2 pt-4 border-t">
            <Checkbox
              id="reviewDelivery"
              checked={hasReviewedDelivery}
              onCheckedChange={(checked) => setHasReviewedDelivery(checked as boolean)}
            />
            <label
              htmlFor="reviewDelivery"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I have reviewed the delivery method and cost
            </label>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DeliveryMethodSelector;