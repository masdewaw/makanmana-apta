# Admin account recovery

The owner account `085172459708@makanmana.com` was matched to Dewa before provisioning. Only this account was explicitly granted `app_metadata.makanmana_admin = true`. It remains a normal `profiles.role = user` account for ordering. The permission is not inferred from a name, phone number, OB role, editable `user_metadata`, or client state. It is not added automatically by a migration on a fresh project.

## User flow

After deploying the frontend, the owner signs in and opens Pengaturan → Kelola pengguna. The table shows names and phone numbers, supports server-side search and pages of 20, and excludes admin accounts from the reset action. A confirmation identifies the selected account before resetting it. There is no bulk reset.

The Edge Function sets the requested temporary password `makanmana2026`, marks `app_metadata.must_change_password = true`, records an audit operation, and revokes all target sessions. Share the temporary password privately with the verified account owner. Because this is a shared temporary password, reset only on request and ask the owner to change it immediately.

The next login is gated before dashboards and onboarding. The user must choose a different password of 8–128 characters through the authenticated change action. All sessions are revoked again and the user signs in with the new password. Existing order data is preserved.

## Authorization and backend

- Function: `admin-users`, source in `supabase/functions/admin-users`.
- SDK version is pinned. Service credentials remain in Edge Function environment only.
- Gateway JWT verification is disabled to let the handler verify tokens itself with Auth `getUser(token)`. Every request additionally validates its `session_id` against `auth.sessions` through a service-only RPC. Missing, invalid, or revoked sessions are rejected.
- Listing/reset requires fresh server-side `app_metadata.makanmana_admin = true` and no pending mandatory change. Both the handler and reservation RPC check admin reset authorization.
- A reset cannot target the actor or another admin. Confirmation phone must match the current Auth account. The mandatory change always targets the caller, never a supplied user ID.
- Operation IDs, database reservation locks, a two-minute pending-operation lease, one reset per target per minute, and 30 resets per actor per ten minutes protect against concurrent/repeated clicks.
- `admin_password_jobs` holds actor/target IDs, action, status and timestamps, never passwords. No authenticated/anonymous role can read/write it. Privileged list/reservation/finalization/session RPCs are executable only by `service_role`; privileged implementations live in `private`.
- `account_access()` exposes only the caller's business role, admin flag, and mandatory-change flag, using a live session check.
- Restrictive RLS policies gate application tables and the payment-proofs bucket using live session existence and the current Auth mandatory-change flag. Revoked JWTs cannot regain ordinary REST access merely because their claims have not expired yet.
- Mutations and uploads continue to require online connectivity. PWA caching does not include function/API responses or passwords.

The existing CLI helper `scripts/reset-password.mjs` is a separate administrative tool and does not implement this UI's audit/mandatory-change flow. Use the application menu for the documented workflow.

## Deployment and verification

Migration `20261106100547_admin_password_management.sql` and Edge Function `admin-users` were applied to project `bcosrhpjzlzqhgmbjkmf` on 6 November 2026. Owner provisioning was a separate explicit operation after identity confirmation. No existing user's password was reset for testing.

Tests:

- `tests/admin-passwords.cjs`: handler authorization, non-admin denial, active sessions, list, target confirmation, own/admin protection, default password and flag, operation reuse, rate limit, partial failure and mandatory changes.
- `supabase/tests/admin_password_management.sql`: real RPC privileges, reservation, temporary-password RLS gate, and session revocation. Fixtures, metadata changes, and session deletion all roll back. No password hashes are modified.
- Existing access-control and per-menu-note SQL tests include transaction-local session fixtures and continue to pass.
- Live anonymous `POST /functions/v1/admin-users` returned 401.
- Visual QA uses simulated users via `scratch/design-preview.html?screen=admin-users`; simulated reset never invokes Auth Admin APIs.

Frontend must be committed/deployed separately. Check with the owner account after deployment; refresh/re-login if a previously cached frontend is still open. Do not reset a real colleague's password solely to demonstrate the feature.
