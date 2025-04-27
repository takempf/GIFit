/**
 * Waits for an element matching the selector to appear within the parent element.
 *
 * @param selector - The CSS selector for the target element.
 * @param parentElement - The DOM element to search within.
 * @param timeout - Maximum time in milliseconds to wait (default: 500ms).
 * @returns A Promise that resolves with the found Element or rejects with an Error on timeout.
 */
export function waitForElement(
  selector: string,
  parentElement: Element,
  timeout: number = 500
): Promise<Element> {
  return new Promise((resolve, reject) => {
    // Check if the element already exists
    const existingElement = parentElement.querySelector(selector);
    if (existingElement) {
      resolve(existingElement);
      return;
    }

    let timeoutId: number | undefined;
    let observer: MutationObserver | undefined;

    // Set up the timeout
    timeoutId = window.setTimeout(() => {
      observer?.disconnect(); // Stop observing if timeout occurs
      reject(
        new Error(`Element "${selector}" did not appear within ${timeout}ms.`)
      );
    }, timeout);

    // Set up the MutationObserver
    observer = new MutationObserver((mutations) => {
      const targetElement = parentElement.querySelector(selector);
      if (targetElement) {
        clearTimeout(timeoutId); // Clear the timeout
        observer?.disconnect(); // Stop observing
        resolve(targetElement); // Resolve with the found element
      }
    });

    // Start observing the parent element for child list and subtree changes
    observer.observe(parentElement, {
      childList: true, // Watch for direct children additions/removals
      subtree: true // Watch for changes in all descendants
    });
  });
}
