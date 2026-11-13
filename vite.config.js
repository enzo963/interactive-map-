import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import sitesApi from './vite/sitesApi.js'
import publishedSites from './vite/publishedSites.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [publishedSites(), react(), sitesApi()],
  server: { host: '127.0.0.1', cors: false },
  preview: { host: '127.0.0.1' },
  build: {
    sourcemap: false,
    manifest: true,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{
            name: (id) => id.startsWith('\0heritage-sites/') ? `sites-${id.slice('\0heritage-sites/'.length)}` : null,
            test: (id) => id.startsWith('\0heritage-sites/'),
            includeDependenciesRecursively: false,
          }, {
            name: 'archive-shared',
            test: (id) => /\/src\/(data|services|utils)\//.test(id.replaceAll('\\', '/')) && !id.endsWith('navigation.js'),
            minShareCount: 2,
            includeDependenciesRecursively: false,
          }, {
            name: 'three-renderer',
            test: (id) => /\/node_modules\/three\/build\/three\.module\.js$/.test(id.replaceAll('\\', '/')),
            includeDependenciesRecursively: false,
          }],
        },
      },
    },
  },
})
