# Click Owl — Design System & Page Design Specification

## 1. Brand Foundation

**Brand:** Click Owl  
**Tagline:** Wisdom in Every Click  
**Powered by:** Intentnetic

The design should feel intelligent, modern, confident, digital-first, and highly usable. The owl metaphor should communicate wisdom, observation, intelligence, and informed decision-making.

Brand guidance confirms the primary brand colors are:
- Yellow: `#FFD10A`
- Black: `#010101`

Typography guidance identifies **Neusharp Bold** and **Regular** usage in the brand guide. Use the exact licensed brand font where available; use a clean geometric sans-serif fallback when it is not available. fileciteturn0file0L112-L123

---

## 2. Core Color System

### Primary
```css
--color-primary: #FFD10A;
--color-primary-hover: #E8B900;
--color-primary-soft: #FFF4BF;
```

Use Click Owl Yellow for:
- Primary CTAs
- Important highlights
- Active states
- Key icons
- Badges
- Data highlights
- Selected navigation items
- Small visual accents

Do not flood large UI areas with yellow. Yellow should create attention and hierarchy.

### Black / Ink
```css
--color-black: #010101;
--color-ink: #111111;
--color-ink-soft: #2A2A2A;
```

Use black for:
- Headers
- Navigation
- Hero backgrounds
- Strong typography
- Footer
- High-contrast cards
- Primary brand moments

The official guide specifies `#010101` as the black brand color. fileciteturn0file0L125-L135

### Neutral UI
```css
--color-white: #FFFFFF;
--color-bg: #F7F7F5;
--color-surface: #FFFFFF;
--color-border: #E7E7E3;
--color-muted: #737373;
--color-text: #171717;
```

### Semantic Colors
```css
--color-success: #16803C;
--color-warning: #B77900;
--color-danger: #C62828;
--color-info: #2563EB;
```

Semantic colors are supporting UI colors only. Brand yellow and black remain the dominant visual identity.

---

## 3. Design Style

### Overall Direction

Use a **premium intelligent SaaS / AI analytics** visual language.

Keywords:
- Intelligent
- Minimal
- Sharp
- Editorial
- Data-driven
- Premium
- Confident
- Fast
- Modern
- Trustworthy

Avoid:
- Generic startup gradients
- Excessive glassmorphism
- Heavy shadows
- Over-rounded cartoon UI
- Too many colors
- Dense dashboards without hierarchy
- Decorative elements that compete with data

### Shape Language

Use:
- 8–16px card radius
- 6–10px buttons
- Sharp/medium rounded containers
- Thin borders
- Large typography
- Strong alignment
- Generous whitespace

Suggested:
```css
--radius-sm: 6px;
--radius-md: 10px;
--radius-lg: 16px;
--radius-xl: 24px;
```

Cards should feel structured rather than bubbly.

---

## 4. Typography

### Primary Brand Font

Use **Neusharp Bold** for prominent brand typography where the font file/license is available.

Use regular weight for supporting text where specified by the brand guide. The supplied brand guide lists Neusharp Bold and Regular. fileciteturn0file0L112-L120

### Fallback

```css
font-family: "Neusharp", "Inter", "Helvetica Neue", Arial, sans-serif;
```

### Type Scale

```css
--font-display: 64px;
--font-h1: 52px;
--font-h2: 40px;
--font-h3: 28px;
--font-h4: 22px;
--font-body-lg: 18px;
--font-body: 16px;
--font-small: 14px;
--font-xs: 12px;
```

Desktop:
- Hero H1: 56–72px
- Section H2: 40–48px
- Card heading: 20–28px
- Body: 16–18px
- Supporting text: 14–16px

Mobile:
- Hero H1: 38–46px
- H2: 30–36px
- Card heading: 20–24px
- Body: 15–16px

Line-height:
- Display: 0.95–1.05
- Heading: 1.05–1.15
- Body: 1.5–1.7

---

## 5. Layout System

### Container

```css
max-width: 1280px;
margin: 0 auto;
padding: 0 24px;
```

Large desktop:
- Max width: 1280–1440px
- Section spacing: 96–140px

Tablet:
- Horizontal padding: 32px

Mobile:
- Horizontal padding: 20px
- Section spacing: 64–80px

### Grid

Use an 8px spacing system:
```css
4px
8px
12px
16px
24px
32px
48px
64px
96px
128px
```

---

## 6. Navigation Design

### Desktop Header

Structure:
1. Click Owl logo
2. Product
3. Solutions
4. Resources
5. Pricing
6. Login
7. Primary CTA

Header style:
- White background for product pages
- Black background for selected marketing hero pages
- 72–84px height
- Thin bottom border where appropriate
- Sticky on scroll
- CTA uses Click Owl Yellow

CTA:
**Get Started**

