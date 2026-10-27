import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  // chemins relatifs : le build se dépose tel quel sur un hébergement statique
  base: './',
  plugins: [react(), tailwindcss()],
})
