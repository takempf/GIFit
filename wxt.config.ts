import { defineConfig } from 'wxt';
import svgrPlugin from 'vite-plugin-svgr';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    host_permissions: ['*://*.youtube.com/*']
  },
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  imports: false,
  vite: () => ({
    plugins: [svgrPlugin()]
  })
});
