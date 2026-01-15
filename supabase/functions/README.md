# Supabase Edge Functions

This directory contains Supabase Edge Functions for the Activity Planner Pro application.

## Available Functions

### 1. handle-user-signup

**Purpose**: Handles new user registration and profile creation.

**Trigger**: Called via database webhook when a new user signs up.

**What it does**:

- Creates a profile entry in the `profiles` table
- Assigns default `user` role
- Checks if email exists in `admins` table and assigns `admin` role if applicable
- Ensures all user data is properly set up

**Endpoint**: `https://your-project-ref.supabase.co/functions/v1/handle-user-signup`

### 2. activity-operations

**Purpose**: Handles complex activity-related operations with proper notifications.

**Trigger**: Called directly from the application.

**Actions**:

- `create_activity`: Creates a new activity and notifies all users
- `participate_in_activity`: Records user participation and notifies activity creator
- `mark_leaderboard`: Marks leaderboard rankings (admin only) and notifies ranked users

**Endpoint**: `https://your-project-ref.supabase.co/functions/v1/activity-operations`

**Usage Example**:

```typescript
const { data, error } = await supabase.functions.invoke("activity-operations", {
  body: {
    action: "create_activity",
    payload: {
      title: "Team Building Event",
      description: "Let's build team spirit!",
      location: "Office Park",
      scheduled_at: "2026-02-01T14:00:00Z",
    },
  },
});
```

## Deployment

### Prerequisites

1. Install Supabase CLI:

```bash
npm install -g supabase
```

2. Login to Supabase:

```bash
supabase login
```

3. Link your project:

```bash
supabase link --project-ref your-project-ref
```

### Deploy Functions

Deploy all functions:

```bash
supabase functions deploy
```

Deploy a specific function:

```bash
supabase functions deploy handle-user-signup
supabase functions deploy activity-operations
```

### Set Secrets

Set required environment variables:

```bash
supabase secrets set SUPABASE_URL=your-supabase-url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
supabase secrets set SUPABASE_ANON_KEY=your-anon-key
```

## Local Testing

### Start Supabase locally:

```bash
supabase start
```

### Serve functions locally:

```bash
supabase functions serve
```

### Test the handle-user-signup function:

```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/handle-user-signup' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"type":"INSERT","table":"users","record":{"id":"test-uuid","email":"test@example.com"}}'
```

### Test the activity-operations function:

```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/activity-operations' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"action":"create_activity","payload":{"title":"Test Activity","description":"Testing"}}'
```

## Database Integration

The `handle-user-signup` function works in conjunction with the database trigger in the migration files. You can choose to use:

1. **Direct Database Trigger** (Current default): Handles profile creation directly in PostgreSQL
2. **Edge Function Webhook**: More flexible, allows for external API calls and complex logic

To switch to using the edge function webhook, run the migration and uncomment the webhook trigger in `20260115120000_add_edge_function_webhook.sql`.

## Troubleshooting

### Check function logs:

```bash
supabase functions logs handle-user-signup
supabase functions logs activity-operations
```

### Common Issues:

1. **Authentication errors**: Ensure secrets are set correctly
2. **CORS errors**: Check that corsHeaders are properly configured
3. **Database errors**: Verify RLS policies allow the operations

## Security

- Functions use service role key for database operations requiring elevated privileges
- User authentication is verified for client-facing operations
- RLS policies are still enforced at the database level
- Sensitive operations (like marking leaderboard) verify admin status

## Best Practices

1. Always handle errors gracefully
2. Log important operations for debugging
3. Use service role key only when necessary
4. Validate input data before processing
5. Keep functions focused on a single responsibility
