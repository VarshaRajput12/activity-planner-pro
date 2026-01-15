import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Profile, Admin } from '@/types/database';
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
  Plus,
  Search,
  Loader2,
  Trash2,
  UserCog,
} from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

const ManageUsers: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [usersRes, adminsRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('admins').select('*'),
      ]);

      if (usersRes.error) throw usersRes.error;
      if (adminsRes.error) throw adminsRes.error;

      setUsers(usersRes.data || []);
      setAdmins(adminsRes.data || []);
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

  const isUserAdmin = (email: string) => {
    return admins.some((a) => a.email.toLowerCase() === email.toLowerCase());
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim() || !user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('admins').insert({
        email: newAdminEmail.toLowerCase().trim(),
        added_by: user.id,
      });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Already an admin',
            description: 'This email is already in the admin list',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: 'Admin added',
          description: `${newAdminEmail} has been added as an admin`,
        });
        setNewAdminEmail('');
        setIsAddAdminOpen(false);
        await fetchData();
      }
    } catch (error) {
      console.error('Error adding admin:', error);
      toast({
        title: 'Error',
        description: 'Failed to add admin',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAdmin = async (adminId: string, email: string) => {
    try {
      const { error } = await supabase.from('admins').delete().eq('id', adminId);

      if (error) throw error;

      toast({
        title: 'Admin removed',
        description: `${email} has been removed from admins`,
      });
      await fetchData();
    } catch (error) {
      console.error('Error removing admin:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove admin',
        variant: 'destructive',
      });
    }
  };

  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase();
    return (
      u.email.toLowerCase().includes(query) ||
      u.full_name?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen">
      <Header title="Manage Users" subtitle="View and manage user roles" />

      <div className="p-8 space-y-8 animate-fade-in">
        {/* Admin Management */}
        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-accent" />
              Admin Users
            </CardTitle>
            <Dialog open={isAddAdminOpen} onOpenChange={setIsAddAdminOpen}>
              <DialogTrigger asChild>
                <Button variant="accent" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Admin
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Admin</DialogTitle>
                  <DialogDescription>
                    Enter the email address of the user you want to make an admin.
                    They will receive admin privileges on their next login.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddAdminOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="accent"
                    onClick={handleAddAdmin}
                    disabled={isSubmitting || !newAdminEmail.trim()}
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Add Admin
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : admins.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No admins configured yet
              </p>
            ) : (
              <div className="space-y-3">
                {admins.map((admin) => {
                  const userProfile = users.find(
                    (u) => u.email.toLowerCase() === admin.email.toLowerCase()
                  );

                  return (
                    <div
                      key={admin.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={userProfile?.avatar_url || undefined} />
                          <AvatarFallback>
                            {admin.email[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {userProfile?.full_name || admin.email}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {admin.email}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveAdmin(admin.id, admin.email)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((userProfile) => (
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
                        {isUserAdmin(userProfile.email) ? (
                          <Badge className="bg-accent/10 text-accent border-accent/20">
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="outline">User</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManageUsers;
