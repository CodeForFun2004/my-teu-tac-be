---
name: Imperial Heritage Modern
colors:
  surface: '#16130a'
  surface-dim: '#16130a'
  surface-bright: '#3c392e'
  surface-container-lowest: '#100e06'
  surface-container-low: '#1e1c12'
  surface-container: '#222015'
  surface-container-high: '#2d2a1f'
  surface-container-highest: '#383529'
  on-surface: '#e9e2d2'
  on-surface-variant: '#c0c9c1'
  inverse-surface: '#e9e2d2'
  inverse-on-surface: '#333025'
  outline: '#8a938c'
  outline-variant: '#404943'
  surface-tint: '#9cd2b5'
  primary: '#9cd2b5'
  on-primary: '#003825'
  primary-container: '#06402b'
  on-primary-container: '#77ac90'
  inverse-primary: '#356850'
  secondary: '#e9c349'
  on-secondary: '#3c2f00'
  secondary-container: '#af8d11'
  on-secondary-container: '#342800'
  tertiary: '#ffb4ac'
  on-tertiary: '#690007'
  tertiary-container: '#760009'
  on-tertiary-container: '#ff776c'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#b8efd0'
  primary-fixed-dim: '#9cd2b5'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#1b503a'
  secondary-fixed: '#ffe088'
  secondary-fixed-dim: '#e9c349'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#ffdad6'
  tertiary-fixed-dim: '#ffb4ac'
  on-tertiary-fixed: '#410003'
  on-tertiary-fixed-variant: '#92030f'
  background: '#16130a'
  on-background: '#e9e2d2'
  surface-variant: '#383529'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 56px
    fontWeight: '700'
    lineHeight: 64px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
  headline-md:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-sm:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.1em
  label-md:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1200px
  gutter: 24px
  margin-desktop: 64px
  section-gap: 80px
---

## Brand & Style

The design system is a "Premium Vietnamese Cultural" aesthetic that bridges the gap between historical imperial grandeur and contemporary digital youthfulness. It is inspired by the vibrant world of Vietnamese traditional puppetry (*Múa rối nước*), temple architecture, and lacquered woodcraft.

The brand personality is **Handcrafted**, **Festive**, and **Regal**. It targets a youthful, culturally-conscious audience that values artisanal quality and traditional storytelling. The UI should evoke the feeling of opening a luxury lacquered box—dense with detail yet refined in its execution.

The visual style is a hybrid of **Modern Minimalism** for structural layout and **Tactile Ornamentalism** for detailing. High-contrast golden accents, thin ornamental line-work, and organic cloud patterns create a sense of depth and celebration without cluttering the user journey.

## Colors

This design system uses a palette deeply rooted in Vietnamese architectural and natural motifs:

- **Primary Background (Forest Green - #06402B):** Represents the deep waters of water puppetry and the lush landscapes of Northern Vietnam. Used for main surface backgrounds to create a moody, premium atmosphere.
- **Accents & Borders (Imperial Gold - #D4AF37):** Used for interactive elements, borders, and ornamental motifs. This color should be treated as "light," often replacing standard white for highlights.
- **Typography & Contrast (Warm Cream - #FFF8E7):** Used for readability. It softens the interface compared to pure white, maintaining a "paper-like" or "silk-like" warmth.
- **Decorative Highlights (Deep Red - #B22222):** Used sparingly for badges, status indicators, or critical call-to-actions to evoke the festive spirit of traditional lacquerware.

## Typography

The typography strategy pairs a high-contrast serif with a contemporary humanist sans-serif to reflect the "Traditional yet Modern" vision.

- **Headlines:** Use **Playfair Display**. Its elegant serifs and varying stroke weights mimic traditional calligraphy and look premium against the dark green background.
- **Body & Labels:** Use **Be Vietnam Pro**. This font was specifically chosen for its excellent support of Vietnamese diacritics and its friendly, clean geometry that ensures readability in dense layouts.

**Styling Rules:**
- Apply `text-transform: uppercase` and wider `letter-spacing` for `label-lg` to create a rhythmic, structured feel in navigation and metadata.
- Headlines should predominantly use the **Warm Cream** color, while high-priority titles can use **Imperial Gold**.

## Layout & Spacing

The layout philosophy follows a **Fixed Grid** model to maintain the "framed" feel of a stage or a traditional painting. 

- **Grid Model:** 12-column grid with a maximum container width of 1200px for desktop. 
- **Rhythm:** An 8px base unit drives all spacing. 
- **Visual Framing:** Containers and sections should often be framed with thin 1px gold borders to create a structured, "boxed" aesthetic reminiscent of altar architecture or lacquer screens.
- **Negative Space:** Generous margins (64px+) are required between main sections to allow the dark forest green background to "breathe," emphasizing the premium nature of the content.

## Elevation & Depth

Hierarchy is achieved through **Tonal Layering** and **Ornamental Outlines** rather than heavy drop shadows.

- **Surface Levels:** 
  - Level 0: Forest Green (#06402B) base.
  - Level 1: A slightly lighter/desaturated green for container backgrounds to indicate elevation.
- **Outlines:** Use "Ghost Borders"—1px strokes of Imperial Gold at 30-50% opacity for standard containers, and 100% opacity for active/hover states.
- **Accents:** Depth is further suggested by "Floating Motifs." Stylized gold clouds or lotus patterns should be placed as background elements with low opacity, creating a parallax-like depth when scrolling.
- **Glow:** For primary buttons or critical highlights, a very subtle "Golden Amber" outer glow can be used to simulate candle-light or lanterns.

## Shapes

The shape language is primarily **Geometric and Structured**, mirroring the woodworking and architecture of traditional Vietnamese "Đình" (communal houses).

- **Corners:** Stick to **Soft** (0.25rem) roundedness. This prevents the UI from feeling too sharp/aggressive while maintaining a professional, rigid structure. 
- **Ornamental Shapes:** Use circles for avatars or decorative icons to symbolize the "Moon" or "Fullness" in cultural motifs.
- **Dividers:** Instead of simple lines, use 1px gold lines that terminate in small "knot" or "lotus" icons to reinforce the handcrafted theme.

## Components

### Buttons
- **Primary:** Deep Red (#B22222) background with Warm Cream text. Bold, rectangular with minimal 4px rounding. 
- **Secondary:** Transparent background with an Imperial Gold border and Gold text.
- **Hover State:** Add a subtle "Gold Leaf" texture overlay or a slight increase in border thickness.

### Input Fields
- **Style:** Underlined fields rather than boxed fields, using the Imperial Gold for the line. Labels should use `label-lg` in Warm Cream.

### Cards
- **Structure:** Darker green containers with 1px gold borders. 
- **Corner Accents:** Use "L-shaped" gold ornamental corners (stylized clouds) on card headers to give them a ritualistic, premium feel.

### Chips & Tags
- **Style:** Small, pill-shaped elements with a Deep Red background and Cream text, or Gold borders with Cream text for less urgent categories.

### Ornamental Dividers
- Vertical and horizontal lines should use a gradient: `Transparent -> Imperial Gold -> Transparent` to create a shimmering, thread-like appearance.

### Imagery
- Images should be framed with a thin gold border. Use a slight darkening overlay on background images to ensure the Warm Cream text remains legible.