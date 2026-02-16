declare module 'critters' {
  export interface Options {
    path?: string;
    publicPath?: string;
    external?: boolean;
    inlineThreshold?: number;
    minimumExternalSize?: number;
    pruneSource?: boolean;
    mergeStylesheets?: boolean;
    additionalStylesheets?: string[];
    preload?: 'body' | 'media' | 'swap' | 'js' | 'js-lazy';
    noscriptFallback?: boolean;
    inlineFonts?: boolean;
    preloadFonts?: boolean;
    fonts?: boolean;
    keyframes?: string;
    compress?: boolean;
    logLevel?: 'info' | 'warn' | 'error' | 'trace' | 'debug' | 'silent';
    reduceInlineStyles?: boolean;
    logger?: Logger;
  }

  export interface Logger {
    trace?: (message: string) => void;
    debug?: (message: string) => void;
    info?: (message: string) => void;
    warn?: (message: string) => void;
    error?: (message: string) => void;
  }

  export default class Critters {
    constructor(options: Options);
    process(html: string): Promise<string>;
    readFile(filename: string): Promise<string> | string;
    getCssAsset(href: string): Promise<string | undefined> | string | undefined;
  }
}
