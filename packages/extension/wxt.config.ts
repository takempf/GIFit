import { defineConfig } from 'wxt';
import svgrPlugin from 'vite-plugin-svgr';
import path from 'path';
import { readFileSync } from 'fs';

const rootPkg = JSON.parse(
  readFileSync(path.resolve(__dirname, '../../package.json'), 'utf-8')
) as { version: string };

const isDev = process.env.NODE_ENV !== 'production';

// In dev mode, allow the WXT HMR WebSocket so the popup can receive
// live-reload updates. In production this is intentionally omitted.
let extensionPages = `script-src 'self'; object-src 'self'; connect-src 'self' https://*.posthog.com${isDev ? ' ws://localhost:4242/' : ''};`;

// See https://wxt.dev/api/config.html
export default defineConfig({
  dev: {
    server: {
      port: 4242
    }
  },
  manifest: {
    name: 'GIFit!',
    version: rootPkg.version,
    description: 'Generate GIFs from any YouTube video with ease.',
    developer: {
      name: 'Timothy Kempf',
      url: 'https://kempf.dev'
    },
    permissions: ['storage', 'contextMenus'],
    host_permissions: ['*://*.youtube.com/*'],
    content_security_policy: {
      extension_pages: extensionPages
    },
    web_accessible_resources: [
      {
        resources: ['main-world.js'],
        matches: ['*://*.youtube.com/*']
      }
    ],
    browser_specific_settings: {
      gecko: {
        id: '',
        // @ts-ignore - WXT doesn't support this field yet
        data_collection_permissions: {
          required: ['none'],
          optional: ['technicalAndInteraction']
        }
      }
    }
  },

  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  imports: false,
  vite: () => ({
    plugins: [svgrPlugin()],
    define: {
      __APP_VERSION__: JSON.stringify(rootPkg.version)
    },
    envDir: path.resolve(__dirname, '../../'),
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
