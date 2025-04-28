import css from './Input.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  prepend?: React.ReactNode;
  append?: React.ReactNode;
  name: string;
  label: React.ReactNode;
  type?: HTMLInputElement['type'];
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function Input({
  prepend,
  append,
  name,
  label,
  type = 'text',
  value,
  onChange,
  ...restProps
}: InputProps) {
  return (
    <div className={css.input}>
      {prepend}
      <label className={css.inputAndLabel}>
        <strong className={css.label}>{label}</strong>
        <input
          className={css.actualInput}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          {...restProps}
        />
      </label>
      {append}
    </div>
  );
}
