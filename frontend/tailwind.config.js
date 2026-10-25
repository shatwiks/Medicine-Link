/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#14302E',
        'deep-teal': '#0F2F2E',
        teal: {
          DEFAULT: '#1B9C85',
          50: '#EEFBF8',
          100: '#D4F5ED',
          200: '#AAEBDD',
          300: '#6FD3BD',
          400: '#3BB89F',
          500: '#1B9C85',
          600: '#147D6A',
          700: '#126456',
          800: '#115046',
          900: '#0F2F2E',
        },
        mint: '#6FD3BD',
        surface: '#F5F7F4',
        card: '#FFFFFF',
        line: '#DDE5E1',
        muted: '#5B6B69',
        coral: {
          DEFAULT: '#D9553A',
          light: '#FDF1EE',
          border: '#F5C4B8',
        },
        amber: {
          DEFAULT: '#F2B84B',
          light: '#FEF9EC',
          border: '#FADFA4',
        },
        success: '#1B9C85',
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        input: '12px',
        card: '20px',
        pill: '999px',
      },
      boxShadow: {
        soft: '0 10px 30px rgba(15, 47, 46, 0.08)',
        lift: '0 18px 40px rgba(15, 47, 46, 0.14)',
        glow: '0 0 28px rgba(27, 156, 133, 0.35)',
      },
      backgroundImage: {
        'signature-gradient': 'linear-gradient(135deg, #0F2F2E 0%, #1B9C85 100%)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-6px)' },
          '40%, 80%': { transform: 'translateX(6px)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s infinite linear',
        marquee: 'marquee 28s linear infinite',
        shake: 'shake 0.4s ease-in-out',
      },
    },
  },
  plugins: [],
};
