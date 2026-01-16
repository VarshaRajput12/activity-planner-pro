# User Role Migration Deployment Checklist

## Pre-Migration Steps

### 1. Backup Database

```bash
# Using Supabase CLI
supabase db dump -f backup_before_role_migration.sql

# Or from Supabase Dashboard:
# Settings → Database → Database Backups
```

### 2. Test in Development First

```bash
# Reset local database
supabase db reset

# Migration should run automatically
# Verify everything works locally first
```

### 3. Review Current State

- Note down current admin user emails
- Verify all admin emails are in the `admins` table
- Check that all users have appropriate entries in `user_roles` table

## Migration Deployment

### 1. Apply Migration

```bash
# Push migration to Supabase
supabase db push

# Or using migrations directly:
supabase migration up
```

### 2. Verify Migration Success

```sql
-- Check user_roles table structure (should have 2 rows)
SELECT * FROM public.user_roles;
-- Expected: 2 rows with 'User' and 'Admin'

-- Check profiles have role_id
SELECT id, email, role_id FROM public.profiles LIMIT 5;
-- All should have role_id populated

-- Verify admins table is gone
SELECT * FROM public.admins;
-- Should error: "relation does not exist"

-- Check is_admin function
SELECT public.is_admin('<some_admin_user_id>');
-- Should return true for admins
```

## Post-Migration Steps

### 1. Test Admin Functionality

- [ ] Login as admin user
- [ ] Verify admin dashboard access
- [ ] Check "Manage Users" page loads
- [ ] Test creating an activity
- [ ] Test managing polls

### 2. Test User Functionality

- [ ] Login as regular user
- [ ] Verify no access to admin pages
- [ ] Check user can vote on polls
- [ ] Verify user can respond to activities

### 3. Test Role Changes

- [ ] Admin → Change a user to admin role
- [ ] Verify changed user gets admin access
- [ ] Admin → Change an admin to user role
- [ ] Verify changed user loses admin access
- [ ] Verify cannot change own role

### 4. Update Frontend Code (Optional)

After verifying migration works, you can:

**In `src/contexts/AuthContext.tsx`:**

```typescript
// Uncomment to enable role join (optional, not required for functionality)
.select(`
  *,
  role:user_roles(id, name)
`)
```

**In `src/pages/admin/ManageUsers.tsx`:**

```typescript
// Uncomment to enable role join
.select(`
  *,
  role:user_roles(id, name)
`)
```

**In `src/types/database.ts`:**

```typescript
// Change from optional to required after migration
role_id: string; // Remove the '?'
```

### 5. Update Edge Function

The handle-user-signup edge function has been updated to use the new structure. Deploy it:

```bash
# Deploy edge function
supabase functions deploy handle-user-signup
```

### 6. Test New User Signup

- [ ] Create a new test user account
- [ ] Verify user is created with default "User" role
- [ ] Verify user does not have admin access
- [ ] Promote new user to admin via ManageUsers page
- [ ] Verify new user now has admin access

## Rollback Plan

If something goes wrong:

### 1. Restore from Backup

```bash
# Restore from backup
psql <connection_string> < backup_before_role_migration.sql
```

### 2. Or Create Reverse Migration

Create a new migration file that:

- Recreates `admins` table
- Recreates old `user_roles` structure
- Populates `admins` table from profiles with Admin role
- Restores old functions and policies

## Common Issues & Solutions

### Issue: Migration fails with constraint error

**Solution**: Check for orphaned records in user_roles that reference non-existent profiles

```sql
-- Find orphaned records
SELECT ur.* FROM public.user_roles ur
LEFT JOIN public.profiles p ON p.id = ur.user_id
WHERE p.id IS NULL;

-- Delete them before re-running migration
DELETE FROM public.user_roles
WHERE user_id NOT IN (SELECT id FROM public.profiles);
```

### Issue: Some admins lost access

**Solution**: Manually update their role_id

```sql
-- Find the admin
SELECT id, email, role_id FROM public.profiles WHERE email = 'admin@example.com';

-- Set to admin role
UPDATE public.profiles
SET role_id = '00000000-0000-0000-0000-000000000002'
WHERE email = 'admin@example.com';
```

### Issue: New users not getting default role

**Solution**: Check the handle_new_user trigger is active

```sql
-- Verify trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Re-create if missing
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Success Criteria

✅ All existing admins retain admin access
✅ All existing users have user role  
✅ New users created with User role by default
✅ Role changes work through ManageUsers UI
✅ Admin permissions work (create activities, manage users)
✅ User permissions enforced (no admin access)
✅ is_admin() function returns correct values
✅ No errors in application logs
✅ Edge functions work correctly

## Need Help?

If you encounter issues:

1. Check Supabase logs in Dashboard → Logs
2. Check browser console for frontend errors
3. Run SQL queries above to diagnose database state
4. Restore from backup if needed
5. Test fixes in development environment first
