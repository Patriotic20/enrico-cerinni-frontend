// Open dialogs, innermost last. Keyboard handling goes only to the top one,
// and body scroll unlocks only when the last one closes.
const stack = [];

export const openLayer = () => {
  const id = Symbol('layer');
  stack.push(id);
  document.body.style.overflow = 'hidden';
  return id;
};

export const closeLayer = (id) => {
  const i = stack.indexOf(id);
  if (i !== -1) stack.splice(i, 1);
  if (!stack.length) document.body.style.overflow = '';
};

export const isTopLayer = (id) => stack.length > 0 && stack[stack.length - 1] === id;

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Keep Tab inside the dialog instead of wandering into the page behind it.
export const trapTab = (e, container) => {
  if (e.key !== 'Tab' || !container) return;
  const items = container.querySelectorAll(FOCUSABLE);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && (document.activeElement === first || !container.contains(document.activeElement))) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
};
