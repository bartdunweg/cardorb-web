# Supabase, what the repo cannot show

Project `fprjroupecdhosfdrqhv` (eu-west-1). The policies and grants below live in the database,
not in git, so this file records them; verify with `supabase db query --linked --project-ref
fprjroupecdhosfdrqhv "<sql>"` rather than trusting it.

## Row level security

- `cards`: SELECT allowed for the owner (`user_id = auth.uid()`) or when the owner's profile
  `is_public`; INSERT/UPDATE/DELETE for the owner only.
- `collections`, `profiles`: per user; `profiles` readable when `is_public` or own.

## Column grants on `cards` (applied 2026-09-02)

The `anon` role has no table-level SELECT on `cards`. It holds column-level SELECT on exactly the
public columns: `id, name, set_name, number, rarity, gen, types, quantity, finish, image_url,
tcg_id, user_id, owned, wishlist`. So a public profile's cards are readable without a session, but
`purchase_price`, `purchase_date`, `acquired_at`, `notes`, `condition`, `grade`, `is_favorite`
and `collection_id` are not, whatever a client asks for. `src/lib/public-profile.ts` selects the
same list (`PUBLIC_CARD_COLUMNS`); the two must stay in step, or the public page 500s.

```sql
revoke select on public.cards from anon;
grant select (id, name, set_name, number, rarity, gen, types, quantity, finish, image_url, tcg_id, user_id, owned, wishlist)
  on public.cards to anon;
```

## Storage bucket `avatars`

Public bucket. `allowed_mime_types = {image/jpeg, image/png, image/gif, image/webp}`,
`file_size_limit = 2097152` (2 MB). Object policies tie every path to `auth.uid()` as the first
folder. The client check in `settings-form.tsx` mirrors this; the bucket is the one that holds.

## Functions

`handle_new_user()` and `rls_auto_enable()` are trigger functions with `SECURITY DEFINER`; EXECUTE is
revoked from `public`, `anon` and `authenticated`. `handle_new_user()` is granted to
`supabase_auth_admin`, the role the `auth.users` trigger runs as — without it no signup completes
(found 2026-09-03; cardorb-api#153). `claim_username(citext)` is callable by `authenticated` only.

Every policy reads `auth.uid()` as `(select auth.uid())`, once per query (cardorb-api#153).

## Auth settings still to flip in the dashboard

- Leaked password protection (HaveIBeenPwned check): off. Authentication → Providers → Email.
- Secure password change (require recent sign-in): the app now asks for the current password
  itself, so this is belt and braces.
