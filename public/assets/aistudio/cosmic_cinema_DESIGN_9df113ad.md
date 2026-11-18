---
name: Cosmic Cinema
colors:
  surface: '#12131a'
  surface-dim: '#12131a'
  surface-bright: '#383941'
  surface-container-lowest: '#0d0e15'
  surface-container-low: '#1a1b23'
  surface-container: '#1e1f27'
  surface-container-high: '#292932'
  surface-container-highest: '#33343d'
  on-surface: '#e3e1ec'
  on-surface-variant: '#c9c4d6'
  inverse-surface: '#e3e1ec'
  inverse-on-surface: '#2f3038'
  outline: '#928e9f'
  outline-variant: '#474554'
  surface-tint: '#c7bfff'
  primary: '#c7bfff'
  on-primary: '#2b029d'
  primary-container: '#8e7fff'
  on-primary-container: '#25008c'
  inverse-primary: '#5b49cb'
  secondary: '#d6baff'
  on-secondary: '#430089'
  secondary-container: '#5e15b5'
  on-secondary-container: '#c8a4ff'
  tertiary: '#4fdbcc'
  on-tertiary: '#003732'
  tertiary-container: '#00a296'
  on-tertiary-container: '#00302b'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e4deff'
  primary-fixed-dim: '#c7bfff'
  on-primary-fixed: '#180065'
  on-primary-fixed-variant: '#422cb3'
  secondary-fixed: '#ecdcff'
  secondary-fixed-dim: '#d6baff'
  on-secondary-fixed: '#280056'
  on-secondary-fixed-variant: '#5e15b5'
  tertiary-fixed: '#70f8e8'
  tertiary-fixed-dim: '#4fdbcc'
  on-tertiary-fixed: '#00201d'
  on-tertiary-fixed-variant: '#005049'
  background: '#12131a'
  on-background: '#e3e1ec'
  surface-variant: '#33343d'
typography:
  display-hero:
    fontFamily: Space Grotesk
    fontSize: 56px
    fontWeight: '700'
    lineHeight: 64px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Space Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  title-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 0.75rem
  margin: 3rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style
The design system establishes an immersive, cinematic, and deep-space visual language tailored for creative entertainment discovery. It is designed for cinephiles, casual viewers, and narrative enthusiasts who seek an atmospheric, distraction-free environment to explore films and television.

The aesthetic leans into **Atmospheric Glassmorphism**, balancing pitch-black void spaces with radiant chromatic nebulae. Interfaces evoke the tranquility and vastness of deep space while delivering high-density information clearly. Frosted translucent materials, illuminated borders, and luminous spectral genre coding deliver depth without visual clutter, keeping the focus entirely on cover art, previews, and editorial metadata.

## Colors
The palette is built upon a canvas of near-black cosmic navy (`#07080f`), shifting focus outward to vibrant, luminous accents.

### Core Canvas & Surfacing
- **Base Canvas:** Deep space navy `#07080f`.
- **Glass Panel Surface:** `rgba(13, 16, 28, 0.65)` layered over subtle atmospheric gradients.
- **Glass Panel Border:** `rgba(255, 255, 255, 0.08)`.
- **Primary Text:** Crisp off-white `#eef0f6` ensures optimal contrast against dark backdrops.
- **Secondary / Supporting Text:** Muted blue-gray `#8b93a7` for metadata, labels, and timestamps.
- **Brand Accent:** Electric violet `#8b7bff`, used for key interactive elements, focus states, and primary CTAs.

### Genre Semantic Tokens
To categorize narratives instantly across large browsing grids, the system utilizes explicit, saturated categorical tokens:
- **Action & Adventure:** `#ff6b35`
- **Sci-Fi & Fantasy:** `#a66bff`
- **Horror:** `#d00000`
- **Crime & Thriller:** `#2ec4b6`
- **Comedy:** `#ffd23f`
- **Romance:** `#ff77b7`
- **Drama:** `#4d96ff`
- **Animation & Family:** `#b8e986`
- **Documentary:** `#c0c7d1`
- **Other:** `#6b7280`

Use these genre colors strictly on pill indicators, indicator dots, or faint badge glow effects (maximum 15% opacity when applied to fills).

## Typography
Headlines utilize **Space Grotesk**, bringing a technical, cinematic cadence that evokes science fiction and astronomical instruments. Body, navigational labels, and metadata rely on **Inter**, chosen for its extreme legibility at small sizes, neutral geometry, and clear letter spacing over dark glass panels.

- Headlines must remain concise and bold.
- Use uppercase for `label-sm` when used for genre chips, release years, and movie ratings (e.g., `PG-13`, `4K HDR`).
- Never set paragraphs in Space Grotesk; retain Inter for all descriptive copy, film synopses, and actor credits to guarantee readability.

## Layout & Spacing
The layout adheres to a 12-column fluid grid system on desktop, an 8-column layout on tablets, and a 4-column layout on mobile devices.

