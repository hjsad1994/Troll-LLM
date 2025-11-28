import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#38bdf8',
          dark: '#0ea5e9',
        },
        dark: {
          bg: '#0a0a0f',
          card: '#111118',
          border: '#1e1e2e',
        },
        background: '#0a0a0f',
      },
      backgroundColor: {
        DEFAULT: '#0a0a0f',
      },
    },
  },
  plugins: [],
}
export default config
