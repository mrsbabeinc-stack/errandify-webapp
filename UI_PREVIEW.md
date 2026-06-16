# Errandify UI Preview

## Login Page

```
┌─────────────────────────────────┐
│                                 │
│          Errandify              │
│  Singapore's Community Task     │
│         Platform                │
│                                 │
├─────────────────────────────────┤
│                                 │
│  Email Address                  │
│  ┌───────────────────────────┐  │
│  │ your@email.com            │  │
│  └───────────────────────────┘  │
│                                 │
│  I want to:                     │
│  ┌──────────────┬──────────────┐ │
│  │ Ask for Help │ Help Others  │ │ (toggle)
│  └──────────────┴──────────────┘ │
│                                 │
│  ┌───────────────────────────┐  │
│  │      Continue             │  │
│  └───────────────────────────┘  │
│                                 │
│  Mock login for now...          │
│                                 │
└─────────────────────────────────┘
```

## Main App Layout

```
┌─────────────────────────────────┐
│ Asker | Doer ◄────────────────  │ Role Toggle (top-left, fixed)
│  (toggle)                       │
├─────────────────────────────────┤
│                                 │
│      PAGE CONTENT               │
│      (Home/Errands/Chat/...)    │
│                                 │
│                                 │
│                                 │
├─────────────────────────────────┤
│ 🏠      📋      💬      👤      │ Bottom Nav (always visible)
│Home   Errands  Chat   Profile   │
└─────────────────────────────────┘
```

## Home Page (Asker View)

```
┌─────────────────────────────────┐
│ Asker | Doer                    │
├─────────────────────────────────┤
│                                 │
│  Need Help?                     │
│  Post an errand and let our     │
│  community help you.            │
│                                 │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │  Dashboard coming soon... │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
├─────────────────────────────────┤
│ 🏠      📋      💬      👤      │
│Home   Errands  Chat   Profile   │
└─────────────────────────────────┘
```

## Home Page (Doer View)

```
┌─────────────────────────────────┐
│ Asker | Doer                    │
├─────────────────────────────────┤
│                                 │
│  Find Tasks                     │
│  Browse available errands and   │
│  start earning.                 │
│                                 │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │  Dashboard coming soon... │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
├─────────────────────────────────┤
│ 🏠      📋      💬      👤      │
│Home   Errands  Chat   Profile   │
└─────────────────────────────────┘
```

## Errands Page

```
┌─────────────────────────────────┐
│ Asker | Doer                    │
├─────────────────────────────────┤
│                                 │
│  Errands                        │
│  Your posted errands            │
│                                 │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │  Errand listing coming... │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
├─────────────────────────────────┤
│ 🏠      📋      💬      👤      │
│Home   Errands  Chat   Profile   │
└─────────────────────────────────┘
```

## Chat Page

```
┌─────────────────────────────────┐
│ Asker | Doer                    │
├─────────────────────────────────┤
│                                 │
│  Messages                       │
│  Chat with users about errands  │
│                                 │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │  Chat interface coming... │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
├─────────────────────────────────┤
│ 🏠      📋      💬      👤      │
│Home   Errands  Chat   Profile   │
└─────────────────────────────────┘
```

## Profile Page

```
┌─────────────────────────────────┐
│ Asker | Doer                    │
├─────────────────────────────────┤
│                                 │
│  Profile                        │
│  Your profile and history       │
│                                 │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │  Profile details coming.. │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
├─────────────────────────────────┤
│ 🏠      📋      💬      👤      │
│Home   Errands  Chat   Profile   │
└─────────────────────────────────┘
```

## Color Scheme

```
┌─────────────────────────────────┐
│ Background: #FFFAF6 (off-white) │
│                                 │
│ Primary:    #FF7A29 (orange)    │
│ Secondary:  #4A3221 (brown)     │
│                                 │
│ Text:       #4A3221             │
│ Borders:    #E5E5E5 (gray)      │
│                                 │
│ Active Tab: #FF7A29 border      │
│ Inactive:   #999999 gray        │
└─────────────────────────────────┘
```

## Responsive Behavior

### Mobile (< 640px) - Primary Target
- Full-screen layout
- Bottom nav always visible
- Role toggle fixed top-left
- Touch-friendly spacing

### Tablet (640px - 1024px)
- Slightly larger touch targets
- Same layout, scaled proportionally
- Bottom nav still anchored

### Desktop (> 1024px)
- Optional side nav instead of bottom nav
- Wider content areas
- Non-breaking viewport

## Key Components

### RoleToggle
- **Location**: Top-left corner, fixed, z-50
- **Behavior**: Click to switch Asker ↔ Doer
- **Styling**: 
  - Active: Orange background, white text
  - Inactive: Gray background, brown text
  - Smooth color transition

### BottomNav
- **Location**: Bottom of screen, fixed
- **Behavior**: Click to navigate, shows active page with orange border-top
- **Items**: Home, Errands, Chat, Profile
- **Spacing**: Evenly distributed across screen
- **Accessibility**: Emoji + label for each item

### Layout
- **Structure**: Flex column, min-height: 100vh
- **Sections**:
  1. RoleToggle (absolute positioned)
  2. Main content (flex-1, overflow-y-auto)
  3. BottomNav (fixed bottom)
- **Padding**: Content has pb-20 (80px) to clear bottom nav

---

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| LoginPage | ✅ Done | Email + role toggle |
| Layout | ✅ Done | Flex layout with nav |
| RoleToggle | ✅ Done | Asker/Doer switch |
| BottomNav | ✅ Done | Tab navigation |
| HomePage | ⏳ Stub | Role-aware greeting |
| ErrandsPage | ⏳ Stub | Placeholder layout |
| ChatPage | ⏳ Stub | Message listing soon |
| ProfilePage | ⏳ Stub | User info soon |

**⏳ = Ready for feature implementation**
