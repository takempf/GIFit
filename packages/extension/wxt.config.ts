import { defineConfig } from 'wxt';
import svgrPlugin from 'vite-plugin-svgr';
import path from 'path';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: 'GIFit!',
    description: 'Generate GIFs from any YouTube video with ease.',
    developer: {
      name: 'Timothy Kempf',
      url: 'https://kempf.dev'
    },
    permissions: ['storage'],
    host_permissions: ['*://*.youtube.com/*'],
    web_accessible_resources: [
      {
        resources: ['main-world.js'],
        matches: ['*://*.youtube.com/*']
      }
    ]
  },

  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  imports: false,
  vite: () => ({
    plugins: [svgrPlugin()],
    resolve: {
      alias: {
        '@shared': path.resolve(__dirname, '../shared/src'),
        '@gifit/shared': path.resolve(__dirname, '../shared/src')
      }
    }
  }),

  autoIcons: {
    baseIconPath: path.resolve(__dirname, '../shared/src/assets/gifit-icon.svg')
  }
});
