import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Add client brand colors here
        brand: {
          DEFAULT: '#00A4AC',
          50: '#E0FFF9',
          100: '#B3FFF0',
          500: '#00A4AC',
          600: '#008A91',
          900: '#003A3D',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)'],
        mono: ['var(--font-geist-mono)'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
} satisfies Config
