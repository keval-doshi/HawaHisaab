interface SelectFieldProps<T extends string> {
  id: string;
  label: string;
  value: T;
  options: readonly T[];
  /** Visible text for each option value. */
  optionLabels: Record<T, string>;
  onChange: (value: T) => void;
}

/** Labelled `<select>` over a fixed list of string values. */
export function SelectField<T extends string>({
  id,
  label,
  value,
  options,
  optionLabels,
  onChange,
}: SelectFieldProps<T>) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="text-input"
        value={value}
        onChange={(e) => {
          const selected = options.find((option) => option === e.target.value);
          if (selected !== undefined) onChange(selected);
        }}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {optionLabels[option]}
          </option>
        ))}
      </select>
    </div>
  );
}
