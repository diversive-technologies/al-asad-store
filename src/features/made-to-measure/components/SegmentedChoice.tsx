import { cn } from '@/lib/utils/cn';

export interface SegmentedChoiceProps<T extends string> {
  readonly legend: string;
  /** The radio group's name — unique on the page. */
  readonly name: string;
  readonly options: readonly { readonly value: T; readonly label: string }[];
  readonly value: T;
  readonly onChange: (next: T) => void;
}

/**
 * One value out of a few, as a row of pills with a native radio group underneath
 * (A11Y-11): arrow keys move between the values, and a screen reader hears the
 * group's name and how many values it has. The unit toggle and the finishing
 * choices both use it, so the two read as one control.
 */
export function SegmentedChoice<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: SegmentedChoiceProps<T>) {
  return (
    <fieldset>
      <legend className="text-fg-muted mb-1.5 text-xs">{legend}</legend>
      <div className="border-border rounded-pill inline-flex border p-0.5">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              'rounded-pill cursor-pointer px-3 py-1 text-xs transition-colors duration-200',
              /* The store's own ring: gold on the light surface measures about
                 1.7:1, under the 3:1 a focus indicator needs. */
              'has-[:focus-visible]:ring-brand-500 has-[:focus-visible]:ring-2',
              'motion-reduce:transition-none',
              option.value === value ? 'mm-unit-on' : 'text-fg-muted hover:text-fg',
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => {
                onChange(option.value);
              }}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
