import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react';

const digitsOnly = (s) => s.replace(/\D/g, '');
const group = (digits) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/**
 * Drop-in for <input type="number"> on UZS amounts: shows "3,500,000" while
 * typing, and onChange still gets e.target.value as plain digits ("3500000").
 * Whole sums only: UZS has no cents. `as` renders through another input
 * component (e.g. forms/Input) that forwards its ref.
 */
const MoneyInput = forwardRef(function MoneyInput({ as: Component = 'input', value, onChange, ...props }, ref) {
  const inner = useRef(null);
  const caretDigits = useRef(null);
  useImperativeHandle(ref, () => inner.current);

  // "3500000.00" from the API -> "3500000"
  const raw = value == null || Number.isNaN(value) ? '' : digitsOnly(String(value).split('.')[0]);

  // Reformatting adds/removes commas; put the caret back after the same digit.
  useLayoutEffect(() => {
    const el = inner.current;
    if (caretDigits.current == null || !el) return;
    let left = caretDigits.current;
    let pos = 0;
    while (pos < el.value.length && left > 0) {
      if (/\d/.test(el.value[pos])) left--;
      pos++;
    }
    el.setSelectionRange(pos, pos);
    caretDigits.current = null;
  });

  const handleChange = (e) => {
    const el = e.target;
    caretDigits.current = digitsOnly(el.value.slice(0, el.selectionStart ?? el.value.length)).length;
    onChange?.({ target: { value: digitsOnly(el.value), name: el.name, id: el.id } });
  };

  return (
    <Component
      {...props}
      ref={inner}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={group(raw)}
      onChange={handleChange}
    />
  );
});

export default MoneyInput;
