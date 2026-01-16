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
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, role_id')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Ensure role_id is properly set for all users
      const rows = (data || []) as any[];
      const usersWithRoles = rows.map((row) => ({
        ...row,
        role_id: row.role_id || ROLE_IDS.USER // Default to USER if null
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

  const handleStatusChange = async (userProfile: ProfileWithRole, value: 'active' | 'inactive') => {
    if (!isAdmin || !user) return;
    if (userProfile.id === user.id) {
      toast({ title: 'Not allowed', description: 'You cannot change your own active status', variant: 'destructive' });
      return;
    }

    const newActive = value === 'active';
    setUpdatingStatusId(userProfile.id);

    // optimistic UI update
    setUsers(prev => prev.map(u => u.id === userProfile.id ? { ...u, status: newActive ? 'Active' : 'Inactive' } : u));

    try {
      const newStatus = newActive ? 'Active' : 'Inactive';
      const { data, error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', userProfile.id)
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Status updated', description: `${userProfile.full_name || userProfile.email} is now ${data?.status ?? newStatus}` });
    } catch (err) {
      console.error('Failed to update status:', err);
      // revert optimistic update
      setUsers(prev => prev.map(u => u.id === userProfile.id ? { ...u, status: userProfile.status ?? 'Active' } : u));
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    } finally {
      setUpdatingStatusId(null);
    }
  };

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

  // Split users by status for tabs
  const activeUsers = filteredUsers.filter(u => (u.status ?? 'Active') === 'Active');
  const inactiveUsers = filteredUsers.filter(u => (u.status ?? 'Active') === 'Inactive');

  const activeCount = activeUsers.length;
  const inactiveCount = inactiveUsers.length;

  // Helper to render the users table for a provided list
  const renderUsersTable = (list: ProfileWithRole[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Joined</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Actions</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.map((userProfile) => {
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
                  <span className="font-medium">{userProfile.full_name || 'Unknown'}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{userProfile.email}</TableCell>
              <TableCell className="text-muted-foreground">{format(new Date(userProfile.created_at), 'MMM d, yyyy')}</TableCell>
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
              <TableCell>
                <Select
                  value={(userProfile.status ?? 'Active') === 'Active' ? 'active' : 'inactive'}
                  onValueChange={(v) => handleStatusChange(userProfile, v as 'active' | 'inactive')}
                  disabled={!isAdmin || isCurrentUser || updatingStatusId === userProfile.id}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder={userProfile.status ?? 'Active'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

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

        {/* Users with Tabs: All / Active / Inactive */}
        <Tabs defaultValue="all" className="w-full">
          <Card className="card-elevated">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
                <div className="w-full sm:w-auto">
                  <TabsList className="mb-2 sm:mb-0">
                    <TabsTrigger value="all" className='text-xl'>All Users ({users.length})</TabsTrigger>
                    <TabsTrigger value="active" className='text-xl'>Active Users({activeCount})</TabsTrigger>
                    <TabsTrigger value="inactive" className='text-xl'>Inactive Users({inactiveCount})</TabsTrigger>
                  </TabsList>
                </div>
                <div className="flex items-center justify-between w-full sm:w-auto">
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
                <>
                  <TabsContent value="all" className="space-y-6">
                    {renderUsersTable(filteredUsers)}
                  </TabsContent>
                  <TabsContent value="active" className="space-y-6">
                    {renderUsersTable(activeUsers)}
                  </TabsContent>
                  <TabsContent value="inactive" className="space-y-6">
                    {renderUsersTable(inactiveUsers)}
                  </TabsContent>
                </>
              )}
            </CardContent>
          </Card>
        </Tabs>
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
