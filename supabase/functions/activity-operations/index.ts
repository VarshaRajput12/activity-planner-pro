// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { action, payload } = await req.json();
    console.log('Activity action:', action, 'User:', user.id);

    switch (action) {
      case 'create_activity': {
        const { title, description, location, scheduled_at, poll_id, poll_option_id } = payload;

        // Create activity
        const { data: activity, error: activityError } = await supabaseClient
          .from('activities')
          .insert({
            title,
            description,
            location,
            scheduled_at,
            poll_id,
            poll_option_id,
            created_by: user.id,
            status: 'upcoming',
          })
          .select()
          .single();

        if (activityError) throw activityError;

        // Notify all users about the new activity
        const { data: users } = await supabaseClient
          .from('profiles')
          .select('id')
          .neq('id', user.id);

        if (users && users.length > 0) {
          const notifications = users.map(u => ({
            user_id: u.id,
            title: 'New Activity Created',
            message: `${title} has been scheduled!`,
            type: 'activity_created',
            reference_id: activity.id,
          }));

          await supabaseClient
            .from('notifications')
            .insert(notifications);
        }

        return new Response(
          JSON.stringify({ success: true, activity }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'participate_in_activity': {
        const { activity_id, status: participationStatus, rejection_reason } = payload;

        const { data: participation, error } = await supabaseClient
          .from('activity_participation')
          .upsert({
            activity_id,
            user_id: user.id,
            status: participationStatus,
            rejection_reason,
            responded_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;

        // Get activity details and creator
        const { data: activity } = await supabaseClient
          .from('activities')
          .select('title, created_by')
          .eq('id', activity_id)
          .single();

        if (activity && activity.created_by) {
          // Notify activity creator
          await supabaseClient
            .from('notifications')
            .insert({
              user_id: activity.created_by,
              title: 'Participation Response',
              message: `Someone ${participationStatus} participation in ${activity.title}`,
              type: 'participation_response',
              reference_id: activity_id,
            });
        }

        return new Response(
          JSON.stringify({ success: true, participation }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'mark_leaderboard': {
        const { activity_id, user_id: ranked_user_id, rank } = payload;

        // Verify user is admin
        const { data: isAdmin } = await supabaseClient
          .rpc('is_admin', { _user_id: user.id });

        if (!isAdmin) {
          throw new Error('Only admins can mark leaderboard');
        }

        // Verify activity is completed
        const { data: activity, error: activityError } = await supabaseClient
          .from('activities')
          .select('status, title')
          .eq('id', activity_id)
          .single();

        if (activityError || !activity) {
          throw new Error('Activity not found');
        }

        if (activity.status !== 'completed') {
          throw new Error('Leaderboard can only be marked for completed activities');
        }

        const { data: entry, error } = await supabaseClient
          .from('leaderboard_entries')
          .upsert({
            activity_id,
            user_id: ranked_user_id,
            rank,
            marked_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;

        // Notify the user who got ranked
        if (activity) {
          await supabaseClient
            .from('notifications')
            .insert({
              user_id: ranked_user_id,
              title: 'Leaderboard Achievement',
              message: `You ranked #${rank} in ${activity.title}!`,
              type: 'leaderboard_marked',
              reference_id: activity_id,
            });
        }

        return new Response(
          JSON.stringify({ success: true, entry }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message === 'Unauthorized' ? 401 : 400,
      }
    );
  }
});
