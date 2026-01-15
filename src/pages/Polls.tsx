import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import { usePolls } from '@/hooks/usePolls';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Vote,
  Plus,
  Clock,
  Users,
  CheckCircle2,
  Trash2,
  Loader2,
} from 'lucide-react';
import { format, formatDistanceToNow, isPast, addDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const Polls: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { polls, isLoading, vote, getUserVote, createPoll, closePoll } = usePolls();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newPoll, setNewPoll] = useState({
    title: '',
    description: '',
    expiresIn: 7,
    options: [{ title: '', description: '' }, { title: '', description: '' }],
  });

  const activePolls = polls.filter((p) => p.status === 'active' && !isPast(new Date(p.expires_at)));
  const closedPolls = polls.filter((p) => p.status !== 'active' || isPast(new Date(p.expires_at)));

  const handleCreatePoll = async () => {
    if (!newPoll.title || newPoll.options.filter((o) => o.title).length < 2) return;

    setIsCreating(true);
    const result = await createPoll(
      newPoll.title,
      newPoll.description,
      addDays(new Date(), newPoll.expiresIn),
      newPoll.options.filter((o) => o.title)
    );

    if (result) {
      setIsCreateOpen(false);
      setNewPoll({
        title: '',
        description: '',
        expiresIn: 7,
        options: [{ title: '', description: '' }, { title: '', description: '' }],
      });
    }
    setIsCreating(false);
  };

  const addOption = () => {
    if (newPoll.options.length < 6) {
      setNewPoll((prev) => ({
        ...prev,
        options: [...prev.options, { title: '', description: '' }],
      }));
    }
  };

  const removeOption = (index: number) => {
    if (newPoll.options.length > 2) {
      setNewPoll((prev) => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index),
      }));
    }
  };

  const updateOption = (index: number, field: 'title' | 'description', value: string) => {
    setNewPoll((prev) => ({
      ...prev,
      options: prev.options.map((opt, i) =>
        i === index ? { ...opt, [field]: value } : opt
      ),
    }));
  };

  const renderPollCard = (poll: typeof polls[0], isActive: boolean) => {
    const userVote = getUserVote(poll.id);
    const totalVotes = poll.vote_count || 0;
    const isExpired = isPast(new Date(poll.expires_at));

    return (
      <Card key={poll.id} className="card-elevated animate-slide-up">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge
                  variant="outline"
                  className={
                    isActive && !isExpired
                      ? 'bg-success/10 text-success border-success/20'
                      : 'bg-muted text-muted-foreground'
                  }
                >
                  {isActive && !isExpired ? 'Active' : 'Closed'}
                </Badge>
                {userVote && (
                  <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Voted
                  </Badge>
                )}
              </div>
              <CardTitle className="text-xl">{poll.title}</CardTitle>
              {poll.description && (
                <p className="text-muted-foreground mt-2">{poll.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-4">
            {poll.creator && (
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={poll.creator.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {poll.creator.full_name?.[0] || poll.creator.email?.[0]}
                  </AvatarFallback>
                </Avatar>
                <span>{poll.creator.full_name || 'Unknown'}</span>
              </div>
            )}
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {totalVotes} votes
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {isExpired
                ? `Ended ${formatDistanceToNow(new Date(poll.expires_at), { addSuffix: true })}`
                : `Ends ${formatDistanceToNow(new Date(poll.expires_at), { addSuffix: true })}`}
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {poll.options?.map((option) => {
            const voteCount = option.vote_count || 0;
            const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
            const isUserVote = userVote === option.id;
            const canVote = isActive && !isExpired && !userVote;

            return (
              <button
                key={option.id}
                className={`w-full p-4 rounded-lg border transition-all text-left ${
                  isUserVote
                    ? 'border-accent bg-accent/5'
                    : canVote
                    ? 'border-border hover:border-accent/50 hover:bg-muted/50 cursor-pointer'
                    : 'border-border cursor-default'
                }`}
                onClick={() => canVote && vote(poll.id, option.id)}
                disabled={!canVote}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{option.title}</span>
                    {isUserVote && <CheckCircle2 className="w-4 h-4 text-accent" />}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {voteCount} ({percentage.toFixed(0)}%)
                  </span>
                </div>
                {option.description && (
                  <p className="text-sm text-muted-foreground mb-2">{option.description}</p>
                )}
                <Progress value={percentage} className="h-2" />
              </button>
            );
          })}

          {isAdmin && isActive && !isExpired && (
            <div className="pt-4 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => closePoll(poll.id)}>
                Close Poll
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen">
      <Header title="Activity Polls" subtitle="Vote on upcoming activities" />

      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <Tabs defaultValue="active" className="w-full">
            <div className="flex items-center justify-between mb-6">
              <TabsList>
                <TabsTrigger value="active">
                  Active ({activePolls.length})
                </TabsTrigger>
                <TabsTrigger value="closed">
                  Closed ({closedPolls.length})
                </TabsTrigger>
              </TabsList>

              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button variant="accent">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Poll
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Poll</DialogTitle>
                    <DialogDescription>
                      Create a poll for the community to vote on activities
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Poll Title</Label>
                      <Input
                        id="title"
                        placeholder="e.g., Next Team Outing"
                        value={newPoll.title}
                        onChange={(e) =>
                          setNewPoll((prev) => ({ ...prev, title: e.target.value }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description (optional)</Label>
                      <Textarea
                        id="description"
                        placeholder="Add more context..."
                        value={newPoll.description}
                        onChange={(e) =>
                          setNewPoll((prev) => ({ ...prev, description: e.target.value }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expires">Expires in (days)</Label>
                      <Input
                        id="expires"
                        type="number"
                        min={1}
                        max={30}
                        value={newPoll.expiresIn}
                        onChange={(e) =>
                          setNewPoll((prev) => ({
                            ...prev,
                            expiresIn: parseInt(e.target.value) || 7,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Options</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={addOption}
                          disabled={newPoll.options.length >= 6}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Option
                        </Button>
                      </div>

                      {newPoll.options.map((option, index) => (
                        <div key={index} className="flex gap-2">
                          <div className="flex-1 space-y-2">
                            <Input
                              placeholder={`Option ${index + 1}`}
                              value={option.title}
                              onChange={(e) => updateOption(index, 'title', e.target.value)}
                            />
                          </div>
                          {newPoll.options.length > 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeOption(index)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="accent"
                      onClick={handleCreatePoll}
                      disabled={
                        isCreating ||
                        !newPoll.title ||
                        newPoll.options.filter((o) => o.title).length < 2
                      }
                    >
                      {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Create Poll
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <TabsContent value="active" className="space-y-6">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-64 w-full" />
                ))
              ) : activePolls.length === 0 ? (
                <Card className="card-elevated">
                  <CardContent className="py-16 text-center">
                    <Vote className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-xl font-semibold mb-2">No Active Polls</h3>
                    <p className="text-muted-foreground mb-6">
                      Create a poll to start gathering votes from the community
                    </p>
                    <Button variant="accent" onClick={() => setIsCreateOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Poll
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                activePolls.map((poll) => renderPollCard(poll, true))
              )}
            </TabsContent>

            <TabsContent value="closed" className="space-y-6">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-64 w-full" />
                ))
              ) : closedPolls.length === 0 ? (
                <Card className="card-elevated">
                  <CardContent className="py-16 text-center">
                    <Vote className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-xl font-semibold mb-2">No Closed Polls</h3>
                    <p className="text-muted-foreground">
                      Closed polls will appear here
                    </p>
                  </CardContent>
                </Card>
              ) : (
                closedPolls.map((poll) => renderPollCard(poll, false))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Polls;
