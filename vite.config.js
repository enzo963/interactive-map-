import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import sitesApi from './vite/sitesApi.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), sitesApi()],
})
