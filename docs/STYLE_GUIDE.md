# Style Guide

## Design Philosophy

Oryon's visual language is **minimal, calm, and functional**. Every
element serves a purpose. The interface recedes so the conversation
takes center stage. Inspired by the restraint of Linear, the density
of Cursor, and the focus of Raycast.

**Principles:**

1. **Quiet confidence** — No visual noise. Muted palette, generous
   whitespace, deliberate hierarchy.
2. **Content first** — The chat and code are the focus. Chrome is
   subdued.
3. **Responsive feedback** — Subtle animations confirm actions without
   demanding attention.
4. **Consistent rhythm** — A 4px spacing grid and limited type scale
   create visual harmony.

---

## Color System

### Brand Colors

| Token              | Value       | Usage                                |
| ------------------ | ----------- | ------------------------------------ |
| `--brand-primary`  | `#222222`   | Primary surfaces, text, anchors      |
| `--brand-accent`   | `#C2D8C4`   | Accent highlights, active states     |

### Dark Theme

| Token                  | Value       | Usage                              |
| ---------------------- | ----------- | ---------------------------------- |
| `--bg-base`            | `#0F0F0F`   | App background                     |
| `--bg-surface`         | `#161616`   | Cards, sidebar, panels             |
| `--bg-elevated`        | `#1C1C1C`   | Dropdowns, modals, popovers       |
| `--bg-overlay`         | `#222222`   | Hover states, selected items       |
| `--bg-input`           | `#1A1A1A`   | Input fields, text areas           |
| `--border-subtle`      | `#262626`   | Dividers, card borders             |
| `--border-default`     | `#333333`   | Input borders, section dividers    |
| `--border-focus`       | `#C2D8C4`   | Focus rings                        |
| `--text-primary`       | `#EBEBEB`   | Headings, body text                |
| `--text-secondary`     | `#999999`   | Labels, descriptions, timestamps   |
| `--text-muted`         | `#666666`   | Placeholders, disabled text        |
| `--text-inverse`       | `#0F0F0F`   | Text on accent backgrounds         |
| `--accent`             | `#C2D8C4`   | Buttons, links, active indicators  |
| `--accent-hover`       | `#D4E6D6`   | Accent hover state                 |
| `--accent-muted`       | `#C2D8C41A` | Accent backgrounds (10% opacity)   |
| `--accent-subtle`      | `#C2D8C40D` | Accent tints (5% opacity)          |

### Light Theme

| Token                  | Value       | Usage                              |
| ---------------------- | ----------- | ---------------------------------- |
| `--bg-base`            | `#FAFAFA`   | App background                     |
| `--bg-surface`         | `#FFFFFF`   | Cards, sidebar, panels             |
| `--bg-elevated`        | `#FFFFFF`   | Dropdowns, modals, popovers       |
| `--bg-overlay`         | `#F0F0F0`   | Hover states, selected items       |
| `--bg-input`           | `#FFFFFF`   | Input fields, text areas           |
| `--border-subtle`      | `#EBEBEB`   | Dividers, card borders             |
| `--border-default`     | `#D4D4D4`   | Input borders, section dividers    |
| `--border-focus`       | `#7BA37E`   | Focus rings (darker accent)        |
| `--text-primary`       | `#1A1A1A`   | Headings, body text                |
| `--text-secondary`     | `#666666`   | Labels, descriptions, timestamps   |
| `--text-muted`         | `#999999`   | Placeholders, disabled text        |
| `--text-inverse`       | `#FFFFFF`   | Text on accent backgrounds         |
| `--accent`             | `#7BA37E`   | Buttons, links (darker for contrast)|
| `--accent-hover`       | `#6B936E`   | Accent hover state                 |
| `--accent-muted`       | `#C2D8C426` | Accent backgrounds (15% opacity)   |
| `--accent-subtle`      | `#C2D8C40D` | Accent tints (5% opacity)          |

### Semantic Colors (both themes)

| Token                  | Dark          | Light         | Usage            |
| ---------------------- | ------------- | ------------- | ---------------- |
| `--status-success`     | `#4ADE80`     | `#16A34A`     | Success states   |
| `--status-error`       | `#F87171`     | `#DC2626`     | Error states     |
| `--status-warning`     | `#FBBF24`     | `#D97706`     | Warning states   |
| `--status-info`        | `#60A5FA`     | `#2563EB`     | Info states      |
| `--status-running`     | `#C2D8C4`     | `#7BA37E`     | Agent active     |

