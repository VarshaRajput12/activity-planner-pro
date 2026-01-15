# Deployment Guide for Edge Functions

## Prerequisites

1. **Install Supabase CLI** (if not already installed):

```powershell
npm install -g supabase
```

2. **Login to Supabase**:

```powershell
supabase login
```

3. **Link your project** (replace with your project ref):

```powershell
supabase link --project-ref YOUR_PROJECT_REF
```

## Quick Deployment Steps

### Step 1: Deploy the Edge Functions

Deploy all functions at once:

```powershell
cd supabase
supabase functions deploy
```

Or deploy individually:

```powershell
supabase functions deploy handle-user-signup
supabase functions deploy activity-operations
```

### Step 2: Set Environment Secrets

Set the required secrets for your edge functions:

```powershell
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
supabase secrets set SUPABASE_ANON_KEY=your_anon_key_here
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

You can find these values in your Supabase Dashboard under Settings > API.

### Step 3: Apply Database Migrations

Push the new migration to your database:

```powershell
cd ..
supabase db push
```

Or if you have the Supabase CLI linked:

```powershell
supabase migration up
```

### Step 4: Verify Deployment

Check if functions are deployed:

```powershell
supabase functions list
```

Test the functions using curl or your application.

## Testing Locally

### Start Supabase locally:

```powershell
supabase start
```

### Serve functions locally:

```powershell
cd supabase
supabase functions serve
```

### Test locally:

```powershell
# Test handle-user-signup
curl -i --location --request POST 'http://localhost:54321/functions/v1/handle-user-signup' `
  --header 'Authorization: Bearer YOUR_LOCAL_ANON_KEY' `
  --header 'Content-Type: application/json' `
  --data '{\"type\":\"INSERT\",\"table\":\"users\",\"record\":{\"id\":\"test-uuid\",\"email\":\"test@example.com\"}}'

# Test activity-operations
curl -i --location --request POST 'http://localhost:54321/functions/v1/activity-operations' `
  --header 'Authorization: Bearer YOUR_LOCAL_ANON_KEY' `
  --header 'Content-Type: application/json' `
  --data '{\"action\":\"create_activity\",\"payload\":{\"title\":\"Test Activity\",\"description\":\"Testing\"}}'
```

## Monitoring

View function logs:

```powershell
# View recent logs
supabase functions logs handle-user-signup
supabase functions logs activity-operations

# Follow logs in real-time
supabase functions logs handle-user-signup --follow
```

## Troubleshooting

### Issue: Functions not found

- Ensure you've deployed the functions: `supabase functions deploy`
- Check function list: `supabase functions list`

### Issue: Authentication errors

- Verify secrets are set correctly: `supabase secrets list`
- Ensure you're using the correct API keys

### Issue: Database connection errors

- Check that migrations are applied: `supabase migration list`
- Verify RLS policies are configured correctly

### Issue: CORS errors

- Ensure corsHeaders are properly configured in the function
- Check that your application URL is allowed

## Production Checklist

- [ ] Deploy all edge functions
- [ ] Set all required secrets
- [ ] Apply database migrations
- [ ] Test signup flow
- [ ] Test activity operations
- [ ] Verify notifications are working
- [ ] Check function logs for errors
- [ ] Set up monitoring/alerting (optional)

## Rollback

If you need to rollback:

1. **Remove edge function trigger** (if enabled):

```sql
DROP TRIGGER IF EXISTS on_auth_user_created_webhook ON auth.users;
```

2. **Revert to database trigger**:
   The original `handle_new_user()` function and trigger are still in place and will continue to work.

## Additional Resources

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Deno Documentation](https://deno.land/manual)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
