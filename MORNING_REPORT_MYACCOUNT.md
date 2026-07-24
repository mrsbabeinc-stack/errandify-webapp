# Morning Report — MyAccount mobile audit

**Date:** 2026-07-24 (overnight)
**Scope you gave me:** "seriously check all tabs of my account, especially theme and alignment" + the 8 screenshots. Mobile format only — desktop left untouched.
**Branch:** `admin-system-v1` (also fast-forwarded to `main`, both pushed to GitHub).

---

## TL;DR

Every one of the 8 MyAccount tabs had the **same root bug**: the tab-navigation grid was `sticky`, so while you scrolled, it pinned itself 80px down and the tab's own content slid *underneath* it — which read as "the tabs are overlapping my cards." One fix cleared all 8 tabs. On top of that I fixed the broken **Categories** tab, the **Home** role-switcher overflow, content hidden behind the **+ button / Hana avatar**, and a date-field overflow. All verified in the browser at phone widths; the frontend builds clean.

---

## What was wrong, and what I did

### 1. Tab grid overlapping the content (all 8 tabs) — **fixed**
- **Cause:** the 4×2 tab grid (MyHub … My Availability) was `sticky top-20 z-40`. Mid-scroll it pinned near the top and the card content scrolled under it.
- **Fix:** the grid is now static (scrolls with the page) on phones; it stays `sticky` from `md` (≥768px) up, so desktop is unchanged.
- **File:** `frontend/src/pages/MyAccountPage.tsx`

### 2. Categories tab badly broken — **fixed**
- **Cause:** two columns ("I Can Help" / "I Need Help") were forced side-by-side, each holding a 4-wide grid of **48px emoji with no labels** (the name only appeared on hover, which never fires on a touchscreen). Result: giant unlabelled emoji overflowing two cramped columns.
- **Fix (phones only):** the two sections now **stack full-width**; emoji shrank to a sensible size; and every category now shows its **name under the emoji** (Home Maintenance, Cleaning & Laundry, …). Desktop keeps the original two-column + hover-tooltip layout.
- **File:** `frontend/src/pages/MyAccountPage.tsx`

### 3. Content hidden behind the + button and Hana avatar — **fixed**
- **Cause:** the floating **+** (FAB) sticks up to ~106px and Hana floats at ~96px, but the page only reserved 80px at the bottom — so the last rows of each tab (Refer & Earn text, transaction rows, the profile card) sat behind them.
- **Fix:** increased the page's bottom clearance (pb-20 → pb-28) so content clears the nav + FAB.
- **Note:** Hana is a floating assistant button, so by design she still hovers over the page while you scroll (like every chat bubble). She no longer traps the *last* content. If you'd rather she be smaller or tuck away on scroll, say so and I'll do it.
- **File:** `frontend/src/pages/MyAccountPage.tsx`

### 4. Home page role-switcher overflow (Admin hidden under Logout) — **fixed**
- **Cause (your circled screenshot):** the top bar centred the role toggle while the logo and Logout were absolutely positioned over the sides. For an **admin** user the 3rd button (⚙️ Admin) widened the toggle until it slid under Logout.
- **Fix:** below `md`, the logo / toggle / Logout now sit in normal flow (`justify-between`) so nothing can overlap, and the toggle scrolls within its own slot if ever too wide; the role pills are also more compact on phones. From `md` up the original absolute-centred layout is restored **exactly** (verified: switcher centre = viewport centre at 1280px, full-size buttons, logo/Logout at the edges).
- **Files:** `frontend/src/components/Layout.tsx`, `frontend/src/components/RoleToggle.tsx`

### 5. "Date Range" fields overflowing (My Availability) — **fixed**
- **Cause:** two native date inputs in a 2-column grid wouldn't shrink (grid items default to `min-width:auto`), so the right one spilled ~6px off-screen.
- **Fix:** added `min-width:0` + `box-sizing:border-box` so they fit.
- **File:** `frontend/src/components/StaffLeaveApplication.tsx`

---

## Verified in-browser (390px phone), tab by tab

| Tab | Result |
|-----|--------|
| MyHub | ✅ tabs above content, ID/People-Love/stats all visible |
| MyProfile | ✅ profile card fully visible, clears the FAB (was covered), 4.8 no longer clipped |
| MyPocket | ✅ wallet + activity list clean, on theme |
| MyRewardSpace | ✅ points/redeem cards clean; sub-tabs scroll in their own strip |
| MySafetyCentre | ✅ resource cards aligned *(see theme note below)* |
| Notifications | ✅ Critical/Important/Optional toggles aligned |
| Categories | ✅ **rebuilt** — full-width, labelled, no overflow |
| My Availability | ✅ Date Range + form fully visible, no overlap |

Every tab: **0 horizontal page overflow** at 320 / 390 / 430px. Frontend builds clean (`npm run build` ✓).

---

## Two things for you to decide (not bugs)

1. **MySafetyCentre uses blue/green accents**, not the orange theme (blue "All Services" chip, blue "Copy", green "Call"). For an emergency-resources section this is arguably intentional (trust/urgency colours, deliberately distinct from the commercial orange), so I **left it as-is**. If you want it on-theme orange, I'll switch it.
2. **Hana avatar** floats over content by design (see #3). Happy to shrink her or auto-hide on scroll if she's in the way.

## What I could NOT fully reproduce
- The **admin 3-button** role-switcher (your screenshot 1) — my test session is a company-owner account with no admin role, so I couldn't render the ⚙️ Admin button locally. The fix is structural (in-flow layout + compact buttons + scrollable slot) and I verified the 2-button case and the desktop case; the admin case should now sit in the row without overlapping Logout. **Please eyeball it on your admin login** and tell me if anything's still tight.

---

## Commit
`fix(mobile): MyAccount tabs — un-stick tab grid, rebuild Categories, clear FAB overlap, Home role-switcher` — pushed to `admin-system-v1` and `main`.