Button:
- Yellow background
- Black text
- Medium/bold weight
- 8–10px radius
- 12–18px horizontal padding

---

# 7. Page Designs

## Page 01 — Home

### Hero

Background:
- Black `#010101`

Layout:
- Left: headline, description, CTA
- Right: intelligent owl/data visualization or product dashboard preview

Headline:
**Wisdom in Every Click**

Supporting message:
**Turn every click into a clearer signal, a smarter decision, and a better outcome.**

Buttons:
- Primary: `Get Started`
- Secondary: `Explore Platform`

Visual:
- Black background
- Yellow highlights
- White typography
- Subtle data/grid pattern
- No excessive gradients

### Trust / Proof

White section.

Show:
- Customer logos
- Key metrics
- Product adoption
- Short proof statements

Use large numbers with yellow accents.

### Product Overview

Section heading:
**See the intelligence behind every interaction.**

Three/four feature cards:
- Understand Intent
- Track Behavior
- Discover Opportunities
- Make Smarter Decisions

Each card:
- Simple icon
- Short heading
- 2–3 line description
- Small arrow

### How It Works

Three steps:
1. Capture
2. Understand
3. Act

Use a horizontal visual flow on desktop and vertical timeline on mobile.

### Final CTA

Black section:
**Ready to make every click smarter?**

Yellow CTA.

---

## Page 02 — Product / Platform

### Hero

Heading:
**One platform. Every meaningful signal.**

Show a large dashboard preview.

Dashboard UI should use:
- White surfaces
- Black text
- Yellow active states
- Minimal semantic colors
- Thin borders
- Compact charts

### Dashboard Sections

Include:
- Overview
- Real-time activity
- Visitor intelligence
- Conversion signals
- Intent analytics
- Reports

### Feature Grid

Use 2×3 desktop grid.

Each feature card has:
- Icon
- Title
- Description
- Optional metric

---

## Page 03 — Analytics Dashboard

### Dashboard Shell

Left sidebar:
- Overview
- Live Activity
- Visitors
- Pages
- Events
- Intent
- Reports
- Settings

Top bar:
- Search
- Date range
- Notifications
- Profile

Main:
- KPI cards
- Charts
- Recent events
- Top pages
- Visitor activity

### KPI Cards

Examples:
- Total Visitors
- Engaged Visitors
- Intent Signals
- Conversions

Card style:
- White background
- 1px border
- 12px radius
- Very subtle shadow
- Large black number
- Yellow micro-accent

### Charts

Prefer:
- Line chart
- Area chart
- Bar chart
- Donut chart only when necessary

Keep charts simple and readable.

---

## Page 04 — Solutions

Hero:
**Intelligence built for better decisions.**

Solution cards:
- Marketing Teams
- Sales Teams
- Product Teams
- Agencies
- Ecommerce
- Growth Teams

Each card should have:
- Large number/label
- Short explanation
- Use-case list
- CTA

---

## Page 05 — Pricing

Hero:
**Simple pricing. Smarter growth.**

Pricing cards:
- Starter
- Growth
- Scale
- Enterprise

Recommended card:
- Yellow top border/accent
- Slightly elevated
- `Most Popular` badge

Pricing card hierarchy:
1. Plan name
2. Description
3. Price
4. Billing period
5. CTA
6. Feature list

Avoid complicated visual effects.

---

## Page 06 — Resources

Resource categories:
- Blog
- Guides
- Case Studies
- Documentation
- Product Updates

Design:
- Editorial card layout
- Large thumbnails
- Strong black headlines
- Yellow category labels
- Minimal metadata

---

## Page 07 — Blog Detail

Layout:
- Breadcrumb
- Category
- Large article title
- Author/date
- Hero image
- Article content
- Related articles

Typography should prioritize readability.

Article max width:
```css
max-width: 760px;
```

---

## Page 08 — About

Hero:
**Building wisdom into every click.**

Sections:
- Brand story
- Mission
- What we believe
- Product philosophy
- Team
- Contact CTA

Use large black typography and yellow visual markers.

---

## Page 09 — Contact

Hero:
**Let's make your data more useful.**

Form:
- Name
- Work email
- Company
- Message

CTA:
**Talk to us**

Use a two-column desktop layout:
- Left: headline + supporting copy
- Right: form

---

## Page 10 — Login

Minimal centered layout.

Background:
`#F7F7F5`

Card:
- White
- 16px radius
- Border
- Click Owl logo
- Email
- Password
- Remember me
- Login button

Primary button:
Yellow with black text.

---

## Page 11 — Signup

Heading:
**Start turning clicks into intelligence.**

Fields:
- Name
- Work email
- Company
- Password

CTA:
**Create Account**

Keep the page distraction-free.

---

## Page 12 — 404

Black background.

Large yellow:
**404**

