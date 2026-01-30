import { useState, useEffect } from 'react';

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = '$0.00',
  className = '',
  disabled,
}: CurrencyInputProps) {
  // Format raw value for display
  const formatDisplayValue = (val: string) => {
    if (!val) return '';
    const num = parseFloat(val);
    if (isNaN(num)) return '';
    // Use Intl.NumberFormat for currency formatting but standard string handling for typing
    // Actually, simple regex is better for controlled input

    // Split integer and decimal
    const parts = val.split('.');
    const integerPart = parts[0];
    const decimalPart = parts.length > 1 ? '.' + parts[1] : '';

    // Add commas to integer part
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    return `$${formattedInteger}${decimalPart}`;
  };

  const [displayValue, setDisplayValue] = useState(formatDisplayValue(value));

  // Sync with prop changes (external updates)
  useEffect(() => {
    // Only update if the parsed values differ to avoid cursor jumping loops if possible
    // But since displayValue includes formatting, strict equality might fail
    // We re-format the incoming value
    const formatted = formatDisplayValue(value);

    // Simple heuristic: If the raw value matches what we expect from current display, don't clobber
    // But here we want to ensure sync.
    if (value === '') setDisplayValue('');
    else setDisplayValue(formatted);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;

    // Remove non-numeric chars except dot
    // Also remove $ and ,
    const raw = input.replace(/[^0-9.]/g, '');

    // Prevent multiple dots
    const parts = raw.split('.');
    if (parts.length > 2) return; // Ignore input with second dot

    // Update parent with raw value
    onChange(raw);

    // Update local display immediately for responsiveness (though effect will also fire)
    // We don't format immediately while typing to allow standard behavior,
    // BUT requirements say "shown each time the user input a value".
    // So we try to format on the fly.

    // Edge case: User types "." -> raw is "." -> display "$."
    // Edge case: User types "1000" -> raw "1000" -> display "$1,000"

    if (raw === '') {
      setDisplayValue('');
    } else {
      const integerPart = parts[0];
      const decimalPart = parts.length > 1 ? '.' + parts[1] : '';
      const formattedInteger = integerPart.replace(
        /\B(?=(\d{3})+(?!\d))/g,
        ','
      );
      setDisplayValue(`$${formattedInteger}${decimalPart}`);
    }
  };

  return (
    <input
      type="text"
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
    />
  );
}
