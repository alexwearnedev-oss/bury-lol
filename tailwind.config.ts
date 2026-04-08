import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core backgrounds
        bg:         '#0D0B1E',
        surface:    '#12102A',
        surfaceHi:  '#1A1835',
        border:     '#2A2450',
        // Brand purple
        purple:     '#6B5DB8',
        purpleDark: '#4A3B8C',
        purpleLight:'#9B8FD8',
        // Accents
        gold:       '#C8A96E',
        goldDim:    '#A07840',
        moss:       '#2D5A35',
        crimson:    '#8B3D52',
        // Text
        cream:      '#F0EBE3',
        muted:      '#A89FC0',
        dim:        '#6B6480',
        // Tombstone stone colours (keep)
        stone:      '#545770',
        mausoleum:  '#3C3489',
      },
      fontFamily: {
        pixel: ['var(--font-pixel)', 'monospace'],
        vt323: ['var(--font-vt323)', 'monospace'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
        mono: ['Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
