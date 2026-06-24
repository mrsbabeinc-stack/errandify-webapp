# 🎨 Errandify Branding Guide

## Brand Identity

### Logo
**File:** `/frontend/public/images/Errandify Logo.png`

**Usage Sizes:**
- **Favicon/Small:** 16px - 32px
- **Navigation Bar:** 32px (h-8)
- **Page Headers:** 48px - 80px (h-12 to h-20)
- **Landing/Auth:** 80px+ (h-20+)

**Colors:** Full color logo (Orange & Brown)

---

## Slogan & Tagline

### Primary Slogan
```
Simplifying Life. Amplifying Humanity.
```
- **Style:** Italic, Orange color, Serif/Elegant
- **Usage:** Main brand promise
- **Size:** Small to medium text

### Primary Tagline
```
Get Help. Give Help. Get Paid
```
- **Style:** Bold, Dark brown color, Sans-serif
- **Usage:** Call-to-action, value proposition
- **Size:** Medium to large text

---

## Brand Colors

### Primary Colors
```
Errandify Orange: #E67C3C / rgb(230, 124, 60)
  - Use for: Logo, primary buttons, highlights, CTAs
  - Tailwind: errandify-orange

Errandify Brown: #5D4037 / rgb(93, 64, 55)
  - Use for: Text, secondary elements, headers
  - Tailwind: errandify-brown
```

### Background Colors
```
Errandify Background: Light cream/beige
  - Tailwind: errandify-bg
```

---

## Typography

### Headlines
- **Font:** Bold (700)
- **Color:** Errandify Brown
- **Size:** Large (18px+)

### Tagline & Slogan
- **Font:** Semibold/Bold (600-700)
- **Color:** Orange for slogan, Brown for tagline
- **Style:** Slogan is italic, Tagline is bold
- **Size:** Small to medium (12px-18px)

### Body Text
- **Font:** Regular (400-500)
- **Color:** Gray (600)
- **Size:** 12px-16px

---

## Page Locations

### Where the Branding Appears

#### 1. **LandingPage** (`/`)
```
┌─────────────────────────────────┐
│                                 │
│    [Family Photo]               │
│                                 │
├─────────────────────────────────┤
│                                 │
│   [Errandify Logo]              │
│                                 │
│  Simplifying Life.              │
│  Amplifying Humanity.           │
│                                 │
│  Get Help. Give Help. Get Paid  │
│                                 │
│  [Get Started Button]           │
│                                 │
└─────────────────────────────────┘
```

#### 2. **AuthPage** (`/auth`)
```
┌─────────────────────────────────┐
│                                 │
│   Errandify                     │
│                                 │
│  Simplifying Life.              │
│  Amplifying Humanity.           │
│                                 │
│  Get Help. Give Help. Get Paid  │
│                                 │
├─────────────────────────────────┤
│ [Sign In]    [Sign Up]          │
├─────────────────────────────────┤
│                                 │
│  [Sign In with SingPass]        │
│                                 │
│  ─── Or try demo ───            │
│                                 │
│  [Demo: Sarah]                  │
│  [Demo: John]                   │
│                                 │
└─────────────────────────────────┘
```

#### 3. **Dashboard/All Pages** (After Login)
```
┌─────────────────────────────────┐
│ [Logo] [Role Toggle] [Profile]  │
├─────────────────────────────────┤
│                                 │
│    Main Content                 │
│                                 │
├─────────────────────────────────┤
│ 🏠 🔍 💬 📰 👤 🔔              │
└─────────────────────────────────┘
```

---

## Slogan & Tagline Placement

