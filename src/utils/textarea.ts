export function resizeTextarea(textarea: HTMLTextAreaElement | null, maxRows?: number) {
  if (!textarea) return;
  const computedStyle = window.getComputedStyle(textarea);
  const lineHeight = Number.parseFloat(computedStyle.lineHeight) || 24;
  const paddingTop = Number.parseFloat(computedStyle.paddingTop) || 0;
  const paddingBottom = Number.parseFloat(computedStyle.paddingBottom) || 0;
  textarea.style.height = 'auto';
  if (typeof maxRows === 'number' && maxRows > 0) {
    const maxHeight = lineHeight * maxRows + paddingTop + paddingBottom;
    textarea.style.maxHeight = `${maxHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    return;
  }
  textarea.style.maxHeight = 'none';
  textarea.style.overflowY = 'hidden';
  textarea.style.height = `${textarea.scrollHeight}px`;
}
