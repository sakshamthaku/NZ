import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],

  // Use the repository path only for the production GitHub Pages build.
  // Local development continues to run from the domain root.
  base: mode === 'production' ? '/NZ/' : '/',
}))