### Layout Rhythm
- **Desktop (1200px+):** Outer margins are generous (`margin: 3rem`), evoking the vast isolation of open space. Poster cards conform to 4, 3, or 2-column spans.
- **Tablet (768px - 1199px):** Margins drop to `1.5rem` with a `1rem` column gutter. Media shelves enable smooth horizontal edge-to-edge overflow scrolling.
- **Mobile (< 768px):** Outer margins tighten to `1rem` to maximize screen real estate for high-impact visual artwork.

Maintain large vertical gaps between sections (`space-xl` or larger) to prevent dense clusters of titles and preserve an uncluttered, premium cinematic rhythm.

## Elevation & Depth
Depth is created through glass stratification and ethereal radial auras rather than opaque drop shadows.

### Atmospheric Nebula Layers
The background canvas features static or slowly undulating radial blurs in deep violet (`rgba(139, 123, 255, 0.12)`) and cosmic indigo (`rgba(77, 150, 255, 0.08)`) placed beneath the content layer, providing dimensional illumination through glass elements.

### Glassmorphism System
- **Base Level (Canvas):** Pure `#07080f` background with faint cosmic ambient light.
- **Card / Surface Level:** `background: rgba(13, 16, 28, 0.65)`, `backdrop-filter: blur(16px)`, `border: 1px solid rgba(255, 255, 255, 0.08)`.
- **Floating Modals / Flyouts:** `background: rgba(13, 16, 28, 0.85)`, `backdrop-filter: blur(24px)`, `border: 1px solid rgba(255, 255, 255, 0.14)`, with an ambient colored shadow `box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), 0 0 40px rgba(139, 123, 255, 0.08)`.
- **Interactive State (Hover/Active):** Surfaces elevate by brightening borders to `rgba(255, 255, 255, 0.2)` and emitting a localized violet rim glow (`0 0 20px rgba(139, 123, 255, 0.25)`).

## Shapes
A roundedness value of 2 establishes a smooth, modern radius of `16px` (`1rem`) on standard cards, surface panels, and preview sheets. 

- **Cards and Panels:** Consistently set to 16px radius (`rounded-lg`), softening technical aesthetics and letting imagery bleed comfortably into the frame.
- **Chips, Pills, and Badges:** Fully rounded (`rounded-full` / 9999px) to contrast against structural rectilinear card containers.
- **Input Fields & Buttons:** Standardized to 8px–12px radius, balancing tactile accessibility with structural precision.

## Components

### Buttons
- **Primary:** Solid electric violet (`#8b7bff`) background, pure white text, font weight 600. On hover, applies an outward glow (`0 0 24px rgba(139, 123, 255, 0.45)`).
- **Secondary (Glass):** `rgba(255, 255, 255, 0.05)` fill, `rgba(255, 255, 255, 0.12)` border, text `#eef0f6`. Hover shifts fill to `rgba(255, 255, 255, 0.1)`.
- **Ghost / Icon:** Transparent fill, `#8b93a7` icon color; transitions to `#eef0f6` and faint violet background pill on hover.

### Chips & Genre Tags
- Rendered with full pill curvature, containing a 6px status dot illuminated with the respective genre semantic color.
- Background uses subtle tinting (`rgba(255, 255, 255, 0.04)`) with an ultra-thin perimeter (`rgba(255, 255, 255, 0.08)`).
- Text style adheres to `label-sm` in off-white.

### Media Cards (Poster & Backdrop)
- Encased in glass panels with `16px` border-radius and `overflow: hidden`.
- Image displays a subtle dark gradient vignette at the bottom edge to maintain text contrast for overlaid titles and ratings.
- On hover: smooth scale transition (`scale: 1.02`), panel border intensifies to `rgba(139, 123, 255, 0.4)`, and background glow blooms softly.

### Input Fields & Search Bars
- Glass background `rgba(13, 16, 28, 0.7)` with `backdrop-filter: blur(12px)`.
- Border `1px solid rgba(255, 255, 255, 0.1)`. Placeholder text set to `#8b93a7`.
- Focus state: border color switches to `#8b7bff` accompanied by a `0 0 12px rgba(139, 123, 255, 0.3)` glow.

### Checkboxes & Radio Buttons
- Base geometry: 18px box (4px radius for checkbox, circular for radio).
- Inactive: `border: 1px solid rgba(255, 255, 255, 0.2)`, `background: rgba(13, 16, 28, 0.5)`.
- Selected: `#8b7bff` background with white checkmark/indicator and subtle inner lighting.

### TMDB Attribution Block
- Mandatory footer or sheet attribution component: discreet, low-contrast container.
- Displays the primary TMDB seal/logo in monochrome `#8b93a7` accompanied by `body-sm` text: *"This product uses the TMDB API but is not endorsed or certified by TMDB."*
- Unobtrusive placement ensures compliance while keeping interface immersion intact.