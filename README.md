![GIFit Rudd Dancing](/src/assets/gifit-chrome-store-icon.png)

Making a GIF can be intimidating. With GIFit, it isn't so intimidating anymore. Just install GIFit and you can make GIFs out of pieces of any YouTube video. Inherit the power of the GIF gods!

![GIFit in action](/screenshots/gifit-screenshot-1.png)

## Installing

### Chrome Web Store (Easy Mode)

You can install the latest production version of GIFit! from the [Chrome Web Store](https://chrome.google.com/webstore/detail/gifit/khoojcphcmgcplkpckkjpdlloooifgec).

### Compile GIFit from Source (Hard Mode)

Here are some quick and easy steps for compilation success:

1. [Download](https://github.com/Fauntleroy/GIFit/archive/master.zip) or clone this repository and unzip it.
2. Install [Node.js](https://nodejs.org/) (which includes npm) if you haven't already.
3. Open your terminal, navigate to the cloned repository directory, and run `npm install` to install the project dependencies.
4. Run `npm run dev` for Chrome development or `npm run dev:firefox` for Firefox development. This will build the extension and start a development server with hot reloading. The unpacked extension files will be located in the `.output/chrome-mv3/` or `.output/firefox-mv2/` directory respectively.
5. **For Chrome:**
   - Navigate to `chrome://extensions/`.
   - Enable "Developer mode" (usually a toggle in the top right).
   - Click "Load unpacked" and select the `GIFit/.output/chrome-mv3` directory.
6. **For Firefox:**
   - Navigate to `about:debugging#/runtime/this-firefox`.
   - Click "Load Temporary Add-on...".
   - Select any file within the `GIFit/.output/firefox-mv2/` directory (e.g., `manifest.json`).
7. Navigate to [YouTube](http://youtube.com). You should now see a "GIFit!" button in video toolbars.

If you have any problems with the extension, be sure to speak up and [file issues](https://github.com/Fauntleroy/GIFit/issues)!

## Contributing

Contributing to this project is EASY, provided that you love GIFs and aren't afraid of JS/TS. This project uses [WXT](https://wxt.dev/) (which includes [Vite](https://vitejs.dev/)), [React](http://facebook.github.io/react/), [TypeScript](https://www.typescriptlang.org/), and CSS Modules.

The `package.json` defines several npm scripts for development:

- `npm run dev`: Starts the WXT development server for Chrome, which builds the extension and enables hot reloading.
- `npm run dev:firefox`: Starts the WXT development server for Firefox.
- `npm run build`: Compiles the extension for production (Chrome by default). The output will be in the `.output/chrome-mv3/` directory.
- `npm run build:firefox`: Compiles the extension for Firefox production. The output will be in the `.output/firefox-mv2/` directory.
- `npm run zip`: Builds and zips the extension for Chrome.
- `npm run zip:firefox`: Builds and zips the extension and source code for Firefox.
- `npm run compile`: Runs the TypeScript compiler to check for type errors.
- `npm run test`: Runs Vitest unit tests.
- `npm run test:e2e`: Runs Playwright end-to-end tests.
- `npm run lint`: Lints the codebase using ESLint.
- `npm run lint:fix`: Lints and automatically fixes issues.

The old test commands (`npm run test` for SauceLabs, `npm run test:browser`) mentioned previously are outdated. Please use `npm run test` for unit tests and `npm run test:e2e` for end-to-end tests.

When fixing bugs/adding features please make **NEW BRANCHES** and submit pull reqs. Please follow the existing code style as well as you're able. Make sure the tests are passing, and if you add any new features, you add tests for them.

When fixing bugs/adding features please make **NEW BRANCHES** and submit pull reqs. Please follow the existing code style as well as you're able. Make sure the tests are passing, and if you add any new features, you add tests for them.
