// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";
// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: any;
  schema: string;
  old_record: any | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const payload: WebhookPayload = await req.json();
    console.log('Received webhook payload:', JSON.stringify(payload, null, 2));

    // Handle new user signup
    if (payload.type === 'INSERT' && payload.table === 'users') {
      const user = payload.record;
      
      console.log('Processing new user:', user.id);

      // Role IDs (matching the migration)
      const USER_ROLE_ID = '00000000-0000-0000-0000-000000000001';
      const ADMIN_ROLE_ID = '00000000-0000-0000-0000-000000000002';

      // Create profile with default User role
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.raw_user_meta_data?.full_name || user.raw_user_meta_data?.name || null,
          avatar_url: user.raw_user_meta_data?.avatar_url || null,
          role_id: USER_ROLE_ID, // Default to User role
        })
        .select()
        .single();

      if (profileError) {
        console.error('Error creating profile:', profileError);
        throw profileError;
      }

      console.log('Profile created with User role:', profile);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'User profile created successfully',
          profile,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Event processed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
