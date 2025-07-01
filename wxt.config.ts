import { defineConfig } from 'wxt';
import svgrPlugin from 'vite-plugin-svgr';
import path from 'path';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: 'GIFit!',
    description: 'Generate GIFs from any YouTube video with ease.',
    permissions: ['storage'],
    host_permissions: ['*://*.youtube.com/*']
  },
  srcDir: 'src',
  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  imports: false,
  vite: () => ({
    plugins: [svgrPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    }
  }),
  autoIcons: {
    baseIconPath: path.resolve('src/assets/gifit-icon.svg')
  }
});
