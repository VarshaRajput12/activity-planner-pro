import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Vote,
  Calendar,
  Trophy,
  Users,
  Settings,
  LogOut,
  Bell,
  Shield,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose, isMobile = false }) => {
  const { profile, isAdmin, signOut, refreshProfile } = useAuth();
  const { toast } = useToast();
  const location = useLocation();

  const [isActive, setIsActive] = React.useState<boolean | null>(null);
  const [isUpdating, setIsUpdating] = React.useState(false);

  React.useEffect(() => {
    // The DB currently stores a text `status` column with values like 'Active'/'Inactive'.
    setIsActive(profile?.status ? profile.status === 'Active' : null);
  }, [profile]);

  const handleToggle = async (checked: boolean) => {
    if (!profile) return;
    const previous = isActive;
    setIsActive(checked);
    setIsUpdating(true);
    try {
      // Update the existing text `status` column to match the schema you're using in the database.
      const newStatus = checked ? 'Active' : 'Inactive';
      const { data, error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', profile.id)
        .select()
        .single();

      if (error) throw error;

      // update local state from returned row if present
      setIsActive((data?.status ?? newStatus) === 'Active');
      await refreshProfile();
      toast({ title: 'Status updated', description: `Your status is now ${(data?.status ?? newStatus)}` });
    } catch (err: any) {
      console.error('Failed to update active status:', err);
      setIsActive(previous);
      toast({ title: 'Failed to update status', description: err?.message ?? String(err), variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  const userLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/polls', label: 'Polls', icon: Vote },
    { href: '/activities', label: 'Activities', icon: Calendar },
    { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  ];

  const adminLinks = [
    { href: '/admin', label: 'Admin Panel', icon: Shield },
    { href: '/admin/users', label: 'Manage Users', icon: Users },
  ];

  const isActiveLink = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    // Exact match for /admin to prevent matching /admin/users
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || profile?.email?.[0]?.toUpperCase() || '?';

  return (
    <aside className={cn(
      "fixed left-0 top-0 z-50 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300",
      isMobile ? (isOpen ? "translate-x-0" : "-translate-x-full") : "lg:translate-x-0",
      !isMobile && "lg:z-40"
    )}>
      {/* Mobile close button */}
      {isMobile && (
        <div className="flex justify-end p-4 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      {/* Logo */}
      <div className={cn("p-6 border-b border-sidebar-border", isMobile && "pt-2")}>
        <Link to="/dashboard" className="flex items-center gap-3" onClick={isMobile ? onClose : undefined}>
          <div className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center">
            <Calendar className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">Meetup</h1>
            <p className="text-xs text-sidebar-foreground/60">Activity Tracker</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
        <div className="mb-6">
          <p className="px-4 mb-2 text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
            Menu
          </p>
          {userLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={isMobile ? onClose : undefined}
              className={cn(
                'sidebar-link',
                isActiveLink(link.href) && 'active'
              )}
            >
              <link.icon className="w-5 h-5" />
              <span>{link.label}</span>
            </Link>
          ))}
        </div>

        {isAdmin && (
          <div className="pt-4 border-t border-sidebar-border">
            <p className="px-4 mb-2 text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
              Admin
            </p>
            {adminLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={isMobile ? onClose : undefined}
                className={cn(
                  'sidebar-link',
                  isActiveLink(link.href) && 'active'
                )}
              >
                <link.icon className="w-5 h-5" />
                <span>{link.label}</span>
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="w-10 h-10 ring-2 ring-sidebar-accent">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.full_name || 'User'}
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {isAdmin ? 'Administrator' : 'Member'}
            </p>
          </div>
          {/* Active / Inactive toggle */}
          <div className="flex flex-col items-center gap-1">
            <Switch checked={!!isActive} onCheckedChange={handleToggle} disabled={isUpdating} />
            <p className="text-xs font-medium text-sidebar-foreground">{isActive ? 'Active' : 'Inactive'}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
