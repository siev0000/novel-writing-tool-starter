const BASE_WIDTH = 720;
const BASE_HEIGHT = 1600;

export function applyGlobalScale(targetId = 'scalable-root') {
  const baseRatio = BASE_WIDTH / BASE_HEIGHT;

  const resize = () => {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
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
      target.parentElement.style.width = `${screenW}px`;
      target.parentElement.style.height = `${screenH}px`;
    }
    target.style.transform = `scale(${scale})`;
    target.style.transformOrigin = 'top left';
  };

  window.addEventListener('resize', resize);
  resize();

  return () => {
    window.removeEventListener('resize', resize);
  };
}

export function getCurrentScale() {
  const scaleX = window.innerWidth / BASE_WIDTH;
  const scaleY = window.innerHeight / BASE_HEIGHT;
  return Math.min(scaleX, scaleY);
}

export { BASE_WIDTH, BASE_HEIGHT };