### Slogan: "Simplifying Life. Amplifying Humanity."
- **Primary Color:** Errandify Orange (#E67C3C)
- **Style:** Italic, Semibold (600)
- **Usage:** 
  - Auth page (below logo)
  - Landing page (below logo)
  - Marketing materials
  - Email signatures
  - Social media bios

### Tagline: "Get Help. Give Help. Get Paid"
- **Primary Color:** Errandify Brown (#5D4037)
- **Style:** Bold (700), Sans-serif
- **Usage:**
  - Auth page (below slogan)
  - Landing page (below slogan)
  - Hero sections
  - Email headers
  - Homepage banners
  - App tagline

---

## Usage Examples

### Example 1: Auth Page Header
```html
<div className="text-center mb-8">
  <img
    src="/images/Errandify Logo.png"
    alt="Errandify"
    className="h-20 w-auto mx-auto mb-4"
  />
  <p className="text-errandify-orange font-semibold text-sm italic mb-2">
    Simplifying Life. Amplifying Humanity.
  </p>
  <p className="text-gray-600 font-bold text-lg">
    Get Help. Give Help. Get Paid
  </p>
</div>
```

### Example 2: Email Header
```
[Errandify Logo]

Simplifying Life. Amplifying Humanity.

Get Help. Give Help. Get Paid
```

### Example 3: Social Media Bio
```
Simplifying Life. Amplifying Humanity.

Get Help. Give Help. Get Paid

🌐 www.errandify.sg
📧 help@errandify.sg
```

---

## Favicon & App Icons

**Current:** Generic favicon
**Recommended:** Use Errandify Logo at 32x32 (favicon.ico)

**Update locations:**
- `frontend/public/favicon.ico`
- `frontend/public/favicon.png`
- Apple Touch Icon: `frontend/public/apple-touch-icon.png`

---

## Browser Tab

### Current
```
Errandify - Get Help. Give Help. Get Paid
```

### With Emoji (Optional)
```
🌟 Errandify - Get Help. Give Help. Get Paid
```

---

## Promotional Materials

### Website Header
```
╔═══════════════════════════════════════════╗
║                                           ║
║  [Errandify Logo]                         ║
║                                           ║
║  Simplifying Life. Amplifying Humanity.   ║
║  Get Help. Give Help. Get Paid            ║
║                                           ║
║  [Start Helping Today Button]             ║
║                                           ║
╚═══════════════════════════════════════════╝
```

### Email Newsletter
```
FROM: Errandify Team
SUBJECT: Simplifying Life. Amplifying Humanity.

[Errandify Logo]

Simplifying Life. Amplifying Humanity.
Get Help. Give Help. Get Paid

[Newsletter content]
```

### Social Media
```
Instagram Bio:
🏘️ Simplifying Life. Amplifying Humanity.
Get Help. Give Help. Get Paid
🌐 www.errandify.sg

Facebook Page:
Errandify - Get Help. Give Help. Get Paid
Simplifying Life. Amplifying Humanity.
```

---

## DO's & DON'Ts

### DO ✅
- ✅ Use orange for emphasis and CTAs
- ✅ Use brown for main text
- ✅ Keep slogan italic and elegant
- ✅ Keep tagline bold and direct
- ✅ Maintain logo aspect ratio
- ✅ Use in all marketing materials
- ✅ Print on collateral (business cards, flyers)
- ✅ Include in email signatures
- ✅ Use in social media headers

### DON'T ❌
- ❌ Don't distort or stretch the logo
- ❌ Don't change the orange/brown colors
- ❌ Don't remove the slogan/tagline from main pages
- ❌ Don't make slogan bold (keep italic)
- ❌ Don't make tagline italic (keep bold)
- ❌ Don't use other colors for primary elements
- ❌ Don't remove logo from pages
- ❌ Don't translate the slogan/tagline

---

## Implementation Checklist

- [x] Logo on AuthPage
- [x] Logo on LandingPage
- [x] Logo on Layout (top bar)
- [x] Slogan in all pages
- [x] Tagline in all pages
- [x] Browser title updated
- [x] Meta description updated
- [ ] Favicon updated (recommended)
- [ ] Social media headers updated
- [ ] Email templates updated
- [ ] Business cards printed
- [ ] Website updated
- [ ] Ad materials created

---

## Brand Voice

### Tone
- **Helpful:** Genuine, supportive, caring
- **Active:** Action-oriented, "get things done"
- **Community-focused:** "we help each other"
- **Positive:** Empowering, uplifting language

### Examples
- "Get help when you need it"
- "Give help to earn rewards"
- "Join a community of helpers"
- "Simplify your life, amplify humanity"

---

## Future Considerations

1. **Tagline Variations (Optional)**
   - Short: "Help Happens Here"
   - Alternative: "Community. Help. Rewards."
   - Video: "Get Help. Give Help. Get Paid. ⭐"

2. **Seasonal/Campaign Variations**
   - Chinese New Year: "新年新帮助" (New Year, New Help)
   - Deepavali: "दिवाली की मदद" (Diwali Help)
   - Hari Raya: "Berbagi, Membantu, Dapatkan Bayaran" (Share, Help, Get Paid)

3. **Emoji/Icons**
   - ✋ Get Help
   - 🤝 Give Help
   - 💰 Get Paid

---

## Contact & Questions

For branding questions or updates:
- Email: brand@errandify.sg
- Slack: #branding
- Notion: Branding Guidelines (shared doc)

---

**Last Updated:** June 25, 2026  
**Version:** 1.0  
**Status:** Active

