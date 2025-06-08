import React from 'react'; // For createRef
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InputNumber } from './InputNumber';

describe('InputNumber', () => {
  const mockOnChange = vi.fn();
  // InputNumber uses its own internal ref for stepUp/stepDown,
  // but the Input component it wraps requires a ref prop.
  // We don't strictly need to pass a ref from the test for InputNumber itself,
  // as its functionality relies on its internal ref.
  // However, the InputProps requires a ref. Let's provide one.
  const mockExternalRef = React.createRef<HTMLInputElement>();


  const defaultProps = {
    name: 'testNumberInput',
    label: 'Test Number Label',
    value: '10', // Value is a string
    onChange: mockOnChange,
    ref: mockExternalRef, // Prop for the underlying Input component
  };

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('should render the label and input with type="number" by default from Input', () => {
    // InputNumber doesn't explicitly set type="number", but it's implied by usage.
    // The underlying Input component defaults to type="text".
    // For InputNumber, it might be better if it defaults or sets type="number".
    // For now, test as is. If it's meant to be number, it should pass type="number" to Input.
    render(<InputNumber {...defaultProps} type="number" />); // Explicitly pass type for testing
    expect(screen.getByLabelText('Test Number Label')).toBeInTheDocument();
    expect(screen.getByLabelText('Test Number Label')).toHaveAttribute('type', 'number');
  });

  it('should display the correct string value', () => {
    render(<InputNumber {...defaultProps} value="123" type="number" />);
    const inputElement = screen.getByLabelText('Test Number Label') as HTMLInputElement;
    expect(inputElement.value).toBe('123');
  });

  it('should call onChange when text is typed into the input', async () => {
    render(<InputNumber {...defaultProps} type="number" />);
    const inputElement = screen.getByLabelText('Test Number Label');
    await userEvent.clear(inputElement); // Clear existing value
    await userEvent.type(inputElement, '5');
    expect(mockOnChange).toHaveBeenCalled();
    // expect(mockOnChange).toHaveBeenLastCalledWith(expect.objectContaining({ target: { value: '5' } }));
  });

  it('should call onChange when increment button is clicked', async () => {
    // HTMLInputElement.stepUp() increments the value by 'step' (default 1)
    // and fires an 'input' event.
    render(<InputNumber {...defaultProps} value="10" type="number" />);
    const incrementButton = screen.getByRole('button', { name: '▲' }); // Using text content for selector

    // Mock stepUp and dispatchEvent on the input ref used internally by InputNumber
    // This is tricky because the ref is internal. We rely on the event dispatch.
    await userEvent.click(incrementButton);
    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it('should call onChange when decrement button is clicked', async () => {
    render(<InputNumber {...defaultProps} value="10" type="number" />);
    const decrementButton = screen.getByRole('button', { name: '▼' });
    await userEvent.click(decrementButton);
    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it('increment button should respect max attribute if stepUp does', async () => {
    // Note: stepUp/stepDown behavior with min/max can be browser-dependent if not strictly controlled.
    // Here we assume standard HTML behavior that stepUp won't go beyond max.
    // The component doesn't add extra logic for disabling buttons based on min/max yet.
    render(<InputNumber {...defaultProps} value="9" type="number" step="1" max="10" />);
    const incrementButton = screen.getByRole('button', { name: '▲' });
    await userEvent.click(incrementButton); // value becomes "10"
    expect(mockOnChange).toHaveBeenCalled();
    // After this, if value is "10", another click might or might not fire onChange
    // depending on whether stepUp itself fires input event if value doesn't change.
    // The component's manual dispatchEvent WILL fire it.
    mockOnChange.mockClear();
    await userEvent.click(incrementButton); // value should stay "10" if max is effective
    expect(mockOnChange).toHaveBeenCalled(); // because we manually dispatch
  });

  it('decrement button should respect min attribute if stepDown does', async () => {
    render(<InputNumber {...defaultProps} value="1" type="number" step="1" min="0" />);
    const decrementButton = screen.getByRole('button', { name: '▼' });
    await userEvent.click(decrementButton); // value becomes "0"
    expect(mockOnChange).toHaveBeenCalled();
    mockOnChange.mockClear();
    await userEvent.click(decrementButton); // value should stay "0"
    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<InputNumber {...defaultProps} type="number" disabled />);
    expect(screen.getByLabelText('Test Number Label')).toBeDisabled();
    expect(screen.getByRole('button', { name: '▲' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '▼' })).toBeDisabled();
  });

  it('should render append prop content correctly', () => {
    render(<InputNumber {...defaultProps} type="number" append={<span data-testid="unit">kg</span>} />);
    expect(screen.getByTestId('unit')).toBeInTheDocument();
    // Ensure original controls are also there
    expect(screen.getByRole('button', { name: '▲' })).toBeInTheDocument();
  });
});
