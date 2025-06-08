import React from 'react'; // Needed for creating refs
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';

describe('Input', () => {
  const mockOnChange = vi.fn();
  const mockRef = React.createRef<HTMLInputElement>();

  const defaultProps = {
    name: 'testInput',
    label: 'Test Label',
    value: '',
    onChange: mockOnChange,
    ref: mockRef
  };

  beforeEach(() => {
    mockOnChange.mockClear();
    // mockRef is stable, no need to reset unless its content is checked
  });

  it('should render the label and input element', () => {
    render(<Input {...defaultProps} />);
    expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'Test Label' })
    ).toBeInTheDocument();
  });

  it('should call onChange handler when text is typed', async () => {
    render(<Input {...defaultProps} />);
    const inputElement = screen.getByLabelText('Test Label');
    await userEvent.type(inputElement, 'hello');
    expect(mockOnChange).toHaveBeenCalled();
    // Number of calls depends on how userEvent.type triggers onChange for each char
    expect(mockOnChange.mock.calls.length).toBeGreaterThanOrEqual(
      'hello'.length
    );
  });

  it('should display the correct value based on the value prop', () => {
    render(<Input {...defaultProps} value="Initial Value" />);
    const inputElement = screen.getByLabelText(
      'Test Label'
    ) as HTMLInputElement;
    expect(inputElement.value).toBe('Initial Value');
  });

  it('should render with the specified type', () => {
    render(<Input {...defaultProps} type="password" />);
    // Accessible name is still "Test Label"
    expect(screen.getByLabelText('Test Label')).toHaveAttribute(
      'type',
      'password'
    );
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Input {...defaultProps} disabled />);
    expect(screen.getByLabelText('Test Label')).toBeDisabled();
  });

  it('should render placeholder text', () => {
    render(<Input {...defaultProps} placeholder="Enter text..." />);
    expect(screen.getByLabelText('Test Label')).toHaveAttribute(
      'placeholder',
      'Enter text...'
    );
  });

  it('should render prepend and append elements', () => {
    render(
      <Input
        {...defaultProps}
        prepend={<span data-testid="prepend-el">PRE</span>}
        append={<span data-testid="append-el">APP</span>}
      />
    );
    expect(screen.getByTestId('prepend-el')).toBeInTheDocument();
    expect(screen.getByTestId('append-el')).toBeInTheDocument();
  });

  it('should apply custom className to the wrapper div', () => {
    const { container } = render(
      <Input {...defaultProps} className="custom-input-class" />
    );
    expect(container.firstChild).toHaveClass('custom-input-class');
    expect(container.firstChild).toHaveClass(/input/); // Module class
  });

  it('should pass other HTML attributes to the input element', () => {
    render(<Input {...defaultProps} maxLength={10} aria-describedby="hint" />);
    const inputElement = screen.getByLabelText('Test Label');
    expect(inputElement).toHaveAttribute('maxLength', '10');
    expect(inputElement).toHaveAttribute('aria-describedby', 'hint');
  });

  // Test for ref if needed, e.g., focusing the input via the ref
  it('should forward ref to the input element', () => {
    const localRef = React.createRef<HTMLInputElement>();
    render(<Input {...defaultProps} ref={localRef} />);
    expect(localRef.current).toBeInstanceOf(HTMLInputElement);
  });

  // Error prop was mentioned in prompt but not in component code. If added:
  // it('should display error message and apply error styles if error prop is provided', () => {
  //   render(<Input {...defaultProps} error="This is an error" />);
  //   expect(screen.getByText("This is an error")).toBeInTheDocument();
  //   // Check for error class on the wrapper or input, e.g.
  //   // const inputWrapper = screen.getByLabelText('Test Label').closest(`.${css.input}`);
  //   // expect(inputWrapper).toHaveClass(/error/); // Assuming css.error exists
  // });
});
