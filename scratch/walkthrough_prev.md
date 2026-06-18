# Walkthrough - Calendar Dynamic Hours & Injury Master Data Seeding

I have implemented solutions for both of your requests. Standardizing the clinical database is now fully resolved and the calendar timeline constraints are dynamic.

---

## 1. Admin Calendar Dynamic Hours (June 5th Issue Resolved)

### Problem
The Month view displayed a 5:00 AM appointment on June 5, 2026, but the Week view grid was constrained to standard hours (8:00 AM - 8:00 PM), hiding it.

### Solution
- Added a `calendarHoursRange` memo in [AdminCalendar.tsx](file:///d:/Sports_Physio_Software/sports-health-hub-main/src/pages/admin/AdminCalendar.tsx) to determine boundaries dynamically:
  - Default view range is set to standard hours of **8:00 AM to 8:00 PM**.
  - If any scheduled appointment within the active view range (Day or Week) starts before 8:00 AM or ends after 8:00 PM, the start (`minHour`) and end (`maxHour`) bounds are adjusted to fit the earliest and latest session.
- Updated the `timeSlots` memo and `timeToY` positioning helper to dynamically use the `minHour` and `maxHour` values instead of hardcoded 8:00 AM to 8:00 PM range.
- Refactored the `hours` array in `renderWeekView` and modified event filter boundary checks so early morning sessions are correctly rendered.

---

## 2. Injury Master Data Dropdowns & Excel Upload

### Problem
The **Log New Injury** modal dropdowns (Body Region, Injury Type, Diagnosis) were empty because there was no data loaded for the active organization in the local PostgreSQL database.

### Solutions Developed

#### A. Persistent Global Injury Data (Out-of-the-Box Population)
- **Nullable constraints & unique indexes**: Updated `injury_master_data` schema in [db.js](file:///d:/Sports_Physio_Software/sports-health-hub-main/server/db.js) to drop the `NOT NULL` constraint on `organization_id`. We added separate unique conditional indexes to allow duplicate rules across orgs but enforce strict uniqueness for global (`organization_id IS NULL`) and org-specific entries (`organization_id IS NOT NULL`).
- **Global Seeding**: On database initialization, the backend checks if global records are present. If empty, it reads the 999 standard clinical injury entries from `supabase/seed_global_injuries.sql` and loads them into PostgreSQL with `NULL` as the `organization_id`.
- **Query Fallback**: Modified the master-data GET endpoints in [clinical.js](file:///d:/Sports_Physio_Software/sports-health-hub-main/server/clinical.js) (`/clinical/master-data/regions`, `/clinical/master-data/types`, `/clinical/master-data/diagnoses`) to fetch entries where `organization_id = $1 OR organization_id IS NULL`.
- *Result*: The dropdowns are now automatically pre-populated with standard regions, types, and diagnoses without the administrator needing to upload anything.

#### B. Organization-Specific Custom Injury Upload (Clinic Admin Settings)
- **Admin Settings Link**: Added a new **Injury Master Data** management card under Clinical Settings in [AdminSettings.tsx](file:///d:/Sports_Physio_Software/sports-health-hub-main/src/pages/admin/AdminSettings.tsx).
- **Dedicated Management Component**: Created [AdminInjuries.tsx](file:///d:/Sports_Physio_Software/sports-health-hub-main/src/pages/admin/AdminInjuries.tsx) linked to `/admin/settings/injuries` in [App.tsx](file:///d:/Sports_Physio_Software/sports-health-hub-main/src/App.tsx). This allows regular clinic administrators to:
  - Download template Excel files containing headers (`Region`, `Injury Type`, `Diagnosis`).
  - Upload Excel sheets to import custom classifications.
  - Delete/Clear organization-specific custom classifications.
- **Backend Endpoints**: Added `/master-data/upload`, `/master-data/list`, and `/master-data/clear` API handlers under [clinical.js](file:///d:/Sports_Physio_Software/sports-health-hub-main/server/clinical.js) to process these requests for authenticated clinic admins.

---

## 3. Verification & Build Results

- **Compilation Check**: Executed `npm run build` which successfully completed without any errors or warnings.
- **Automatic Seed Verification**: On startup, the local PG server log outputted:
  ```
  [DB] Seeding global injury master data...
  [DB] Global injury master data seeded successfully.
  ```
  Confirming that the database is populated.

### 4. Express Payload Size Limit Fix
- **Problem**: When uploading larger custom lists, Express threw `PayloadTooLargeError: request entity too large` (standard limit is 100KB).
- **Resolution**: Updated [server.js](file:///d:/Sports_Physio_Software/sports-health-hub-main/server/server.js) to configure the body parser with a `50mb` limit for both JSON and urlencoded requests:
  ```javascript
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  ```
  This resolves the upload crash and allows large Excel tables to import successfully.

---

## 5. Unique Constraint Conflict & Global Seeding Mismatch Fix

### Problem
When custom Excel sheets were uploaded, or when the super admin uploaded rules via the master console, the server crashed with:
`Error uploading injuries: error: there is no unique or exclusion constraint matching the ON CONFLICT specification` or duplicate constraint errors if `organization_id` was `null` or if unique indexes were mismatched.

### Solution
- Refactored the bulk upload queries in [clinical.js](file:///d:/Sports_Physio_Software/sports-health-hub-main/server/clinical.js) and [masterConsole.js](file:///d:/Sports_Physio_Software/sports-health-hub-main/server/masterConsole.js) from the database `ON CONFLICT` clause to a **Check-Then-Insert** pattern.
- This pattern first queries the database using a parameterized SELECT statement to check if the specific combination of `(organization_id, region, injury_type, diagnosis)` exists (correctly handling both `NULL` global entries and `non-NULL` tenant-specific entries).
- If it does not exist, the row is inserted. This avoids all Postgres compile-time index matching failures and ensures duplicate rows are skipped gracefully.

---

## 6. Staff Admin Calendar Access Control

### Problem
The user wanted to restrict the Admin Calendar visibility, granting access only to selected staff members and allowing instant revocation by the administrator.

### Solution
- **Database Migration**: Added the `has_calendar_access` boolean column (`DEFAULT FALSE`) to the `profiles` table in [db.js](file:///d:/Sports_Physio_Software/sports-health-hub-main/server/db.js).
- **Backend Access Updates**: Extended `/users/:id/role` API in [hr.js](file:///d:/Sports_Physio_Software/sports-health-hub-main/server/hr.js) to accept `has_calendar_access` and update the profiles table, with strict server-side authorization ensuring only administrators can toggle this.
- **Frontend Authorization Guard**: Added a `checkCalendarAccess` evaluation step to the [ProtectedRoute.tsx](file:///d:/Sports_Physio_Software/sports-health-hub-main/src/components/auth/ProtectedRoute.tsx) component. This blocks direct URL navigation to `/admin/calendar` for any non-admin staff member unless explicitly granted.
- **Dynamic Sidebar Navigation**: Refactored the [AppSidebar.tsx](file:///d:/Sports_Physio_Software/sports-health-hub-main/src/components/layout/AppSidebar.tsx) component. It now dynamically injects or hides the "Admin Calendar" sidebar link depending on whether the user's role or custom permission grants access.
- **Management UI**: Activated the "Roles & Permissions" card in [AdminSettings.tsx](file:///d:/Sports_Physio_Software/sports-health-hub-main/src/pages/admin/AdminSettings.tsx) and built a fully polished [AdminPermissions.tsx](file:///d:/Sports_Physio_Software/sports-health-hub-main/src/pages/admin/AdminPermissions.tsx) control page displaying all organization staff with search, categorizations, and interactive switch toggles.
- **Vite Build Validation**: Ran `npm run build` which successfully completed without any errors or warnings.

---

## 7. Modern Translucent Scrollbars

### Problem
The default browser scrollbar on the side menu was thick and boxy, clashing with the modern dark sidebar aesthetic.

### Solution
- Added global custom scrollbar styling rules to [index.css](file:///d:/Sports_Physio_Software/sports-health-hub-main/src/index.css).
- Configured a transparent scrollbar track and a thin, rounded scrollbar thumb using a translucent slate color (`rgba(148, 163, 184, 0.2)`).
- Used a solid transparent border trick with `background-clip: padding-box` to create built-in padding so the thumb doesn't touch the edges.
- Added Firefox fallbacks (`scrollbar-width: thin`) to ensure cross-browser compatibility.
- This creates sleek, modern, floating scrollbars that automatically blend with the background of any scroll container (both light and dark areas) globally across the entire app.
