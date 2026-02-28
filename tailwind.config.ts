import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-display)', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-mono)', 'SF Mono', 'Monaco', 'Consolas', 'monospace'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      colors: {
        /* Qualia Brand — Warm Teal */
        qualia: {
          DEFAULT: '#00A4AC',
          primary: '#00A4AC',
          dark: '#008C93',
          50: '#E6F7F8',
          100: '#CCF0F1',
          200: '#99E1E4',
          300: '#66D2D6',
          400: '#33C3C9',
          500: '#00A4AC',
          600: '#008C93',
          700: '#006F75',
          800: '#005258',
          900: '#003A3D',
          950: '#002628',
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        info: 'hsl(var(--info))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        // Refined shadow system
        'glow-sm': '0 0 12px -4px hsl(174 60% 38% / 0.12)',
        glow: '0 0 20px -4px hsl(174 60% 38% / 0.15)',
        'glow-lg': '0 0 32px -8px hsl(174 60% 38% / 0.18)',
        'glow-xl': '0 0 48px -12px hsl(174 60% 38% / 0.2)',
        'inner-glow': 'inset 0 1px 0 0 hsl(0 0% 100% / 0.04)',
        // Depth system
        'depth-1': '0 1px 2px rgba(0,0,0,0.06), 0 1px 1px rgba(0,0,0,0.04)',
        'depth-2': '0 2px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'depth-3': '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        'depth-4': '0 8px 24px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.06)',
        // Inline edit focus
        'inline-focus': '0 0 0 2px hsl(174 60% 38% / 0.15)',
        // Card hover
        'card-hover': '0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px hsl(174 60% 38% / 0.06)',
        // Elevation system — 5 tiers
        'elevation-1': '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        'elevation-2': '0 3px 8px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.06)',
        'elevation-3': '0 6px 16px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)',
        'elevation-4': '0 16px 48px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.08)',
        'elevation-5': '0 24px 64px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.1)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'glass-gradient':
          'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        shimmer: 'shimmer 1.5s ease-in-out infinite',
        'fade-in': 'fadeIn 0.2s cubic-bezier(0.16,1,0.3,1) forwards',
        'slide-up': 'slideUp 0.25s cubic-bezier(0.16,1,0.3,1) forwards',
        'slide-in': 'slideIn 0.2s cubic-bezier(0.16,1,0.3,1) forwards',
        'bounce-subtle': 'bounceSubtle 2s ease-in-out infinite',
        'pulse-subtle': 'pulseSubtle 3s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16,1,0.3,1) forwards',
        'fade-in-up': 'fadeInUp 0.25s cubic-bezier(0.16,1,0.3,1) forwards',
        'modal-enter': 'modalEnter 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'stagger-in': 'staggerIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards',
        'tooltip-pop': 'tooltipPop 0.2s cubic-bezier(0.34,1.56,0.64,1) forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-4px) scale(1.01)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '0.75' },
          '50%': { opacity: '1' },
        },
        'pulse-glow': {
          '0%, 100%': {
            boxShadow: '0 0 16px -4px hsl(174 60% 38% / 0.2)',
            opacity: '1',
          },
          '50%': {
            boxShadow: '0 0 24px -4px hsl(174 60% 38% / 0.3)',
            opacity: '0.95',
          },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        modalEnter: {
          '0%': { opacity: '0', transform: 'scale(0.92)', filter: 'blur(4px)' },
          '100%': { opacity: '1', transform: 'scale(1)', filter: 'blur(0)' },
        },
        staggerIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        tooltipPop: {
          '0%': { opacity: '0', transform: 'scale(0.9) translateY(2px)' },
          '70%': { transform: 'scale(1.02) translateY(0)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.16, 1, 0.3, 1)',
        'ease-out-expo': 'cubic-bezier(0.19, 1, 0.22, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        bounce: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
      },
      transitionDuration: {
        '400': '400ms',
      },
      zIndex: {
        'inline-edit': '35',
        dropdown: '40',
        sticky: '45',
        modal: '50',
        popover: '55',
        overlay: '60',
        assistant: '65',
        toast: '70',
        tooltip: '80',
        command: '90',
        max: '100',
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
