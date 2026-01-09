import type { Config } from 'tailwindcss'

export default {
  content: ['./**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Add client brand colors
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
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
