import css from './Fieldset.module.css';

interface FieldsetProps {
  children: React.ReactNode;
}

export function Fieldset({ children }: FieldsetProps) {
  return <fieldset className={css.fieldset}>{children}</fieldset>;
}
