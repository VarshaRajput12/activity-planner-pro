# User Role System Restructuring

## Overview

The user role system has been restructured to simplify role management by storing roles directly in the `profiles` table instead of maintaining a separate `admins` table and per-user role entries.

## Changes Made

### Database Schema Changes

#### 1. New `user_roles` Table Structure

- **Before**: Each user had individual role entries in `user_roles` table
- **After**: `user_roles` is now a lookup table with exactly 2 predefined roles:
  - **User**: `00000000-0000-0000-0000-000000000001`
  - **Admin**: `00000000-0000-0000-0000-000000000002`

#### 2. Updated `profiles` Table

- **New Column**: `role_id` (UUID, NOT NULL)
- **Foreign Key**: References `user_roles.id`
- **Default**: Set to User role (`00000000-0000-0000-0000-000000000001`)
- Users can now have their role directly in their profile

#### 3. Removed Tables

- **`admins` table**: Completely removed (no longer needed)

### Migration File

Location: `supabase/migrations/20260116120000_restructure_user_roles.sql`

The migration automatically:

1. Creates new role lookup structure
2. Migrates existing data from old `user_roles` to new `profiles.role_id`
3. Preserves admin status for users who had admin role
4. Drops old `user_roles` and `admins` tables
5. Updates all functions and policies

### Updated Functions

#### `is_admin(_user_id UUID)`

```sql
-- Now checks profiles.role_id instead of admins table
SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id
    AND role_id = '00000000-0000-0000-0000-000000000002'
)
```

#### `has_role_by_name(_user_id UUID, _role_name TEXT)` (NEW)

```sql
-- New function to check role by name
SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles r ON p.role_id = r.id
    WHERE p.id = _user_id AND r.name = _role_name
)
```

#### `get_user_role(_user_id UUID)` (NEW)

```sql
-- Returns role name ('Admin' or 'User')
SELECT r.name
FROM public.profiles p
JOIN public.user_roles r ON p.role_id = r.id
WHERE p.id = _user_id
```

#### `handle_new_user()`

Updated to assign default User role via `role_id` in profile creation:

```sql
INSERT INTO public.profiles (id, email, full_name, avatar_url, role_id)
VALUES (
    NEW.id,
    NEW.email,
    ...,
    '00000000-0000-0000-0000-000000000001' -- Default User role
)
```

### TypeScript Type Updates

#### Updated Types (`src/types/database.ts`)

```typescript
// Updated AppRole to match new role names
export type AppRole = "Admin" | "User";

// UserRole is now a lookup table type
export interface UserRole {
  id: string;
  name: AppRole;
  created_at: string;
}

// Profile now includes role_id (optional for backward compatibility)
export interface Profile extends ProfileBase {
  role_id?: string; // Optional until migration is applied
  created_at: string;
  updated_at: string;
  role?: UserRole; // Optional joined data
}

// Removed: Admin interface (no longer needed)
```

**Note**: `role_id` is marked optional for backward compatibility. After applying the migration, you can make it required by changing `role_id?:` to `role_id:` in the type definition.

### Frontend Updates

#### AuthContext (`src/contexts/AuthContext.tsx`)

- **Removed**: `roles` state array
- **Simplified**: `isAdmin` now checks `profile.role_id` directly

```typescript
const isAdmin = profile?.role_id === "00000000-0000-0000-0000-000000000002";
```

- Profile fetch now joins role data:

```typescript
.select(`
  *,
  role:user_roles(id, name)
`)
```

#### ManageUsers Page (`src/pages/admin/ManageUsers.tsx`)

Completely rewritten to:

- Remove "Add Admin by Email" functionality
- Use direct role toggle for existing users
- Show admin users in a separate section
- Allow changing any user's role between Admin and User
- Prevent users from changing their own role

#### Edge Function (`supabase/functions/handle-user-signup/index.ts`)

- Removed admin email checking logic
- Simplified to always create users with default User role
- Admin promotion must now be done through ManageUsers UI

## How to Use

### Making a User an Admin

1. Navigate to Admin Dashboard → Manage Users
2. Find the user in the "All Users" table
3. Click the role change button (UserCog icon)
4. Confirm the role change

### Removing Admin Privileges

1. Same process as above
2. Current user cannot change their own role (safety measure)

### For New Signups

- All new users automatically get "User" role
- Admins must manually promote users to Admin role through the UI

## Role IDs Reference

```typescript
const ROLE_IDS = {
  USER: "00000000-0000-0000-0000-000000000001",
  ADMIN: "00000000-0000-0000-0000-000000000002",
};
```

## Benefits of New Structure

1. **Simpler Schema**: No more separate `admins` table to maintain
2. **Single Source of Truth**: Role is directly in profile table
3. **Better Performance**: No need to join multiple tables to check role
4. **Easier Management**: Direct UI-based role changes
5. **Type Safety**: Stronger TypeScript typing with defined role structure
6. **Scalability**: Easy to add more roles in future if needed

## Migration Path

The migration handles all data migration automatically:

1. Backs up existing role data
2. Creates new structure
3. Migrates all user roles
4. Updates all functions and policies
5. Cleans up old tables

**No manual data migration required!**

## Testing Checklist

After applying migration:

- [ ] Verify existing admins still have admin access
- [ ] Verify existing users have user role
- [ ] Test creating new user (should default to User role)
- [ ] Test changing user role in ManageUsers page
- [ ] Verify admin permissions (create activities, manage users, etc.)
- [ ] Verify user permissions (cannot access admin features)
- [ ] Check that users cannot change their own role

## Rollback Plan

If you need to rollback, you would need to:

1. Create reverse migration recreating `admins` table
2. Restore role data from profiles to separate tables
3. Update functions back to old structure

However, it's recommended to test thoroughly in development first.
