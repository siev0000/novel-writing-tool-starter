const BASE_WIDTH = 720;
const BASE_HEIGHT = 1080;

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

    target.style.transform = `translate(-50%, -50%) scale(${scale})`;
    target.style.transformOrigin = 'center center';
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
