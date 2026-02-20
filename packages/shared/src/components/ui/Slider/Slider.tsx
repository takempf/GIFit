import React from 'react';
import { Slider as BaseSlider } from '@base-ui/react/slider';
import classNames from 'classnames';
import css from './Slider.module.css';

interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  className?: string;
  disabled?: boolean;
  'data-testid'?: string;
  marks?: boolean;
}

export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  className,
  disabled,
  marks = false,
  ...props
}: SliderProps) {
  const id = React.useId();
  const labelId = label ? `${id}-label` : undefined;

  const renderMarks = () => {
    if (!marks) return null;
    const steps = [];
    // Ensure we have a valid range and step
    if (max > min && step > 0) {
      const count = (max - min) / step;
      // Limit marks to avoid performance/rendering issues if count is too high
      if (count <= 100) {
        for (let i = 0; i <= count; i++) {
          const val = min + i * step;
          const percent = ((val - min) / (max - min)) * 100;
          steps.push(
            <div
              key={val}
              className={css.Mark}
              style={{ left: `${percent}%` }}
              data-testid="slider-mark"
            />
          );
        }
      }
    }
    return steps;
  };

  return (
    <BaseSlider.Root
      value={value}
      onValueChange={(val) => onValueChange(val as number)}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      className={classNames(css.root, className)}
      thumbAlignment="edge"
      {...props}>
      {label && (
        <label id={labelId} className={css.label}>
          {label}
        </label>
      )}
      <div className={css.sliderWrapper}>
        <BaseSlider.Control className={css.Control}>
          <BaseSlider.Track className={css.Track}>
            <BaseSlider.Indicator className={css.Indicator} />
            {renderMarks()}
            <BaseSlider.Thumb
              className={css.Thumb}
              aria-labelledby={labelId}
              aria-label={label ? undefined : 'Slider'}
            />
          </BaseSlider.Track>
        </BaseSlider.Control>
        <BaseSlider.Value className={css.Value} />
      </div>
    </BaseSlider.Root>
  );
}
