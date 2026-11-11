import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import sitesApi from './vite/sitesApi.js'
import immutableAssets from './vite/immutableAssets.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), sitesApi(), immutableAssets()],
  build: {
    manifest: true,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{
            name: 'archive-shared',
            test: (id) => /\/src\/(data|services|utils)\//.test(id.replaceAll('\\', '/')) && !id.endsWith('navigation.js'),
            minShareCount: 2,
            includeDependenciesRecursively: false,
          }],
        },
      },
    },
  },
})