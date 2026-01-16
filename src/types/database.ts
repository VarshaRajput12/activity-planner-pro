export type AppRole = 'Admin' | 'User';
export type ParticipationStatus = 'pending' | 'accepted' | 'rejected';
export type PollStatus = 'active' | 'closed' | 'resolved';
export type ActivityStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

// Role lookup table
export interface UserRole {
  id: string;
  name: AppRole;
  created_at: string;
}

// Minimal profile for nested queries (doesn't always include all fields)
export interface ProfileMinimal {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

// Base profile with email
export interface ProfileBase extends ProfileMinimal {
  email: string;
}

// Full profile with timestamps and role
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role_id: string; // UUID stored as string
  created_at: string;
  updated_at: string;
}

// Poll option vote for counting
export interface VoteBasic {
  id: string;
  user_id: string;
}

export interface Vote extends VoteBasic {
  poll_id: string;
  option_id: string;
  created_at: string;
  voter?: ProfileMinimal;
}

export interface PollOption {
  id: string;
  poll_id: string;
  title: string;
  description: string | null;
  created_at: string;
  votes?: VoteBasic[];
  vote_count?: number;
}

export interface ActivityPoll {
  id: string;
  title: string;
  description: string | null;
  created_by: string | null;
  status: PollStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
  creator?: ProfileBase;
  options?: PollOption[];
  vote_count?: number;
}

// Full participation record
export interface ActivityParticipation {
  id: string;
  activity_id: string;
  user_id: string;
  status: ParticipationStatus;
  rejection_reason: string | null;
  responded_at: string | null;
  created_at: string;
  user?: ProfileMinimal;
}

export interface Activity {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  scheduled_at: string | null;
  status: ActivityStatus;
  created_by: string | null;
  poll_id: string | null;
  poll_option_id: string | null;
  created_at: string;
  updated_at: string;
  creator?: ProfileBase;
  participation?: ActivityParticipation[];
}

export interface LeaderboardEntry {
  id: string;
  activity_id: string;
  user_id: string;
  rank: number | null;
  marked_by: string | null;
  created_at: string;
  user?: ProfileMinimal;
  activity?: Activity;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}
