import css from './Input.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string;
  label: React.ReactNode;
  type?: HTMLInputElement['type'];
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function Input({
  name,
  label,
  type = 'text',
  value,
  onChange,
  ...restProps
}: InputProps) {
  return (
    <label className={css.input}>
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
  );
}
