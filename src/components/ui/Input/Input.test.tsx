import React from 'react'; // Import React
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, vi, describe, it } from 'vitest';
import { Input } from './Input';

describe('Input', () => {
  it('renders with default props', () => {
    render(
      <Input
        name="test-input"
        label="Test Input"
        value=""
        onChange={() => {}}
      />
    );
    expect(screen.getByLabelText('Test Input')).toBeDefined();
  });

  it('renders with a placeholder', () => {
    render(
      <Input
        name="test-input"
        label="Test Input"
        value=""
        placeholder="Enter text"
        onChange={() => {}}
      />
    );
    expect(screen.getByPlaceholderText('Enter text')).toBeDefined();
  });

  it('calls onChange when typing and updates input value for controlled component', async () => {
    let currentValue = ''; // Tracks the "state" of the parent component
    const handleChangeMock = vi.fn(); // For counting calls and basic checks

    const AppControlledInput = () => {
      const [value, setValue] = React.useState(currentValue);

      const testOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        handleChangeMock(event); // Call original mock
        currentValue = event.target.value; // Update outer scope "parent state"
        setValue(event.target.value); // Update local state for re-render
      };

      return (
        <Input
          name="test-input"
          label="Test Input"
          value={value}
          onChange={testOnChange}
        />
      );
    };

    render(<AppControlledInput />);
    const inputElement = screen.getByLabelText(
      'Test Input'
    ) as HTMLInputElement;

    await userEvent.type(inputElement, 'h');
    expect(currentValue).toBe('h');
    expect(inputElement.value).toBe('h');

    await userEvent.type(inputElement, 'e');
    expect(currentValue).toBe('he');
    expect(inputElement.value).toBe('he');

    await userEvent.type(inputElement, 'llo');
    expect(currentValue).toBe('hello');
    expect(inputElement.value).toBe('hello');

    expect(handleChangeMock).toHaveBeenCalledTimes(5);
  });

  it('renders with prepend and append elements', () => {
    render(
      <Input
        name="test-input"
        label="Test Input"
        value=""
        onChange={() => {}}
        prepend={<span>Before</span>}
        append={<span>After</span>}
      />
    );
    expect(screen.getByText('Before')).toBeDefined();
    expect(screen.getByText('After')).toBeDefined();
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <Input
        name="test-input"
        label="Test Input"
        value=""
        onChange={() => {}}
        disabled
      />
    );
    const inputElement = screen.getByLabelText(
      'Test Input'
    ) as HTMLInputElement;
    expect(inputElement.disabled).toBe(true);
  });
});
