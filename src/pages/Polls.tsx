import React, { useState, useEffect } from 'react';
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
  const { polls, isLoading, vote, getUserVote, createPoll, closePoll, deletePoll, changeVote } = usePolls();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const [newPoll, setNewPoll] = useState({
    title: '',
    description: '',
    eventDate: '',
    eventTime: '',
    expiresInHours: 0,
    expiresInMinutes: 0,
    expiresInSeconds: 0,
    options: [{ title: 'Yes', description: '' }, { title: 'No', description: '' }],
  });

  const activePolls = polls.filter((p) => {
    const expiryTime = new Date(p.expires_at).getTime();
    return p.status === 'active' && currentTime < expiryTime;
  });
  const closedPolls = polls.filter((p) => {
    const expiryTime = new Date(p.expires_at).getTime();
    return p.status !== 'active' || currentTime >= expiryTime;
  });



  // Update countdown timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Prefill Event Date and Time with current values when opening the create dialog
  useEffect(() => {
    if (isCreateOpen) {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().slice(0, 5);
      setNewPoll((prev) => ({
        ...prev,
        eventDate: prev.eventDate || dateStr,
        eventTime: prev.eventTime || timeStr,
      }));
    }
  }, [isCreateOpen]);

  // Helper function to truncate text to 50 words
  const truncateToWords = (text: string, wordLimit: number = 10): { truncated: string; isTruncated: boolean } => {
    const words = text.trim().split(/\s+/);
    if (words.length <= wordLimit) {
      return { truncated: text, isTruncated: false };
    }
    return { truncated: words.slice(0, wordLimit).join(' ') + '...', isTruncated: true };
  };

  // Helper function to toggle description expansion
  const toggleDescriptionExpansion = (pollId: string) => {
    setExpandedDescriptions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(pollId)) {
        newSet.delete(pollId);
      } else {
        newSet.add(pollId);
      }
      return newSet;
    });
  };

  // Helper function to format time remaining
  const getTimeRemaining = (expiresAt: string) => {
    const now = currentTime;
    const expiry = new Date(expiresAt).getTime();
    const diff = expiry - now;

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const handleCreatePoll = async () => {
    if (!newPoll.title || newPoll.options.filter((o) => o.title).length < 2) return;

    setIsCreating(true);
    
    // Calculate total seconds and add to current date
    const totalSeconds = 
      (newPoll.expiresInHours * 3600) + 
      (newPoll.expiresInMinutes * 60) + 
      newPoll.expiresInSeconds;
    
    const expiresAt = new Date(Date.now() + totalSeconds * 1000);
    
    const result = await createPoll(
      newPoll.title,
      newPoll.description,
      expiresAt,
      newPoll.options.filter((o) => o.title),
      newPoll.eventDate || null,
      newPoll.eventTime || null
    );

    if (result) {
      setIsCreateOpen(false);
      setNewPoll({
        title: '',
        description: '',
        eventDate: '',
        eventTime: '',
        expiresInHours: 0,
        expiresInMinutes: 0,
        expiresInSeconds: 0,
        options: [{ title: 'Yes', description: '' }, { title: 'No', description: '' }],
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

  const renderPollCard = (poll: typeof polls[0], isActive: boolean, adminUser: boolean = false) => {
    const userVote = getUserVote(poll.id);
    const totalVotes = poll.vote_count || 0;
    // Check expiry using real-time countdown - poll is expired if current time is past expiry
    const expiryTime = new Date(poll.expires_at).getTime();
    const isExpired = currentTime >= expiryTime;
    // Check if poll is truly active (status is active AND not expired)
    const isPollActive = poll.status === 'active' && !isExpired;

    const showFieldLabels = true;

    return (
      <Card key={poll.id} className="card-elevated animate-slide-up">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge
                  variant="outline"
                  className={
                    isPollActive
                      ? 'bg-success/10 text-success border-success/20'
                      : 'bg-muted text-muted-foreground'
                  }
                >
                  {isPollActive ? 'Active' : 'Closed'}
                </Badge>
                {userVote && (
                  <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Voted
                  </Badge>
                )}
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Activity Name */}
                  <div className="space-y-1">
                    {showFieldLabels && (
                      <p className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">Activity Name</p>
                    )}
                    <CardTitle className="text-xl font-medium text-foreground">{poll.title}</CardTitle>
                  </div>

                  {/* Event Schedule */}
                  {(poll.event_date || poll.event_time) && (
                    <div className="space-y-1">
                      {showFieldLabels && (
                        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">Event Schedule</p>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        📅 {poll.event_date && format(new Date(poll.event_date), 'MMM dd, yyyy')}
                        {poll.event_date && poll.event_time && ' at '}
                        {poll.event_time && format(new Date(`2000-01-01T${poll.event_time}`), 'h:mm a')}
                      </p>
                    </div>
                  )}

                  {/* Description */}
                  {poll.description && (
                    <div className="space-y-1">
                      {showFieldLabels && (
                        <p id="description" className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">Description</p>
                      )}
                      <div>
                        {(() => {
                          const { truncated, isTruncated } = truncateToWords(poll.description, 10);
                          const isExpanded = expandedDescriptions.has(poll.id);
                          return (
                            <>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {isExpanded ? poll.description : truncated}
                              </p>
                              {isTruncated && (
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="mt-2 h-auto p-0 text-accent hover:text-accent/80"
                                  onClick={() => toggleDescriptionExpansion(poll.id)}
                                >
                                  {isExpanded ? 'Show Less' : 'Show More'}
                                </Button>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* {!isActive && isAdmin && (
              <Button variant="accent" size="sm" className="ml-4">
                <Plus className="w-4 h-4 mr-2" />
                Add Activity
              </Button>
            )} */}
            {!isPollActive && adminUser && (
              <Button
                variant="ghost"
                size="icon"
                className="ml-4 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => deletePoll(poll.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
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
                : `Ends in ${getTimeRemaining(poll.expires_at)}`}
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {poll.options?.map((option) => {
            const voteCount = option.vote_count || 0;
            const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
            const isUserVote = userVote === option.id;
            const canInteract = isPollActive;
            const canVote = canInteract && !userVote;
            const canChange = canInteract && userVote && !isUserVote;

            return (
              <button
                key={option.id}
                className={`w-full p-4 rounded-lg border transition-all text-left ${
                  isUserVote
                    ? 'border-accent bg-accent/5'
                    : canVote || canChange
                    ? 'border-border hover:border-accent/50 hover:bg-muted/50 cursor-pointer'
                    : 'border-border cursor-default'
                }`}
                onClick={() => {
                  if (canVote) {
                    vote(poll.id, option.id);
                  } else if (canChange) {
                    changeVote(poll.id, option.id);
                  }
                }}
                disabled={!canVote && !canChange}
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
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
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
                        placeholder="Add more details about the poll..."
                        value={newPoll.description}
                        onChange={(e) =>
                          setNewPoll((prev) => ({ ...prev, description: e.target.value }))
                        }
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="eventDate">Event Date </Label>
                      <Input
                        id="eventDate"
                        type="date"
                        value={newPoll.eventDate}
                        onChange={(e) =>
                          setNewPoll((prev) => ({ ...prev, eventDate: e.target.value }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="eventTime">Event Time </Label>
                      <Input
                        id="eventTime"
                        type="time"
                        value={newPoll.eventTime}
                        onChange={(e) =>
                          setNewPoll((prev) => ({ ...prev, eventTime: e.target.value }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Expires in</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label htmlFor="hours" className="text-xs text-muted-foreground">Hours</Label>
                          <Input
                            id="hours"
                            type="number"
                            min={0}
                            max={720}
                            value={newPoll.expiresInHours || ''}
                            onChange={(e) =>
                              setNewPoll((prev) => ({
                                ...prev,
                                expiresInHours: parseInt(e.target.value) || 0,
                              }))
                            }
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label htmlFor="minutes" className="text-xs text-muted-foreground">Minutes</Label>
                          <Input
                            id="minutes"
                            type="number"
                            min={0}
                            max={59}
                            value={newPoll.expiresInMinutes || ''}
                            onChange={(e) =>
                              setNewPoll((prev) => ({
                                ...prev,
                                expiresInMinutes: parseInt(e.target.value) || 0,
                              }))
                            }
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label htmlFor="seconds" className="text-xs text-muted-foreground">Seconds</Label>
                          <Input
                            id="seconds"
                            type="number"
                            min={0}
                            max={59}
                            value={newPoll.expiresInSeconds || ''}
                            onChange={(e) =>
                              setNewPoll((prev) => ({
                                ...prev,
                                expiresInSeconds: parseInt(e.target.value) || 0,
                              }))
                            }
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Options</Label>
                        {/* <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={addOption}
                          disabled={newPoll.options.length >= 6}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Option
                        </Button> */}
                      </div>

                      {newPoll.options.map((option, index) => (
                        <div key={index} className="flex gap-2">
                          <div className="flex-1 space-y-2">
                            <Input
                              placeholder={`Option ${index + 1}`}
                              value={option.title}
                              onChange={(e) => updateOption(index, 'title', e.target.value)}
                              readOnly={index < 2}
                              className={index < 2 ? 'opacity-100 cursor-default' : undefined}
                            />
                          </div>
                          {newPoll.options.length > 2 && index >= 2 && (
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
                activePolls.map((poll) => renderPollCard(poll, true, isAdmin))
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
                closedPolls.map((poll) => renderPollCard(poll, false, isAdmin))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Polls;
