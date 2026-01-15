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

      // Create profile
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.raw_user_meta_data?.full_name || user.raw_user_meta_data?.name || null,
          avatar_url: user.raw_user_meta_data?.avatar_url || null,
        //   role_id: 'ccd06645-33e0-4ab6-87cd-28e298ce1830',
        })
        .select()
        .single();

      if (profileError) {
        console.error('Error creating profile:', profileError);
        throw profileError;
      }

      console.log('Profile created:', profile);

      // Assign default user role
      const { error: userRoleError } = await supabaseClient
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'user',
        });

      if (userRoleError) {
        console.error('Error assigning user role:', userRoleError);
        throw userRoleError;
      }

      console.log('User role assigned');

      // Check if user should be an admin
      const { data: adminData } = await supabaseClient
        .from('admins')
        .select('email')
        .eq('email', user.email)
        .single();

      if (adminData) {
        const { error: adminRoleError } = await supabaseClient
          .from('user_roles')
          .insert({
            user_id: user.id,
            role: 'admin',
          });

        if (adminRoleError && adminRoleError.code !== '23505') { // Ignore duplicate key error
          console.error('Error assigning admin role:', adminRoleError);
        } else {
          console.log('Admin role assigned');
        }
      }

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
