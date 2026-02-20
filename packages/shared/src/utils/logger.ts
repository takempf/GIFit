const BRAND_COLOR = 'rgb(207, 10, 55)';
// Lighter version (50% mix with white)
const SECTION_COLOR = 'rgb(231, 132, 155)';

const PREFIX_BASE = 'GIFit!';

function print(
  section: string,
  method: 'log' | 'warn' | 'error',
  args: unknown[]
): void {
  if (import.meta.env.DEV) {
    const format = `%c${PREFIX_BASE} %c[${section}]`;
    const baseStyle = `color: ${BRAND_COLOR}; font-weight: bold;`;
    const sectionStyle = `color: ${SECTION_COLOR}; font-weight: bold;`;

    console[method](format, baseStyle, sectionStyle, ...args);
  }
}

export function createLogger(section: string) {
  return {
    log: (...args: unknown[]) => print(section, 'log', args),
    warn: (...args: unknown[]) => print(section, 'warn', args),
    error: (...args: unknown[]) => print(section, 'error', args)
  };
}

export const logger = createLogger('Global');
