# Theme Name: Editorial

# Vibe & Description: Magazine-like editorial design that prioritizes refined typesetting and a professional information hierarchy. Oversized headlines, elegant font layering, and generous whitespace create a strong reading rhythm. Content is structured with magazine-inspired grids and card layouts, anchored by high-contrast black-and-white tones and elevated with a restrained accent color. Delicate dividers, subtle shadows, and understated transitions add premium polish and improve readability.

# Color
:root {
  --background: 0 0% 98%;
  --foreground: 0 0% 7%;
  --card: 0 0% 100%;
  --card-foreground: 0 0% 7%;
  --muted: 0 0% 95%;
  --muted-foreground: 0 0% 33%;
  --border: 0 0% 90%;
  --primary: 0 0% 7%;
  --primary-foreground: 0 0% 100%;
  --accent: 354 64% 33%; /* deep red (#8B1E1E) - choose ONE accent */
  --accent-foreground: 0 0% 100%;
  --ring: 0 0% 7% / 0.25;
  --radius: 12px;
  --shadow-sm: 0 1px 3px rgba(0,0,0,.06);
  --shadow-md: 0 10px 30px rgba(0,0,0,.10);
  --tracking-tight: -0.02em;
  --leading-body: 1.8;
}
.dark {
  --background: 0 0% 6%;
  --foreground: 0 0% 96%;
  --card: 0 0% 9%;
  --card-foreground: 0 0% 96%;
  --muted: 0 0% 12%;
  --muted-foreground: 0 0% 72%;
  --border: 0 0% 18%;
  --primary: 0 0% 96%;
  --primary-foreground: 0 0% 6%;
  --accent: 43 59% 44%; /* muted gold (#B08A2E) - optional in dark */
  --accent-foreground: 0 0% 6%;
  --ring: 0 0% 96% / 0.18;
  --radius: 12px;
}
- Title: Recommendation: Use a serif font with humanistic characteristics, such as "Playfair Display".
- Body text: Do not modify, use the default font.
# Font
- Heading & Body: PlayfairDisplay (url: https://resource-static.cdn.bcebos.com/fonts/Playfair_Display.woff2)
# Animation
## Element Animation
- Buttons slowly lift on hover (ease-out);
- Images slowly zoom within their container on hover, rather than changing abruptly.
## Transition Animation
- When scrolling down, create a relaxed, unhurried scrolling experience. Elements fade in and float upward as they enter the viewport.

# Layout
- Prefer asymmetry within structure: allow certain modules (hero image, quote block) to break the grid for editorial impact.
- Use a magazine-like grid as the backbone: clean alignment and generous whitespace.

# Elements
- Masthead / Header: magazine title, issue-style navigation, subtle separators;
- Cover Hero: oversized headline, deck (lead paragraph), author/date/reading time metadata.



