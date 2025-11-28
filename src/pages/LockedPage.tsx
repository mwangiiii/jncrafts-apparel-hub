import { Lock, Shield, Mail } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from 'react-router-dom';
import lockedImage from '@/assets/locked-image.jpg';


const LockedPage = () => {
  const [unlockTime, setUnlockTime] = useState<string | null>(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUnlockTime = async () => {
      const { data } = await supabase
        .from('system_status')
        .select('unlock_at')
        .order('id', { ascending: false })
        .limit(1)
        .single();
      
      if (data?.unlock_at) {
        setUnlockTime(data.unlock_at);
      }
    };
    
    fetchUnlockTime();
  }, []);

  // Countdown logic
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const targetDate = unlockTime ? new Date(unlockTime) : (() => {
      const date = new Date();
      date.setDate(date.getDate() + 21);
      return date;
    })();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      if (distance > 0) {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        setCountdown({ days, hours, minutes, seconds });
      } else {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        if (interval) clearInterval(interval);
      }
    };

    interval = setInterval(updateCountdown, 1000);
    updateCountdown(); // Initial call

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [unlockTime]);

  const formatUnlockTime = (time: string | null) => {
    if (!time) return null;
    try {
      const date = new Date(time);
      return date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return null;
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder: Submit email to Supabase or service
    console.log('Notify email:', email);
    setEmail('');
    // Optional: toast success
  };

  const createTimeBlock = (value: number, label: string) => (
    <div className="flex flex-col items-center justify-center bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 border border-white/20">
      <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-white drop-shadow-lg">{value.toString().padStart(2, '0')}</span>
      <span className="text-xs sm:text-sm uppercase tracking-wider mt-1 text-gray-300">{label}</span>
    </div>
  );

  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center overflow-hidden bg-background">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
          <img
            alt="Three people wearing stylish tracksuits in an urban setting"
            className="w-full h-full object-cover"
            src={lockedImage}
          />
        <div className="absolute inset-0 bg-black/70"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center text-white p-8 w-full max-w-4xl space-y-8">
        {/* Logo and Headline */}
        <div className="space-y-4">
          <h2 className="text-xl md:text-2xl font-semibold tracking-wider uppercase">JnCrafts Apparel</h2>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold drop-shadow-lg">New Product is Coming Soon</h1>
        </div>

        {/* Description */}
        <p className="text-base md:text-lg text-gray-200 max-w-2xl drop-shadow-md">
          We're preparing to launch a new collection. Stay tuned for the big reveal.
        </p>

        {/* Countdown */}
        {/* <div className="flex justify-center gap-4 sm:gap-6 md:gap-8">
          {createTimeBlock(countdown.days, 'Days')}
          {createTimeBlock(countdown.hours, 'Hours')}
          {createTimeBlock(countdown.minutes, 'Minutes')}
          {createTimeBlock(countdown.seconds, 'Seconds')}
        </div> */}

        {/* Email Signup */}
        <div className="w-full max-w-md space-y-4">
          <p className="text-sm font-semibold text-white">Be the first to know when we launch.</p>
          <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-3">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-grow w-full px-4 py-3 text-gray-900 bg-white/90 border border-transparent rounded-md focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-gray-500"
              required
            />
            <Button
              type="submit"
              className="flex-shrink-0 px-8 py-3 bg-primary text-white font-semibold rounded-md shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-300"
            >
              Notify Me
            </Button>
          </form>
        </div>

        {/* Unlock Time Display (if available)
        {unlockTime && formatUnlockTime(unlockTime) && (
          <div className="p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
            <p className="text-sm font-medium text-gray-200">Expected to be back:</p>
            <p className="text-base font-semibold text-white mt-1">{formatUnlockTime(unlockTime)}</p>
          </div>
        )} */}

        {/* Admin Access Button */}
        <div className="pt-6 pb-4">
          <Button
            onClick={() => navigate('/admin/login')}
            variant="outline"
            size="sm"
            className="border-white/30 bg-white/5 backdrop-blur-sm text-white hover:bg-white/10 hover:border-white/50 text-xs px-6 py-2 rounded-md shadow-lg transition-all duration-300"
          >
            <Shield className="w-4 h-4 mr-2" />
            Administrator Access
          </Button>
        </div>

        {/* Site ID */}
        {/* <div className="text-xs text-gray-400">
          Site ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}
        </div> */}
      </div>
    </div>
  );
};

export default LockedPage;