import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NewArrivalBadgeProps {
  newArrivalDate?: string;
  className?: string;
}

const NewArrivalBadge = ({ newArrivalDate, className }: NewArrivalBadgeProps) => {
  if (!newArrivalDate) return null;
  
  const arrivalDate = new Date(newArrivalDate);
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  
  // Don't show if more than 10 days old
  if (arrivalDate <= tenDaysAgo) return null;
  
  return (
    <Badge 
      variant="secondary" 
      className={cn(
        "absolute top-2 left-2 z-10 bg-gradient-to-r from-primary to-accent text-white font-semibold shadow-lg animate-pulse",
        className
      )}
    >
      New Arrival
    </Badge>
  );
};

export default NewArrivalBadge;