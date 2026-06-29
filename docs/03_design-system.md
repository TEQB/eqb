# Design System

**University Past Questions Platform**
Version 1.0 — Design & Architecture Phase

---

## 1. Design Philosophy

The platform serves students under study pressure — they need information fast, with minimal friction. The design system prioritizes:

- **Clarity over decoration** — every element earns its place
- **Speed of navigation** — students should find a course in 3 taps or fewer
- **Mobile-first layouts** — most students will access on phone
- **Accessible defaults** — sufficient contrast, readable type, clear states
- **Consistent feedback** — every action (upload, flag, vote) has an immediate visual response

---

## 2. Color Palette

### Primary
| Token | Hex | Usage |
|---|---|---|
| `--color-primary-600` | `#2563EB` | Primary actions, links, active states |
| `--color-primary-50` | `#EFF6FF` | Primary surface backgrounds |
| `--color-primary-100` | `#DBEAFE` | Hover states on primary surfaces |
| `--color-primary-800` | `#1E40AF` | Primary text on light backgrounds |

### Neutral
| Token | Hex | Usage |
|---|---|---|
| `--color-gray-900` | `#111827` | Headings, primary text |
| `--color-gray-700` | `#374151` | Body text |
| `--color-gray-500` | `#6B7280` | Secondary/muted text |
| `--color-gray-300` | `#D1D5DB` | Borders, dividers |
| `--color-gray-100` | `#F3F4F6` | Surface backgrounds |
| `--color-gray-50` | `#F9FAFB` | Page background |
| `--color-white` | `#FFFFFF` | Cards, inputs |

### Semantic
| Token | Hex | Usage |
|---|---|---|
| `--color-success-600` | `#16A34A` | Approved, published, unlocked |
| `--color-success-50` | `#F0FDF4` | Success surface |
| `--color-warning-600` | `#D97706` | Obligation warning banner |
| `--color-warning-50` | `#FFFBEB` | Warning surface |
| `--color-danger-600` | `#DC2626` | Rejected, locked, flagged |
| `--color-danger-50` | `#FEF2F2` | Danger surface |
| `--color-info-600` | `#0891B2` | Informational badges |
| `--color-info-50` | `#ECFEFF` | Info surface |

---

## 3. Typography

### Font Stack
```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### Type Scale
| Token | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| `--text-xs` | 12px | 400 | 1.5 | Labels, badges, captions |
| `--text-sm` | 14px | 400 | 1.5 | Secondary body, metadata |
| `--text-base` | 16px | 400 | 1.7 | Primary body text |
| `--text-lg` | 18px | 500 | 1.4 | Section headings |
| `--text-xl` | 20px | 600 | 1.3 | Page headings |
| `--text-2xl` | 24px | 700 | 1.2 | Dashboard title |
| `--text-3xl` | 30px | 700 | 1.1 | Landing hero |

### Usage Rules
- Headings: `font-weight: 700` for h1/h2, `600` for h3/h4
- Body: `font-weight: 400`, `color: --color-gray-700`
- Muted/meta: `color: --color-gray-500`
- Never use more than 3 type sizes on a single page
- Course codes (e.g. CSC 301) use `font-family: --font-mono`

---

## 4. Spacing

8px base unit. All spacing is a multiple of 4 or 8.

| Token | Value | Usage |
|---|---|---|
| `--space-1` | 4px | Tight gaps (icon-to-text) |
| `--space-2` | 8px | Inner padding (badges, chips) |
| `--space-3` | 12px | Small gaps |
| `--space-4` | 16px | Default inner padding |
| `--space-5` | 20px | Medium gaps |
| `--space-6` | 24px | Card padding |
| `--space-8` | 32px | Section gaps |
| `--space-10` | 40px | Large section gaps |
| `--space-12` | 48px | Page-level spacing |

---

## 5. Border Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 4px | Badges, tags |
| `--radius-md` | 8px | Inputs, buttons, small cards |
| `--radius-lg` | 12px | Cards, modals |
| `--radius-xl` | 16px | Large cards, panels |
| `--radius-full` | 9999px | Pills, avatars |

---

## 6. Shadows

Flat design — shadows are used sparingly for elevation, not decoration.

| Token | Value | Usage |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Inputs on focus |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.07)` | Cards |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Dropdowns, modals |

---

## 7. Component Specifications

### Button
```
Primary:    bg-primary-600  text-white  hover:bg-primary-700
Secondary:  bg-white  border-gray-300  text-gray-700  hover:bg-gray-50
Danger:     bg-danger-600  text-white  hover:bg-danger-700
Ghost:      bg-transparent  text-primary-600  hover:bg-primary-50

Height:     36px (sm) | 40px (default) | 44px (lg)
Padding:    12px 20px (default)
Border-radius: --radius-md
Font-size:  14px (sm) | 15px (default)
Font-weight: 500
```

