---
phase: 34-performance-optimization
plan: 01
type: user-setup
required_before: middleware fallback can be removed
---

# 34-01 User Setup: Enable Custom Access Token Hook

## What was built

A PostgreSQL function `custom_access_token_hook` was created and applied to the production database.
It injects the user's role (`user_role`) directly into every JWT access token at issue time,
so middleware can read the role without a DB query.

## Required manual step

**Location:** Supabase Dashboard → Authentication → Hooks

**Steps:**

1. Go to https://supabase.com/dashboard/project/vbpzaiqovffpsroxaulv/auth/hooks
2. Find the "Custom Access Token" hook section
3. Click "Enable hook"
4. Select the function: `public.custom_access_token_hook`
5. Save

## What happens when the hook is active

- Every new JWT token issued will contain `user_role` in its claims
- Middleware reads `user_role` directly from `data.claims.user_role` — zero DB queries for role
- Users need to log out and back in (or their token refresh will pick it up automatically within the token TTL)

## What happens if you skip this step

The middleware has a fallback: if `user_role` is not in the JWT claims, it falls back to a DB query on `profiles`.
The app will continue working — just without the performance improvement.

## After confirming the hook works

Once you've verified the hook is active and new JWTs contain `user_role`, remove the fallback block from `middleware.ts`:

```typescript
// REMOVE this block once hook is confirmed working:
if (!userRole) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.sub)
    .single();
  userRole = profile?.role ?? undefined;
}
```

## Verification

After enabling the hook and logging in with a fresh session, you can verify the JWT contains `user_role` by decoding the access token at https://jwt.io.
