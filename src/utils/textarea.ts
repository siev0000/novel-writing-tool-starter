export function resizeTextarea(textarea: HTMLTextAreaElement | null, maxRows = 15) {
  if (!textarea) return;
  const computedStyle = window.getComputedStyle(textarea);
  const lineHeight = Number.parseFloat(computedStyle.lineHeight) || 24;
  const paddingTop = Number.parseFloat(computedStyle.paddingTop) || 0;
  const paddingBottom = Number.parseFloat(computedStyle.paddingBottom) || 0;
  const maxHeight = lineHeight * maxRows + paddingTop + paddingBottom;
  textarea.style.height = 'auto';
  textarea.style.maxHeight = `${maxHeight}px`;
  textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
}