---

## Typography

### Font Stack

| Role       | Font Family                                       | Fallback                   |
| ---------- | ------------------------------------------------- | -------------------------- |
| UI / Body  | **Inter**                                         | system-ui, sans-serif      |
| Code       | **JetBrains Mono**                                | ui-monospace, monospace    |

Both fonts are bundled with the app (no external requests).

### Type Scale

Based on a 1.2 ratio (minor third), anchored at 14px:

| Token          | Size   | Weight    | Line Height | Usage                        |
| -------------- | ------ | --------- | ----------- | ---------------------------- |
| `--text-xs`    | 11px   | 400       | 16px        | Badges, captions             |
| `--text-sm`    | 12px   | 400       | 18px        | Labels, timestamps, metadata |
| `--text-base`  | 14px   | 400       | 22px        | Body text, messages          |
| `--text-md`    | 16px   | 500       | 24px        | Section headers, nav items   |
| `--text-lg`    | 19px   | 600       | 28px        | Page titles                  |
| `--text-xl`    | 23px   | 600       | 32px        | Hero / empty state headings  |

### Code Typography

| Token              | Size   | Line Height | Usage                        |
| ------------------ | ------ | ----------- | ---------------------------- |
| `--code-sm`        | 12px   | 18px        | Inline code, tool call meta  |
| `--code-base`      | 13px   | 20px        | Code blocks, diffs, terminal |

---

## Spacing

4px base grid. All spacing values are multiples of 4:

| Token        | Value  | Usage                                   |
| ------------ | ------ | --------------------------------------- |
| `--space-1`  | 4px    | Tight gaps, icon padding                |
| `--space-2`  | 8px    | Inline element spacing                  |
| `--space-3`  | 12px   | Component internal padding              |
| `--space-4`  | 16px   | Standard padding, gaps between elements |
| `--space-5`  | 20px   | Section spacing within cards            |
| `--space-6`  | 24px   | Card padding, major gaps                |
| `--space-8`  | 32px   | Section spacing                         |
| `--space-10` | 40px   | Page-level padding                      |
| `--space-12` | 48px   | Large section dividers                  |
| `--space-16` | 64px   | Empty state spacing                     |

---

## Border Radius

| Token              | Value  | Usage                           |
| ------------------ | ------ | ------------------------------- |
| `--radius-sm`      | 4px    | Badges, tags, small chips       |
| `--radius-md`      | 6px    | Buttons, inputs, cards          |
| `--radius-lg`      | 8px    | Panels, modals, larger surfaces |
| `--radius-xl`      | 12px   | Model cards, hero elements      |
| `--radius-full`    | 9999px | Avatars, circular indicators    |

---

## Shadows

Minimal shadow usage. Depth is conveyed primarily through background
color differences.

| Token              | Value (Dark)                              | Usage              |
| ------------------ | ----------------------------------------- | ------------------ |
| `--shadow-sm`      | `0 1px 2px rgba(0,0,0,0.3)`              | Subtle lift        |
| `--shadow-md`      | `0 4px 12px rgba(0,0,0,0.4)`             | Dropdowns, modals  |
| `--shadow-lg`      | `0 8px 24px rgba(0,0,0,0.5)`             | Floating panels    |

Light theme uses `rgba(0,0,0,0.08)`, `rgba(0,0,0,0.12)`,
`rgba(0,0,0,0.16)` respectively.

---

## Iconography

