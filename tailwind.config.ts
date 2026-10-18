import type { Config } from 'tailwindcss';

// Brand tokens taken from the existing THEParents site.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#fceed1', // page background
        teal: { DEFAULT: '#2d545e', dark: '#1f3d45' }, // cards, primary actions
        ink: '#1f2a2e', // body text
        gold: '#c9972b', // hope accent, used sparingly
      },
      fontFamily: {
        display: ['var(--font-display)', 'var(--font-body)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
