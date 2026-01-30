import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Vote, Trophy, Loader2 } from 'lucide-react';

const Login: React.FC = () => {
  const { user, isLoading, signInWithGoogle } = useAuth();
  const [isSigningIn, setIsSigningIn] = React.useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-accent" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      setIsSigningIn(false);
    }
  };

  const features = [
    {
      icon: Vote,
      title: 'Activity Polls',
      description: 'Vote on upcoming activities and let the community decide',
    },
    {
      icon: Calendar,
      title: 'Event Tracking',
      description: 'Stay updated on all scheduled meetups and events',
    },
    {
      icon: Users,
      title: 'Team Participation',
      description: 'Accept or decline activities with easy RSVP',
    },
    {
      icon: Trophy,
      title: 'Leaderboards',
      description: 'Celebrate top performers in every activity',
    },
  ];

  return (
    <div className="min-h-screen hero-gradient flex flex-col lg:flex-row">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-8 lg:p-12 text-primary-foreground">
        <div>
          <div className="flex items-center gap-3 mb-8 lg:mb-16">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-accent/20 backdrop-blur-sm flex items-center justify-center">
              <Calendar className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold">Meetup</h1>
              <p className="text-xs lg:text-sm text-primary-foreground/70">Activity Tracker</p>
            </div>
          </div>

          <div className="space-y-6 lg:space-y-8">
            <div>
              <h2 className="text-2xl lg:text-4xl font-bold leading-tight mb-4">
                Organize Activities.<br />
                <span className="text-gradient">Track Participation.</span><br />
                Celebrate Success.
              </h2>
              <p className="text-base lg:text-lg text-primary-foreground/70 max-w-md">
                The complete platform for managing team activities, from polls to
                leaderboards—all in one place.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mt-8 lg:mt-12">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="p-3 lg:p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10"
                >
                  <feature.icon className="w-6 h-6 lg:w-8 lg:h-8 mb-2 lg:mb-3 text-accent" />
                  <h3 className="font-semibold mb-1 text-sm lg:text-base">{feature.title}</h3>
                  <p className="text-xs lg:text-sm text-primary-foreground/60">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-sm text-primary-foreground/40">
          © 2025 Meetup Activity Tracker. All rights reserved.
        </p>
      </div>

      {/* Right Panel - Login */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 lg:mb-12 justify-center">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl accent-gradient flex items-center justify-center">
              <Calendar className="w-5 h-5 lg:w-6 lg:h-6 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold">Meetup</h1>
              <p className="text-sm text-muted-foreground">Activity Tracker</p>
            </div>
          </div>

          <div className="text-center mb-6 lg:mb-8">
            <h2 className="text-2xl lg:text-3xl font-bold mb-2">Welcome back</h2>
            <p className="text-sm lg:text-base text-muted-foreground">
              Sign in to access your dashboard
            </p>
          </div>

          <div className="card-elevated p-6 lg:p-8">
            <Button
              size="xl"
              variant="outline"
              className="w-full relative"
              onClick={handleSignIn}
              disabled={isSigningIn}
            >
              {isSigningIn ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>

            <p className="text-center text-xs lg:text-sm text-muted-foreground mt-4 lg:mt-6">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>

          <p className="text-center text-xs lg:text-sm text-muted-foreground mt-6 lg:mt-8">
            Need help?{' '}
            <a href="#" className="text-accent hover:underline">
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