- **Icon set**: Lucide Icons (consistent, MIT-licensed, tree-shakeable)
- **Size**: 16px default, 20px for primary actions, 14px for inline
- **Stroke**: 1.5px (matches Inter's visual weight)
- **Color**: Inherits from `currentColor` — no hardcoded icon colors

---

## Animation & Motion

### Principles

- Animations are **functional**, not decorative
- Duration: 100–200ms for micro-interactions, 200–300ms for transitions
- Easing: `cubic-bezier(0.25, 0.1, 0.25, 1)` (natural ease-out)
- Respect `prefers-reduced-motion` — disable all non-essential animation

### Tokens

| Token                    | Value                                | Usage                  |
| ------------------------ | ------------------------------------ | ---------------------- |
| `--duration-fast`        | `100ms`                              | Hover, focus states    |
| `--duration-normal`      | `150ms`                              | Buttons, toggles       |
| `--duration-smooth`      | `200ms`                              | Panel transitions      |
| `--duration-enter`       | `250ms`                              | Mount animations       |
| `--duration-exit`        | `150ms`                              | Unmount animations     |
| `--ease-default`         | `cubic-bezier(0.25, 0.1, 0.25, 1)`  | General transitions    |
| `--ease-spring`          | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Bouncy micro-feedback  |

### Specific Animations

| Element              | Animation                                              |
| -------------------- | ------------------------------------------------------ |
| Sidebar collapse     | Width slides, content fades (200ms, ease-default)      |
| Chat message appear  | Fade in + slide up 8px (200ms, ease-default)           |
| Tool call expand     | Height transition (150ms, ease-default)                |
| Toast notification   | Slide in from top-right, fade (250ms, ease-spring)     |
| Panel open           | Slide + resize from edge (200ms, ease-default)         |
| Button hover         | Background color transition (100ms, ease-default)      |
| Model card hover     | Subtle border highlight (100ms, ease-default)          |
| Download progress    | Width transition on progress bar (continuous, linear)  |
| Page transition      | Fade crossfade (150ms, ease-default)                   |

---

## Component Patterns

### Buttons

```
Primary:    bg: accent, text: inverse, hover: accent-hover
Secondary:  bg: transparent, border: border-default, text: primary
Ghost:      bg: transparent, text: secondary, hover: bg-overlay
Danger:     bg: transparent, text: error, hover: error/10%
```

- Height: 32px (small), 36px (default), 40px (large)
- Padding: `--space-2` vertical, `--space-3` horizontal
- Border radius: `--radius-md`
- Font: `--text-sm`, weight 500

### Inputs

- Height: 36px
- Background: `--bg-input`
- Border: 1px `--border-default`, focus: `--border-focus`
- Border radius: `--radius-md`
- Padding: `--space-3`
- Placeholder: `--text-muted`

### Cards (Model Hub)

- Background: `--bg-surface`
- Border: 1px `--border-subtle`
- Border radius: `--radius-xl`
- Padding: `--space-5`
- Hover: border transitions to `--border-default`

### Sidebar Items

- Height: 32px
- Padding: `--space-2` vertical, `--space-3` horizontal
- Border radius: `--radius-md`
- Active: `--bg-overlay`, left accent bar (2px, `--accent`)
- Hover: `--bg-overlay` at 50% opacity

### Messages

- User messages: Right-aligned, `--bg-overlay` bubble
- Agent messages: Left-aligned, no bubble (flat)
- Max width: 720px (centered in chat area)
- Code blocks: `--bg-surface`, `--radius-lg`, `--code-base` font

---

## Tailwind Configuration

All design tokens are mapped to Tailwind's config:

```typescript
// tailwind.config.ts (excerpt)
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#222222',
          accent: '#C2D8C4',
        },
        surface: {
          base: 'var(--bg-base)',
          card: 'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
          overlay: 'var(--bg-overlay)',
          input: 'var(--bg-input)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          DEFAULT: 'var(--border-default)',
          focus: 'var(--border-focus)',
        },
        content: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          inverse: 'var(--text-inverse)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          muted: 'var(--accent-muted)',
          subtle: 'var(--accent-subtle)',
        },
        status: {
          success: 'var(--status-success)',
          error: 'var(--status-error)',
          warning: 'var(--status-warning)',
          info: 'var(--status-info)',
          running: 'var(--status-running)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        xs: ['11px', '16px'],
        sm: ['12px', '18px'],
        base: ['14px', '22px'],
        md: ['16px', '24px'],
        lg: ['19px', '28px'],
        xl: ['23px', '32px'],
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
      },
      transitionDuration: {
        fast: '100ms',
        normal: '150ms',
        smooth: '200ms',
        enter: '250ms',
      },
      transitionTimingFunction: {
        default: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
}
```

---

## Accessibility

- All interactive elements have visible focus indicators (`--border-focus`)
- Minimum contrast ratios: 4.5:1 for body text, 3:1 for large text
- `prefers-reduced-motion` disables all non-essential animation
- `prefers-color-scheme` sets initial theme (overridable in settings)
- All icons paired with labels or `aria-label`
- Keyboard navigation: Tab through all interactive elements, Escape to
  close modals/panels
- Screen reader announcements for toast notifications and agent status
  changes via `aria-live` regions
