import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

interface NewArrivalBadgeProps {
  newArrivalDate?: string | null;
}

const NewArrivalBadge = ({ newArrivalDate }: NewArrivalBadgeProps) => {
  if (!newArrivalDate) return null;

  const arrivalDate = new Date(newArrivalDate);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - arrivalDate.getTime()) / (1000 * 3600 * 24));

  // Only show if within 10 days
  if (daysDiff > 10) return null;

  return (
    <Badge 
      className="absolute top-2 left-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-0 shadow-lg animate-pulse"
    >
      <Sparkles className="h-3 w-3 mr-1" />
      New Arrival
    </Badge>
  );
};

export default NewArrivalBadge;