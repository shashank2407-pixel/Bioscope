import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./components/**/*.{js,ts,jsx,tsx,mdx}', './app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Cyanotype palette: Prussian-blue ink, paper white, specimen-tag yellow.
        ink: {
          950: '#061521',
          900: '#0A1F30',
          800: '#0F2A40',
          700: '#153650',
          600: '#1E4766',
          500: '#2B5A7C',
        },
        paper: '#E8F1F4',
        mist: '#A3BAC7',
        fog: '#7593A5',
        tag: '#F2C14E',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
