let listening = false;

/** Marks the page while any text is selected, which starts the colour moving. */
export function initSelection() {
  if (listening) return;
  listening = true;
  document.addEventListener('selectionchange', () => {
    const selection = document.getSelection();
    const active = Boolean(selection && !selection.isCollapsed && selection.toString().length > 0);
    document.documentElement.classList.toggle('selecting', active);
  });
}
