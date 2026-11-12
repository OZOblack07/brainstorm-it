import type { Config } from 'tailwindcss';
export default { content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'], theme: { extend: { colors: {
  felt: '#17453F', feltdk: '#0E2F2B', wood: '#2B221B', paper: '#FBF4E0', parch: '#EADFC2', ink: '#231C15',
  brass: '#D9A441', brick: '#B5432F', flame: '#F0907A', okay: '#9CC77E', sea: '#3E7CA0' },
  fontFamily: { serif: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'] } } }, plugins: [] } satisfies Config;
