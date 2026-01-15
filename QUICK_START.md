# 🚀 Quick Start - Edge Functions

## What You Got

✅ **2 Edge Functions:**

- `handle-user-signup` - Auto-creates profiles when users sign up
- `activity-operations` - Handles activities, participation, and leaderboards with notifications

✅ **Database Migration:**

- Optional webhook support for edge functions

✅ **React Hook:**

- `useActivityOperations` - Easy-to-use hook for your components

## Deploy in 3 Steps

### 1️⃣ Deploy Functions

```powershell
cd C:\activity-planner-pro
supabase functions deploy
```

### 2️⃣ Set Secrets

```powershell
supabase secrets set SUPABASE_URL=https://YOUR_REF.supabase.co
supabase secrets set SUPABASE_ANON_KEY=your_key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_key
```

### 3️⃣ Push Migration

```powershell
supabase db push
```

## ✅ What Works Now

### User Signup (Already Working!)

Your existing database trigger already handles:

- ✅ Profile creation
- ✅ Role assignment
- ✅ Admin detection

The edge function provides an alternative with more flexibility.

### Activity Operations (New Feature!)

Use in your React components:

```typescript
import { useActivityOperations } from "@/hooks/useActivityOperations";

function YourComponent() {
  const { createActivity, participateInActivity, markLeaderboard } =
    useActivityOperations();

  // Create activity with automatic notifications
  await createActivity({
    title: "Team Building",
    description: "Fun!",
    scheduled_at: "2026-02-01T14:00:00Z",
  });
}
```

## 📊 Key Benefits

1. **Automatic Notifications** - Users get notified about activities
2. **Smart Participation** - Creators notified when users respond
3. **Leaderboard Alerts** - Users notified when ranked
4. **Better Logging** - Track everything that happens
5. **Scalable** - Easy to add more features

## 📚 Full Documentation

- [EDGE_FUNCTIONS_GUIDE.md](./EDGE_FUNCTIONS_GUIDE.md) - Complete setup guide
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed deployment instructions
- [supabase/functions/README.md](./supabase/functions/README.md) - Function documentation

## 🆘 Need Help?

```powershell
# View logs
supabase functions logs activity-operations

# Check status
supabase functions list

# Test locally
supabase functions serve
```

## 🎯 Next Steps

1. ✅ Deploy the functions
2. ✅ Test signup flow
3. ✅ Use `useActivityOperations` in your UI
4. ✅ Monitor logs

That's it! Your edge functions are ready to use! 🎉