Headline:
**Looks like this click went somewhere unexpected.**

CTA:
**Back to Home**

Use a simple owl-inspired illustration.

---

# 8. Buttons

### Primary
```css
background: #FFD10A;
color: #010101;
border: 1px solid #FFD10A;
border-radius: 8px;
```

### Secondary
```css
background: transparent;
color: #010101;
border: 1px solid #010101;
border-radius: 8px;
```

### Dark Button
```css
background: #010101;
color: #FFFFFF;
border: 1px solid #010101;
border-radius: 8px;
```

Hover:
- Slight upward movement: 1–2px
- Subtle shadow
- No dramatic animation

---

# 9. Cards

Default:
```css
background: #FFFFFF;
border: 1px solid #E7E7E3;
border-radius: 12px;
padding: 24px;
```

Hover:
- Border becomes darker
- 2px upward movement
- Very subtle shadow

Avoid huge shadows.

---

# 10. Icons

Use simple modern line icons.

Icon rules:
- 20–24px default
- Consistent stroke width
- Black by default
- Yellow for active/featured states
- Avoid mixing multiple icon styles

---

# 11. Images & Illustrations

Visual direction:
- Intelligent technology
- Digital interfaces
- Data visualization
- Abstract owl/wisdom metaphor
- High-quality editorial photography where appropriate

Do not use:
- Generic corporate handshake imagery
- Overused AI robot imagery
- Excessive stock photography
- Random gradients

---

# 12. Motion

Animation should be subtle and purposeful.

Recommended:
- Fade-up on section entry
- 150–250ms hover transitions
- Chart number animation
- Smooth navigation transitions
- Small CTA movement

Avoid:
- Excessive parallax
- Long loading animations
- Bouncing elements
- Distracting background motion

---

# 13. Accessibility

Minimum requirements:
- Strong text contrast
- Keyboard focus states
- Visible hover/focus states
- Buttons must have clear labels
- Images require alt text
- Form fields require labels
- Do not rely only on color to communicate state

Important:
Yellow `#FFD10A` should normally be paired with black text, not white text.

---

# 14. Responsive Behavior

### Desktop
- Full navigation
- Multi-column layouts
- Dashboard sidebar
- Large hero visuals

### Tablet
- Condense navigation
- Reduce grid columns
- Maintain generous spacing

### Mobile
- Hamburger menu
- Single-column sections
- Horizontal scrolling only where appropriate
- Dashboard sidebar becomes drawer
- KPI cards can become 2-column
- Tables become cards or horizontally scrollable containers
- CTAs become full-width when useful

---

# 15. Design Tokens

```css
:root {
  --brand-yellow: #FFD10A;
  --brand-black: #010101;

  --text-primary: #171717;
  --text-secondary: #737373;

  --background: #F7F7F5;
  --surface: #FFFFFF;
  --border: #E7E7E3;

  --success: #16803C;
  --warning: #B77900;
  --danger: #C62828;
  --info: #2563EB;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 64px;
  --space-9: 96px;
  --space-10: 128px;
}
```

---

# 16. Developer Implementation Rules

1. Follow the Click Owl brand colors exactly.
2. Keep `#FFD10A` and `#010101` as the dominant brand colors.
3. Use Neusharp when available.
4. Use clean sans-serif fallback fonts when Neusharp is unavailable.
5. Keep layouts spacious and structured.
6. Avoid generic SaaS gradients.
7. Use yellow primarily as an attention/accent color.
8. Maintain consistent border radius and spacing.
9. Make all pages responsive.
10. Build reusable components for buttons, cards, navigation, forms, KPI cards, tables, charts, badges, and sections.
11. Keep marketing pages visually bold and dashboard pages information-dense but clean.
12. Maintain strong accessibility and contrast.
13. Preserve the Click Owl identity: intelligent, sharp, modern, and confident.

---

# 17. Complete Page Sitemap

```text
/
├── Home
├── Product
├── Solutions
│   ├── Marketing
│   ├── Sales
│   ├── Product
│   ├── Agencies
│   └── Ecommerce
├── Pricing
├── Resources
│   ├── Blog
│   ├── Guides
│   ├── Case Studies
│   ├── Documentation
│   └── Product Updates
├── About
├── Contact
├── Login
├── Signup
└── 404
```

---

# 18. Final Visual Direction

The finished Click Owl experience should look like a **premium intelligent analytics platform**, combining:

**Black + Click Owl Yellow + White**

with:
- Bold typography
- Sharp hierarchy
- Minimal UI
- Data visualization
- Editorial spacing
- Strong CTAs
- Intelligent owl-inspired details

The brand guide establishes the central identity as **“Click Owl — Wisdom in Every Click”**, with the brand powered by Intentnetic. fileciteturn0file0L1-L5
