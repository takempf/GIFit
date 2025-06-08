import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Fieldset } from './Fieldset';

describe('Fieldset', () => {
  it('should render children correctly', () => {
    render(
      <Fieldset>
        <legend>Test Legend</legend>
        <input type="text" aria-label="test-input" />
      </Fieldset>
    );
    // A fieldset's default accessible name can be derived from its <legend>
    expect(
      screen.getByRole('group', { name: /Test Legend/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('test-input')).toBeInTheDocument();
  });

  it('should apply the fieldset CSS class', () => {
    const { container } = render(
      <Fieldset>
        <div data-testid="child" />
      </Fieldset>
    );
    // Check if the fieldset element (first child of container) has the CSS module class
    const fieldsetElement = container.firstChild;
    expect(fieldsetElement).toHaveClass(/fieldset/); // Regex match for CSS module class
  });

  // The component does not have legend, description, or error props as per the read_files output.
  // If these were added, tests would look like:
  // it('should render legend when legend prop is provided', () => {
  //   render(<Fieldset legend="My Legend">...</Fieldset>);
  //   expect(screen.getByText('My Legend', { selector: 'legend' })).toBeInTheDocument();
  // });
  // it('should render description when description prop is provided', () => {
  //   render(<Fieldset description="My Description">...</Fieldset>);
  //   expect(screen.getByText('My Description')).toBeInTheDocument(); // Assuming it renders in a <p> or <span>
  // });
  // it('should render error when error prop is provided and apply error class', () => {
  //   render(<Fieldset error="My Error">...</Fieldset>);
  //   expect(screen.getByText('My Error')).toBeInTheDocument(); // Assuming error is rendered
  //   const fieldsetElement = screen.getByRole('group'); // Or however you query it
  //   expect(fieldsetElement).toHaveClass(/error/); // Assuming css.error exists
  // });
});
