import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Profile, UserRole } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  Shield,
  ShieldOff,
  Search,
  Loader2,
  UserCog,
} from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { log } from 'console';

// Role constants matching the migration
const ROLE_IDS = {
  USER: '00000000-0000-0000-0000-000000000001',
  ADMIN: '00000000-0000-0000-0000-000000000002',
};

interface ProfileWithRole extends Profile {
  role?: UserRole;
  role_id: string;
}

const ManageUsers: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<ProfileWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isChangeRoleDialogOpen, setIsChangeRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ProfileWithRole | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, role_id')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Ensure role_id is properly set for all users
      const usersWithRoles = (data || []).map(user => ({
        ...user,
        role_id: user.role_id || ROLE_IDS.USER // Default to USER if null
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleToggleRole = async () => {
    if (!selectedUser || !user) return;

    setIsSubmitting(true);
    try {
      const isCurrentlyAdmin = selectedUser.role_id === ROLE_IDS.ADMIN;
      const newRoleId = isCurrentlyAdmin ? ROLE_IDS.USER : ROLE_IDS.ADMIN;
      
      console.log('Updating role for user:', selectedUser.id);
      console.log('Current role_id:', selectedUser.role_id);
      console.log('New role_id:', newRoleId);

      const { data, error } = await supabase
        .from('profiles')
        .update({ role_id: newRoleId })
        .eq('id', selectedUser.id)
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Update successful:', data);

      toast({
        title: 'Role updated',
        description: `${selectedUser.full_name || selectedUser.email} is now ${isCurrentlyAdmin ? 'a User' : 'an Admin'}`,
      });

      setIsChangeRoleDialogOpen(false);
      setSelectedUser(null);
      await fetchData();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update user role',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openRoleChangeDialog = (userProfile: ProfileWithRole) => {
    setSelectedUser(userProfile);
    setIsChangeRoleDialogOpen(true);
  };

  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase();
    return (
      u.email.toLowerCase().includes(query) ||
      u.full_name?.toLowerCase().includes(query)
    );
  });

  const adminUsers = filteredUsers.filter(u => u.role_id === ROLE_IDS.ADMIN);
  const regularUsers = filteredUsers.filter(u => u.role_id === ROLE_IDS.USER);

  return (
    <div className="min-h-screen">
      <Header title="Manage Users" subtitle="View and manage user roles" />

      <div className="p-8 space-y-8 animate-fade-in">
        {/* Admin Users */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-accent" />
              Admin Users ({adminUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : adminUsers.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No admins configured yet
              </p>
            ) : (
              <div className="space-y-3">
                {adminUsers.map((userProfile) => (
                  <div
                    key={userProfile.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={userProfile.avatar_url || undefined} />
                        <AvatarFallback>
                          {userProfile.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {userProfile.full_name || userProfile.email}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {userProfile.email}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openRoleChangeDialog(userProfile)}
                      disabled={userProfile.id === user?.id}
                    >
                      <ShieldOff className="w-4 h-4 mr-2" />
                      Remove Admin
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* All Users */}
        <Card className="card-elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-muted-foreground" />
                All Users ({users.length})
              </CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No users match your search' : 'No users registered yet'}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((userProfile) => {
                    const isUserAdmin = userProfile.role_id === ROLE_IDS.ADMIN;
                    const isCurrentUser = userProfile.id === user?.id;

                    return (
                      <TableRow key={userProfile.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={userProfile.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {userProfile.full_name?.[0] || userProfile.email[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                              {userProfile.full_name || 'Unknown'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {userProfile.email}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(userProfile.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          {isUserAdmin ? (
                            <Badge className="bg-accent/10 text-accent border-accent/20">
                              <Shield className="w-3 h-3 mr-1" />
                              Admin
                            </Badge>
                          ) : (
                            <Badge variant="outline">User</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openRoleChangeDialog(userProfile)}
                            disabled={isCurrentUser}
                            title={isCurrentUser ? "You cannot change your own role" : "Change user role"}
                          >
                            <UserCog className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Role Change Confirmation Dialog */}
      <AlertDialog open={isChangeRoleDialogOpen} onOpenChange={setIsChangeRoleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change User Role</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser && (
                <>
                  Are you sure you want to change{' '}
                  <strong>{selectedUser.full_name || selectedUser.email}</strong>'s role to{' '}
                  <strong>
                    {selectedUser.role_id === ROLE_IDS.ADMIN ? 'User' : 'Admin'}
                  </strong>?
                  {selectedUser.role_id === ROLE_IDS.ADMIN ? (
                    <span className="block mt-2 text-sm">
                      This will remove their admin privileges.
                    </span>
                  ) : (
                    <span className="block mt-2 text-sm">
                      This will grant them full admin access to manage activities, users, and polls.
                    </span>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleRole}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Change Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManageUsers;
