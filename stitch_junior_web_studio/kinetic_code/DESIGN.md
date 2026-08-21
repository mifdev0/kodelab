---
name: Kinetic Code
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#3d4947'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f0f1f1'
  outline: '#6d7a77'
  outline-variant: '#bcc9c6'
  surface-tint: '#006a61'
  primary: '#00685f'
  on-primary: '#ffffff'
  primary-container: '#008378'
  on-primary-container: '#f4fffc'
  inverse-primary: '#6bd8cb'
  secondary: '#006b5f'
  on-secondary: '#ffffff'
  secondary-container: '#62fae3'
  on-secondary-container: '#007165'
  tertiary: '#b90538'
  on-tertiary: '#ffffff'
  tertiary-container: '#dc2c4f'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#89f5e7'
  primary-fixed-dim: '#6bd8cb'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#005049'
  secondary-fixed: '#62fae3'
  secondary-fixed-dim: '#3cddc7'
  on-secondary-fixed: '#00201c'
  on-secondary-fixed-variant: '#005047'
  tertiary-fixed: '#ffdadb'
  tertiary-fixed-dim: '#ffb2b7'
  on-tertiary-fixed: '#40000d'
  on-tertiary-fixed-variant: '#92002a'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display-lg:
    fontFamily: Public Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Public Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-sm:
    fontFamily: Public Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Public Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Public Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: Public Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-padding: 24px
  gutter: 16px
  touch-target-min: 44px
---

## Brand & Style

The design system is engineered for the "pro-junior" demographic: middle schoolers who have outgrown block-based coding and are ready for professional syntax but still require a welcoming, low-anxiety environment. The aesthetic sits at the intersection of **Corporate Modern** and **Soft Minimalism**, utilizing high-quality whitespace and intentional pops of color to guide the learning journey.

The emotional response should be one of "capability." By avoiding overly bright primary colors or illustrative "mascot" UI, the system signals to the user that they are using a real tool, while the soft shapes and warm background ensure the environment remains approachable and forgiving.

## Colors

The palette is anchored by a warm off-white (#FAFAFA) which reduces eye strain during long coding sessions compared to pure white. 

- **Primary Action:** Teal (#0D9488) is used for "Commit," "Run," and "Save" actions, providing a sense of stability and success.
- **Accents:** Pastel-leaning blues, greens, and corals are reserved for code syntax highlighting and status indicators (e.g., coral for errors, green for success).
- **Interactive States:** Use a 10% opacity overlay of the primary color for hover states and a 20% overlay for active/pressed states.

## Typography

The typography system prioritizes legibility and clarity. **Public Sans** provides a sturdy, institutional yet friendly feel for the UI, ensuring that instructions are easy to parse. 

**JetBrains Mono** is utilized for all code blocks and terminal outputs. The slightly increased x-height and distinct character shapes (like the '0' vs 'O') are critical for helping students identify syntax errors. 

For mobile and iPad views, `display-lg` should scale down to 32px to ensure heading text does not wrap awkwardly in the IDE sidebar.

## Layout & Spacing

The layout utilizes a **fluid-to-fixed hybrid model**. The main IDE (Integrated Development Environment) area is fluid to maximize the coding canvas, while sidebar panels (Lesson content, File explorer) are fixed-width to maintain readability.

**Key Layout Rules:**
- **Grid:** 12-column grid for dashboard views; 3-pane layout for the editor (Explorer / Editor / Preview).
- **Touch Optimization:** Because this platform is used on iPads, all interactive elements (buttons, nav links, chevron toggles) must maintain a minimum hit area of 44x44px, even if the visual element is smaller.
- **Margins:** Use a generous 24px outer margin to prevent the UI from feeling cramped.

## Elevation & Depth

This design system uses a **Tonal Layering** approach combined with **Ambient Shadows**. 

- **Level 0 (Base):** The #FAFAFA background.
- **Level 1 (Panels):** Pure white (#FFFFFF) surfaces used for the code editor and sidebar cards. These are separated from the base by a 1px solid border (#E2E8F0).
- **Level 2 (Popovers/Modals):** Elements that float above the UI use a soft, multi-layered shadow: `0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)`. 

Avoid heavy dark shadows; the depth should feel like stacked sheets of thick cardstock.

## Shapes

The shape language is defined by "Friendly Precision." 
- **Standard UI Elements:** Buttons, inputs, and small cards use a **12px (`rounded-lg`)** radius.
- **Main Containers:** Large editor windows and preview panes use a **16px (`rounded-xl`)** radius.
- **Selection Indicators:** Active states in the sidebar (selected files) use a 6px radius to maintain a distinct look from the primary buttons.

## Components

### Buttons
- **Primary:** Teal background, white text, 12px radius. Height: 48px for touch-friendliness.
- **Secondary:** Soft gray border (#E2E8F0), teal text, white background.
- **Ghost:** No border or background unless hovered. Used for utility actions like "Copy Link."

### Input Fields
- Use a 1px border (#E2E8F0) and a subtle 2px inner shadow to suggest "insertability." On focus, the border changes to Teal with a 3px soft outer glow (Teal at 10% opacity).

### Chips & Tags
- Used for programming languages (e.g., "Javascript," "Python"). These should have a light tinted background corresponding to the language icon and 100px (pill) radius.

### Cards (Lessons/Projects)
- Cards should feature a 1px border and no shadow in their default state. Upon hover, they should lift slightly with a soft ambient shadow and a Teal border-bottom (2px) to indicate interactivity.

### Code Editor Pane
- The editor should have a "gutter" for line numbers using a slightly darker version of the neutral color (#F1F5F9). The active line should be highlighted with a very faint Teal horizontal band (5% opacity).