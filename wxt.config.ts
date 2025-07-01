import { defineConfig } from 'wxt';
import svgrPlugin from 'vite-plugin-svgr';
import path from 'path';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    permissions: ['storage'],
    host_permissions: ['*://*.youtube.com/*']
  },
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  imports: false,
  vite: () => ({
    plugins: [svgrPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    }
  })
});
