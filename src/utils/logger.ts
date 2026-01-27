/**
 * Logs a message to the console with a styled prefix "GIFit!".
 * The prefix is logged in bold red, followed by the errorMessage string
 * and any additional arguments provided.
 *
 * @param args - Optional additional values or objects to log.
 */
export function log(...args: unknown[]): void {
  const prefix = 'GIFit!';
  const prefixStyle = 'color: red; font-weight: bold;';

  console.log(`%c${prefix}`, prefixStyle, ...args);
}
