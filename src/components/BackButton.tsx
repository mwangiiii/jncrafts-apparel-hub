import { ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface BackButtonProps {
  fallbackPath?: string;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

const BackButton = ({ fallbackPath = '/', className = '', variant = "ghost" }: BackButtonProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    // Check if there's history to go back to
    if (window.history.length > 1 && location.key !== 'default') {
      navigate(-1);
    } else {
      // Fallback to specified path or home
      navigate(fallbackPath);
    }
  };

  return (
    <Button
      variant={variant}
      onClick={handleBack}
      className={`inline-flex items-center gap-2 hover:bg-muted transition-all duration-200 hover:scale-105 ${className}`}
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="hidden sm:inline">Back</span>
    </Button>
  );
};

export default BackButton;