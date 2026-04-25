---
name: Jewellery Association Design System
colors:
  surface: '#fcf8f8'
  surface-dim: '#ddd9d9'
  surface-bright: '#fcf8f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f1edec'
  surface-container-high: '#ebe7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#444748'
  inverse-surface: '#313030'
  inverse-on-surface: '#f4f0ef'
  outline: '#747878'
  outline-variant: '#c4c7c8'
  surface-tint: '#5d5f5f'
  primary: '#5d5f5f'
  on-primary: '#ffffff'
  primary-container: '#ffffff'
  on-primary-container: '#747676'
  inverse-primary: '#c6c6c7'
  secondary: '#5d5f5f'
  on-secondary: '#ffffff'
  secondary-container: '#dcdddd'
  on-secondary-container: '#5f6161'
  tertiary: '#5d5f5f'
  on-tertiary: '#ffffff'
  tertiary-container: '#ffffff'
  on-tertiary-container: '#747676'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c7'
  on-primary-fixed: '#1a1c1c'
  on-primary-fixed-variant: '#454747'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#fcf8f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
typography:
  h1:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: '0'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  data-tabular:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: '0'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  container-margin: 24px
  gutter: 16px
---

## Brand & Style
The brand personality of this design system is authoritative, prestigious, and utilitarian. It is designed for a high-end Jewellery Association, serving as a reliable source for market data, trade communication, and financial utility. 

The aesthetic follows a **Minimalist-Corporate** movement. It prioritizes clarity and precision over decorative flair. The use of high-contrast typography against a stark white and light grey canvas reflects the industry’s focus on purity and value, while the gold accents provide a subtle nod to the luxury and precious metals sector. The emotional response should be one of institutional trust and professional efficiency.

## Colors
The palette is intentionally restrained to maintain a high-end corporate feel. 

- **Primary White (#FFFFFF):** Used for the main canvas and base layers to ensure a clean, airy feel.
- **Secondary Light Grey (#F5F5F5):** Used for card backgrounds, section delimiters, and input fills to provide subtle depth without heavy borders.
- **Accent Gold (#D4AF37):** Reserved for high-value actions, active states, and brand-critical highlights. It should be used sparingly to maintain its impact.
- **Text Black (#1A1A1A):** A high-contrast charcoal for maximum legibility in financial data and long-form text.
- **Market Indicators:** For market trends and rates, a sophisticated Emerald Green (#15803D) and a deep Crimson Red (#B91C1C) are used for "up" and "down" movements respectively, ensuring they are distinct but not neon.

## Typography
This design system utilizes **Inter** for its neutral, systematic, and highly legible qualities. The hierarchy is structured to support complex data visualization and financial reporting.

- **Data Readability:** For price rates and numerical tables, the `data-tabular` style must be used. This ensures numbers align vertically by using tabular (monospaced) figures, which is critical for comparing live gold prices.
- **Case Usage:** Uppercase is reserved for `label-caps` to distinguish meta-data or section headers from body content.
- **Weighting:** Semi-bold (600) is used for headers to establish clear hierarchy without appearing aggressive.

## Layout & Spacing
This design system employs a **Fixed Grid** philosophy based on an 8px spacing rhythm. 

- **Grid:** A 12-column grid is used for desktop views, transitioning to a flexible single-column layout for mobile with 24px side margins.
- **Rhythm:** All vertical spacing should be a multiple of 8px. 16px is the default gutter between related components, while 48px is used to separate distinct content sections.
- **Density:** As a business utility, the spacing should feel "airy" but not sparse, allowing for high information density in data tables while maintaining focus.

## Elevation & Depth
Depth is conveyed through **Tonal Layers** and **Ambient Shadows** rather than heavy borders.

- **Surface Strategy:** The background is white. Cards and containers use the Secondary Light Grey (#F5F5F5) to distinguish themselves.
- **Shadows:** Use a single, highly diffused shadow style for cards: `0px 4px 20px rgba(26, 26, 26, 0.05)`. This creates a subtle lift that feels modern and professional.
- **Interactive States:** On hover, a card’s shadow may slightly intensify to `0px 8px 30px rgba(26, 26, 26, 0.08)` to provide feedback, but no "glow" or color-tinted shadows are permitted.

## Shapes
In alignment with the "high-end corporate" style, this design system avoids highly rounded or playful geometries. 

- **Corner Radius:** A consistent **4px** radius is used for small elements like checkboxes, input fields, and small tags. 
- **Large Elements:** Larger components such as cards and modal containers use an **8px** radius.
- **Consistency:** Never use "pill" shapes or circular buttons (except for icons). Every container must maintain its structured, rectangular integrity.

## Components
Consistent implementation of components ensures the utility remains professional.

- **Buttons:** Primary buttons are Solid Black (#1A1A1A) with White text. Secondary buttons are outlined in Light Grey with Black text. Accent buttons (Gold) are used only for "Membership" or "Premium" calls to action.
- **Cards:** Cards should have no border; instead, use the #F5F5F5 background fill and the defined ambient shadow.
- **Input Fields:** Use a 4px radius, a White background, and a 1px border of #F5F5F5. On focus, the border changes to Gold (#D4AF37).
- **Market Tickers:** Components displaying live rates should include small upward or downward chevrons in the trend colors (Green/Red) alongside the tabular data.
- **Lists:** Member lists and transaction histories should use a clean line-item style with 1px #F5F5F5 dividers.
- **Data Tables:** Headers should use `label-caps` typography with a subtle grey background fill.