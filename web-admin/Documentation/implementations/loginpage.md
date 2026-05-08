## Web Admin Login Phase 1 Plan

### Summary

Build a real web-admin authentication flow around the reference design in `web-admin/reference_designs/login/login.html`, using the **current backend JWT login as-is**.

Decisions locked:
- Login uses **username + password**
- Successful login lands in a **protected admin shell**
- No backend auth changes in this phase

### Implementation Changes

#### Frontend app structure
- Convert `web-admin` from the current mixed landing/admin page render into a routed app with:
  - `/login` for the new login page
  - `/admin/overview` as the first protected destination
  - `/admin` redirecting to `/admin/overview`
  - unknown routes redirecting to `/login` if signed out, `/admin/overview` if signed in
- Add `react-router-dom` and introduce a minimal auth layer:
  - auth provider/context for current session state
  - protected route wrapper
  - logout action
- Keep the current `AdminDashboardPage` as the initial protected placeholder page for Phase 1.

#### Login UI
- Rebuild the reference HTML as a proper React login page that preserves:
  - split layout
  - left visual/branding panel on desktop
  - right authentication panel
  - mobile condensed header
  - password visibility toggle
  - remember-me checkbox
  - branded CTA and support/security footer strip
- Adapt the design copy to backend reality:
  - change the main identifier field from **Corporate Email** to **Username**
  - keep the overall visual design and hierarchy otherwise close to the reference
- Keep `Forgot Password` and `Request Admin Access` as **non-functional secondary UI** in Phase 1 so the page does not imply missing live flows.

#### Backend wiring
- Use existing backend endpoints only:
  - `POST /api/auth/login/` with `username` and `password`
  - `POST /api/auth/refresh/`
  - `GET /api/me/`
- After successful token login:
  - store tokens
  - fetch `/api/me/`
  - allow entry only if the returned user is admin-capable (`user.is_admin === true`)
  - if the account is not an admin, clear tokens and show a permission error on the login screen
- Add startup/session bootstrap:
  - on app load, try to restore a saved session
  - if access token is expired but refresh token exists, refresh it
  - if refresh fails, clear session and send user to `/login`
- Add API helper behavior for:
  - auth header injection
  - one retry on 401 via refresh token
  - session clear on refresh failure

#### Session persistence
- Use browser storage with this rule:
  - `Remember Me` checked -> persist tokens in `localStorage`
  - unchecked -> persist tokens in `sessionStorage`
- Persist minimal session metadata only if needed for UX; source of truth remains `/api/me/`.

#### Admin shell behavior
- Replace the current unconditional `LandingPage + AdminDashboardPage` render with auth-aware rendering.
- Protected shell should show:
  - current user name
  - role display
  - logout action
- Phase 1 does not need a full sidebar/navigation framework beyond enough structure to support `/admin/overview`.

### Public Interfaces / Types

- Add a small frontend auth/session contract for:
  - login payload: `{ username, password }`
  - token response: `{ access, refresh }`
  - current admin session model derived from `/api/me/`
- Add env usage:
  - continue using `VITE_API_BASE_URL`
- No backend API shape changes in this plan.

### Test Plan

- Render tests / manual acceptance for:
  - desktop login layout matches the reference structure
  - mobile login layout collapses correctly
  - password visibility toggle works
  - remember-me checkbox changes storage target
- Auth flow scenarios:
  - valid admin credentials -> redirect to `/admin/overview`
  - invalid credentials -> inline error message on login page
  - valid non-admin credentials -> access denied message and no session retained
  - expired access token + valid refresh token -> session restored
  - expired access token + invalid refresh token -> redirected to `/login`
  - direct visit to `/admin/overview` while signed out -> redirected to `/login`
  - direct visit to `/login` while already signed in -> redirected to `/admin/overview`
  - logout clears tokens and returns to `/login`
- Build check:
  - web-admin TypeScript/build passes after router/auth additions

### Assumptions And Defaults

- The current backend JWT login endpoint remains unchanged and uses `username`.
- `/api/me/` is the frontend authority for deciding whether a signed-in user may enter the admin console.
- Phase 1 does not implement forgot-password or admin-access-request flows from the web admin.
- The existing `AdminDashboardPage` acts as the first protected destination until the broader Phase 1 admin modules are built.
