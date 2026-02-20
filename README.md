<p align="center">
   <img src="/packages/shared/src/assets/gifit-logo.svg" alt="GIFit Logo" width="200px" />
</p>

<p align="center">
   Making GIFs out of videos can be a bit of a pain. GIFit makes it ridiculously easy.
</p>

![GIFit in action](/screenshots/gifit-screenshot.avif)

## What is GIFit?

GIFit is a browser extension that seamlessly integrates with YouTube to provide an intuitive interface for creating high-quality GIFs. With GIFit, you can create a GIF out of any segment of a YouTube video, without ever leaving the browser.

## How to Use

1. Navigate to any [YouTube](https://youtube.com) video.
2. You can launch GIFit in two ways:
   - Click the **"GIFit!"** button located directly inside the YouTube video player's toolbar.
   - Right-click anywhere on the page and select **"Create a GIF"** from the context menu.
3. The GIFit poup will open. Use the timeline or input fields to specify your desired start and end times.
4. Configure options like width, height, framerate, and quality.
5. Click **Create GIF** to start processing, wait for the progress bar, and then save your new GIF!

## Where to Download

### Chrome Web Store (Easy Mode)

You can install the latest production version of GIFit! from the [Chrome Web Store](https://chrome.google.com/webstore/detail/gifit/khoojcphcmgcplkpckkjpdlloooifgec).

### Compile GIFit from Source (Hard Mode)

If you prefer to build the extension yourself:

1. Clone this repository, or [download the ZIP file](https://github.com/takempf/GIFit/archive/master.zip) and extract it.
2. Install [Node.js](https://nodejs.org/) (which includes npm) if you haven't already.
3. Open your terminal, navigate to the cloned repository directory, and run `npm install` to install the project dependencies.
4. Run `npm run extension:build` to build the extension. The unpacked extension files will be located in the `packages/extension/.output/chrome-mv3/` directory.
5. **For Chrome:**
   - Navigate to `chrome://extensions/`.
   - Enable "Developer mode" (usually a toggle in the top right).
   - Click "Load unpacked" and select the `packages/extension/.output/chrome-mv3` directory.
6. Navigate to [YouTube](https://youtube.com). You should now be able to use the extension.

## Contributing

GIFit is structured as a **monorepo** utilizing npm workspaces.

The project uses [WXT](https://wxt.dev/) (powered by [Vite](https://vitejs.dev/)) for the extension, [React](http://facebook.github.io/react/), [TypeScript](https://www.typescriptlang.org/), and CSS Modules.

The project is pretty locked down, so as long as your new code lints, compiles, and passes the tests you should be fine.

### Repository Structure

- `packages/extension/`: The browser extension (WXT).
- `packages/web/`: A promotional/documentation website (Vite).
- `packages/shared/`: Shared React components, hooks, and logic.

### Working on the Extension

The core browser extension is located in `packages/extension/`.

To build and run the extension locally:

1. Ensure you have installed dependencies from the root directory (`npm install`).
2. Run `npm run extension:dev` to build the extension and start a development server with hot reloading. The unpacked extension files will be located in the `packages/extension/.output/chrome-mv3/` directory. You may need to [install and configure the test browser](https://wxt.dev/guide/essentials/config/browser-startup) before this works properly.
3. A debug browser should open with GIFit preloaded. Select it from the toolbar extension menu, or right-click the page and select "Create a GIF".

To build the extension for production, run `npm run extension:build` from the project root.

### Working on the Website

The project includes a promotional and documentation website located in `packages/web/`.

To build and run the website locally:

1. Ensure you have installed dependencies from the root directory (`npm install`).
2. Run `npm run website:dev` to start the local Vite development server.
3. Open your browser to the URL provided in your terminal (usually `http://localhost:5173`).

To build the website for production, run `npm run website:build`.

### Commands

The root `package.json` defines several npm scripts for development:

- `npm install`: Install dependencies for all workspaces.
- `npm run extension:dev`: Starts the WXT development server for the Chrome extension with hot reloading.
- `npm run extension:dev:firefox`: Starts the WXT development server for the Firefox extension.
- `npm run extension:build`: Builds the Chrome extension for production.
- `npm run extension:build:firefox`: Builds the Firefox extension for production.
- `npm run extension:zip`: Builds and zips the Chrome extension.
- `npm run extension:zip:firefox`: Builds and zips the Firefox extension.
- `npm run website:dev`: Starts the Vite development server for the website.
- `npm run website:build`: Builds the website for production.
- `npm run validate`: Runs the linter and TypeScript compiler.
- `npm run test`: Runs Vitest unit tests across all packages.
- `npm run test:e2e`: Runs Playwright end-to-end tests.
- `npm run lint`: Lints the codebase using ESLint.

When fixing bugs or adding features, please make **NEW BRANCHES** and submit pull requests. Please follow the existing code style, ensure `npm run validate` passes without errors, and add tests for any new functionality. If you have any problems with the extension, please [file issues](https://github.com/takempf/GIFit/issues)!
