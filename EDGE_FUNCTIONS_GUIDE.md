# Edge Functions Setup Guide

## Overview

This project now includes Supabase Edge Functions to handle:

1. **User Signup** - Automatically creates profiles and assigns roles
2. **Activity Operations** - Creates activities with notifications, manages participation, and leaderboard

## What Was Created

### Edge Functions

1. **`supabase/functions/handle-user-signup/`**

   - Handles new user registration
   - Creates profile entries
   - Assigns default user role
   - Assigns admin role if email is in admins table

2. **`supabase/functions/activity-operations/`**
   - Creates activities with notifications
   - Manages activity participation
   - Handles leaderboard marking (admin only)

### Database Migration

- **`20260115120000_add_edge_function_webhook.sql`**
  - Adds support for calling edge functions from database triggers
  - Optional webhook trigger for user signup

### React Hook

- **`src/hooks/useActivityOperations.ts`**
  - Convenient React hook for calling edge functions
  - Handles loading states and errors

## How It Works

### Current Setup (Database Trigger)

Right now, your app uses a **database trigger** (`handle_new_user()`) that runs automatically when a user signs up:

1. User signs in with Google
2. Supabase creates auth user
3. Database trigger fires
4. Profile is created in `profiles` table
5. User role is assigned in `user_roles` table
6. If email exists in `admins` table, admin role is also assigned

**This is already working!** The edge functions provide an alternative/enhanced approach.

### Enhanced Setup (Edge Functions)

Edge functions provide more flexibility:

1. Can make external API calls
2. Better logging and monitoring
3. Can handle complex business logic
4. Easier to test and debug

## Deployment Instructions

### Step 1: Install Supabase CLI

```powershell
npm install -g supabase
```

### Step 2: Login and Link Project

```powershell
# Login to Supabase
supabase login

# Link your project (replace YOUR_PROJECT_REF)
supabase link --project-ref YOUR_PROJECT_REF
```

### Step 3: Deploy Edge Functions

```powershell
# Navigate to project root
cd C:\activity-planner-pro

# Deploy all functions
supabase functions deploy

# Or deploy individually
supabase functions deploy handle-user-signup
supabase functions deploy activity-operations
```

### Step 4: Set Environment Secrets

Get your keys from: https://app.supabase.com/project/YOUR_PROJECT_REF/settings/api

```powershell
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
supabase secrets set SUPABASE_ANON_KEY=your_anon_key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Step 5: Apply Migration (Optional)

```powershell
supabase db push
```

## Using Edge Functions in Your App

### Option 1: Use the React Hook

```typescript
import { useActivityOperations } from "@/hooks/useActivityOperations";

function MyComponent() {
  const { createActivity, isLoading, error } = useActivityOperations();

  const handleCreate = async () => {
    try {
      const result = await createActivity({
        title: "Team Building",
        description: "Fun activity!",
        location: "Office",
        scheduled_at: "2026-02-01T14:00:00Z",
      });
      console.log("Activity created:", result);
    } catch (err) {
      console.error("Error:", err);
    }
  };

  return (
    <button onClick={handleCreate} disabled={isLoading}>
      Create Activity
    </button>
  );
}
```

### Option 2: Call Directly

```typescript
import { supabase } from "@/integrations/supabase/client";

const { data, error } = await supabase.functions.invoke("activity-operations", {
  body: {
    action: "create_activity",
    payload: {
      title: "My Activity",
      description: "Description here",
    },
  },
});
```

## Testing

### Test Signup Flow

1. Sign out of your app
2. Sign in with a new Google account
3. Check that:
   - Profile is created in `profiles` table
   - User role is assigned in `user_roles` table

### Test Activity Operations

Use the `useActivityOperations` hook in your components:

```typescript
// Create activity
const result = await createActivity({
  title: "Test Activity",
  description: "Testing",
});

// Participate in activity
await participateInActivity({
  activity_id: "some-uuid",
  status: "accepted",
});

// Mark leaderboard (admin only)
await markLeaderboard({
  activity_id: "some-uuid",
  user_id: "some-user-uuid",
  rank: 1,
});
```

## Monitoring

### View Logs

```powershell
# View function logs
supabase functions logs handle-user-signup
supabase functions logs activity-operations

# Follow logs in real-time
supabase functions logs activity-operations --follow
```

### Check Function Status

```powershell
supabase functions list
```

## Troubleshooting

### TypeScript Errors in Edge Functions

The TypeScript errors you see in VS Code for the edge functions are expected - they're Deno functions, not Node.js. They will work correctly when deployed.

### Function Not Found

Make sure you've deployed the functions:

```powershell
supabase functions deploy
```

### Authentication Errors

Verify your secrets are set:

```powershell
supabase secrets list
```

### Database Errors

Check that migrations are applied:

```powershell
supabase migration list
supabase db push
```

## What's Next

1. **Deploy the functions** following the steps above
2. **Test the signup flow** to ensure profiles are created
3. **Integrate the activity operations** in your UI components
4. **Monitor logs** to ensure everything works smoothly

## Benefits

✅ **Automatic profile creation** - No more manual profile setup  
✅ **Proper role assignment** - Users and admins get correct roles  
✅ **Activity notifications** - All users notified of new activities  
✅ **Participation tracking** - Activity creators get notified  
✅ **Leaderboard notifications** - Users notified when ranked  
✅ **Better error handling** - Comprehensive logging  
✅ **Scalable architecture** - Easy to add more features

## Support

For more information:

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Deno Documentation](https://deno.land/manual)
- See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment guide
