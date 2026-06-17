# Homepage Redesign - Warm & Cozy Kampung Style

## Changes Made

### 1. **HomePage.tsx** - Compact Task Cards
- **Task Card Layout**:
  - Header shows: Task Title + Time Posted + Category Badge + Budget + Status
  - Click to expand for full details (description, deadline, asker name)
  - Minimalist design (NOT like Quest)
  - Color-coded category badges (pet-care, cleaning, tech support, etc.)

- **User Experience**:
  - Greeting: "Welcome, [Name]! 👋"
  - Quick browse without overwhelming details
  - One-click expand for more info
  - Clear call-to-action buttons

### 2. **HanaAssistant.tsx** - Avatar-Based Floating Button
- **Floating Button**:
  - Now displays Hana's avatar image
  - Falls back to 🌸 emoji if image not found
  - Larger size (w-20 h-20) with white border
  - Sits above bottom navigation
  - Hover effect (scale-110)

- **Chat Header**:
  - Shows Hana's avatar in top-left of chat window
  - Greeting: "Hana - Always here to help"

## Image Files Needed

Place these images in `frontend/public/images/`:

1. **mascots-group.png** (Homepage splash screen)
   - Size: ~400x500px (portrait-ish)
   - Shows: Esha, Lian, Hana & Piers together
   - Used on login splash screen

2. **hana-avatar.png** (Hana's face)
   - Size: ~200x200px (square)
   - Shows: Hana's portrait/face
   - Used on floating button and chat header

## Design Philosophy

✅ **Warm & Cozy**: "Kampung" neighborhood feeling
✅ **Minimal**: Compact cards, no wasted space
✅ **Friendly**: Emojis, warm colors (orange #FF7A29, pink, brown #4A3221)
✅ **Accessible**: Large text for 50+, expandable details
✅ **NOT Quest-like**: Focus on simplicity, not complexity

## Colors Used

- **Primary Orange**: #FF7A29 (buttons, badges)
- **Brown**: #4A3221 (text, headings)
- **Pink**: #FCD34D (Hana theme, soft accents)
- **Background**: #FFFAF6 (cream/off-white, warm)

## Task Card Features

### Collapsed View (Always Visible)
- Task title
- Time posted ("3 days ago", "Today", etc.)
- Category badge (colored)
- Budget (if set)
- Status (open/assigned/etc.)

### Expanded View (Click to reveal)
- Full description
- Deadline date
- Asker name (for doers)
- "View Details" / "Accept Task" button

## Empty States

- No errands yet? Shows friendly CTA
  - Askers: "Post an Errand"
  - Doers: "Browse Tasks"

## Next Steps

1. Add Hana's avatar image: `frontend/public/images/hana-avatar.png`
2. Add mascots group image: `frontend/public/images/mascots-group.png`
3. Test login flow → homepage → task browsing
4. Verify expandable cards work smoothly
5. Test Hana floating button appearance

