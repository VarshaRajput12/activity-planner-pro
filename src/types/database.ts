export type AppRole = 'admin' | 'user';
export type ParticipationStatus = 'pending' | 'accepted' | 'rejected';
export type PollStatus = 'active' | 'closed' | 'resolved';
export type ActivityStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Admin {
  id: string;
  email: string;
  added_by: string | null;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
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
  creator?: Profile;
  options?: PollOption[];
  vote_count?: number;
}

export interface PollOption {
  id: string;
  poll_id: string;
  title: string;
  description: string | null;
  created_at: string;
  votes?: Vote[];
  vote_count?: number;
}

export interface Vote {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
  created_at: string;
  voter?: Profile;
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
  creator?: Profile;
  participation?: ActivityParticipation[];
}

export interface ActivityParticipation {
  id: string;
  activity_id: string;
  user_id: string;
  status: ParticipationStatus;
  rejection_reason: string | null;
  responded_at: string | null;
  created_at: string;
  user?: Profile;
}

export interface LeaderboardEntry {
  id: string;
  activity_id: string;
  user_id: string;
  rank: number | null;
  marked_by: string | null;
  created_at: string;
  user?: Profile;
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
