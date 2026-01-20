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
          bg: 'var(--theme-bg)',
          card: 'var(--theme-card)',
          border: 'var(--theme-border)',
        },
        background: 'var(--theme-bg)',
        foreground: 'var(--theme-text)',
        'muted-foreground': 'var(--theme-text-muted)',
        'subtle-foreground': 'var(--theme-text-subtle)',
      },
      backgroundColor: {
        DEFAULT: 'var(--theme-bg)',
      },
      textColor: {
        DEFAULT: 'var(--theme-text)',
      },
      borderColor: {
        DEFAULT: 'var(--theme-border)',
      },
    },
  },
  plugins: [],
}
export default config