### Input / Textarea
```
Border:       1px solid --color-gray-300
Border-radius: --radius-md
Padding:      10px 14px
Font-size:    16px (prevents iOS zoom)
Focus:        border-primary-600  ring-2  ring-primary-100
Error:        border-danger-600   ring-2  ring-danger-100
Height:       40px (input) | auto (textarea, min 100px)
```

### Card
```
Background:   --color-white
Border:       1px solid --color-gray-200
Border-radius: --radius-lg
Padding:      --space-6
Shadow:       --shadow-md
```

### Badge / Status Pill
```
Published:  bg-success-50  text-success-600  border-success-200
Pending:    bg-warning-50  text-warning-600  border-warning-200
Rejected:   bg-danger-50   text-danger-600   border-danger-200
Suspended:  bg-gray-100    text-gray-600     border-gray-300
General:    bg-info-50     text-info-600     border-info-200

Height:     22px
Padding:    2px 8px
Font-size:  12px
Font-weight: 500
Border-radius: --radius-full
```

### Navigation Sidebar
```
Width:        240px (desktop) | drawer on mobile
Item height:  40px
Item padding: 8px 12px
Active:       bg-primary-50  text-primary-700  font-weight: 500
Hover:        bg-gray-50
Icon size:    18px  (leading icon)
```

---

## 8. Page Layout

### Desktop
```
┌──────────────────────────────────────────────┐
│  Header (60px) — logo + search + avatar       │
├────────────┬─────────────────────────────────┤
│  Sidebar   │  Main content                   │
│  (240px)   │  max-width: 900px               │
│            │  padding: 32px                  │
│            │                                 │
└────────────┴─────────────────────────────────┘
```

### Mobile
```
┌──────────────────────┐
│  Header (56px)       │
├──────────────────────┤
│  Main content        │
│  padding: 16px       │
│                      │
├──────────────────────┤
│  Bottom nav (56px)   │
│  Home|Browse|Upload  │
└──────────────────────┘
```

---

## 9. Key Screen Patterns

### Course Card (browse grid)
```
┌─────────────────────────────┐
│  CSC 301                    │  ← monospace course code
│  Data Structures            │  ← course title
│  Level 300  ·  42 questions │  ← metadata row
│  Dept: Computer Science     │  ← scope indicator
└─────────────────────────────┘
```

### Past Question Row (course page list)
```
┌────────────────────────────────────────────────────┐
│  📄  2023 — First Semester            [Download]   │
│      CSC 301 · Level 300 · PDF                     │
│      ★ 12 solutions   🚩 Flag                      │
└────────────────────────────────────────────────────┘
```

### Upload Obligation Banner
```
┌────────────────────────────────────────────────────┐
│  ⚠️  You have 14 days to upload a past question    │
│     to maintain access.  [Upload now]              │
└────────────────────────────────────────────────────┘
```
Background: `--color-warning-50`, border-left: `4px solid --color-warning-600`

### Lockout / Upload Wall
```
┌────────────────────────────────────────────────────┐
│                                                    │
│         🔒  Access paused                         │
│                                                    │
│   Upload a past question to restore access.       │
│   Your contribution keeps the platform alive.     │
│                                                    │
│            [Upload a past question]               │
│                                                    │
└────────────────────────────────────────────────────┘
```
Full-screen overlay, cannot be dismissed without uploading.

---

## 10. Motion & Transitions

Keep animations fast and purposeful. No decorative animation.

| Element | Property | Duration | Easing |
|---|---|---|---|
| Buttons | background-color | 150ms | ease |
| Sidebar items | background-color | 100ms | ease |
| Modal open | opacity + translateY | 200ms | ease-out |
| Toast notification | opacity + translateX | 200ms | ease-out |
| Page transition | opacity | 150ms | ease |

---

## 11. Toast / Notification Patterns

| Type | Trigger | Message |
|---|---|---|
| Success | Upload approved | "Your past question was published." |
| Error | Upload rejected | "Upload rejected — [AI reason]." |
| Warning | Obligation approaching | "14 days left to upload." |
| Info | Solution published | "Your solution is now live." |

Position: top-right on desktop, top-center on mobile.
Auto-dismiss: 4 seconds. Always closeable manually.

---

## 12. Accessibility

- All interactive elements meet WCAG 2.1 AA contrast ratio (4.5:1 minimum)
- Focus rings visible on all interactive elements (`outline: 2px solid --color-primary-600`)
- All form inputs have associated `<label>` elements
- Icon-only buttons have `aria-label`
- Status badges use both color and text (never color alone)
- PDF viewer has a download fallback for screen reader users
