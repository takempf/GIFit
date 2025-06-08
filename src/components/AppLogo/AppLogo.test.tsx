import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppLogo } from './AppLogo';
import GIFitLogo from '@/assets/gifit-logo.svg?react'; // To check if it's the rendered component

// Mock the SVG component if it's complex or to simplify testing
vi.mock('@/assets/gifit-logo.svg?react', () => ({
  default: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="gifit-logo-svg" {...props} />,
}));

describe('AppLogo', () => {
  it('should render without crashing', () => {
    render(<AppLogo />);
    expect(screen.getByTestId('gifit-logo-svg')).toBeInTheDocument();
  });

  it('should render an SVG logo', () => {
    render(<AppLogo />);
    const svgElement = screen.getByTestId('gifit-logo-svg');
    expect(svgElement).toBeInTheDocument();
    // Check if the mock SVG is used, or if GIFitLogo component is directly rendered
    // Depending on how `vite-plugin-svgr` transforms it, this might need adjustment
    // For now, data-testid on the mock is the easiest.
  });

  it('should apply default CSS class', () => {
    const { container } = render(<AppLogo />);
    // The component is motion.span, so the first child of the container might be the span
    // css.appLogo is the class for the motion.span
    // css.logo is for the SVG itself
    // We expect the motion.span to have the class from css.appLogo.
    // As module CSS class names are mangled, we can check for presence or use a regex.
    // For simplicity, checking if the className attribute exists and is not empty.
    // A more robust test would involve predictable class names or data attributes.
    const spanElement = container.firstChild;
    expect(spanElement).toHaveClass(/appLogo/); // Check for partial class name match
  });

  it('should pass through additional HTML attributes to the span element', () => {
    render(<AppLogo data-testid="custom-applogo" aria-label="Application Logo" />);
    const logoSpan = screen.getByTestId('custom-applogo');
    expect(logoSpan).toBeInTheDocument();
    expect(logoSpan).toHaveAttribute('aria-label', 'Application Logo');
  });

  // No specific `component` prop to test as it was removed or not present in the actual code.
  // No specific `size` prop to test.
});
