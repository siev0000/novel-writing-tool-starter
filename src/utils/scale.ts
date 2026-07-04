const BASE_WIDTH = 720;
const BASE_HEIGHT = 1600;

export function applyGlobalScale(targetId = 'scalable-root') {
  const baseRatio = BASE_WIDTH / BASE_HEIGHT;
  let stableScreenWidth = window.innerWidth;
  let stableScreenHeight = window.innerHeight;

  const isTextEditingElement = (element: Element | null) => {
    if (!(element instanceof HTMLElement)) return false;
    if (element instanceof HTMLTextAreaElement) return true;
    if (element instanceof HTMLInputElement) {
      return !['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit'].includes(element.type);
    }
    return element.isContentEditable;
  };

  const resize = () => {
    const rawScreenW = window.innerWidth;
    const rawScreenH = window.innerHeight;
    const isEditing = isTextEditingElement(document.activeElement);

    if (!isEditing) {
      stableScreenWidth = rawScreenW;
      stableScreenHeight = rawScreenH;
    }

    const screenW = isEditing ? stableScreenWidth : rawScreenW;
    const screenH = isEditing ? stableScreenHeight : rawScreenH;
    const currentRatio = screenW / screenH;

    const scale = currentRatio > baseRatio
      ? screenH / BASE_HEIGHT
      : screenW / BASE_WIDTH;

    const target = document.getElementById(targetId);
    if (!target) return;

    const logicalHeight = Math.max(BASE_HEIGHT, screenH / scale);
    const logicalWidth = Math.min(Math.max(BASE_WIDTH, screenW / scale), logicalHeight);
    target.style.setProperty('--app-width', `${logicalWidth}px`);
    target.style.setProperty('--app-height', `${logicalHeight}px`);
    target.style.width = `${logicalWidth}px`;
    target.style.height = `${logicalHeight}px`;
    target.parentElement?.style.setProperty('--app-width', `${logicalWidth}px`);
    target.parentElement?.style.setProperty('--app-height', `${logicalHeight}px`);
    if (target.parentElement) {
      target.parentElement.style.width = `${rawScreenW}px`;
      target.parentElement.style.height = `${rawScreenH}px`;
    }
    target.style.transform = `scale(${scale})`;
    target.style.transformOrigin = 'top left';
  };

  const handleFocusChange = () => {
    window.setTimeout(resize, 0);
  };

  window.addEventListener('resize', resize);
  window.addEventListener('focusin', handleFocusChange);
  window.addEventListener('focusout', handleFocusChange);
  resize();

  return () => {
    window.removeEventListener('resize', resize);
    window.removeEventListener('focusin', handleFocusChange);
    window.removeEventListener('focusout', handleFocusChange);
  };
}

export function getCurrentScale() {
  const scaleX = window.innerWidth / BASE_WIDTH;
  const scaleY = window.innerHeight / BASE_HEIGHT;
  return Math.min(scaleX, scaleY);
}

export { BASE_WIDTH, BASE_HEIGHT };
