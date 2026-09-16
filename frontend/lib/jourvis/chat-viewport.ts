export type ChatViewport = { width: number; height: number; offsetLeft?: number; offsetTop?: number };

export function chatViewportFrame(viewport: ChatViewport) {
  const { width, height } = viewport;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  const left = Number.isFinite(viewport.offsetLeft) ? Math.max(0, viewport.offsetLeft!) : 0;
  const top = Number.isFinite(viewport.offsetTop) ? Math.max(0, viewport.offsetTop!) : 0;
  return { width, height, centerX: left + width / 2, centerY: top + height / 2, compact: height < 540 };
}

/** Track the visible area, including iOS keyboard/browser-chrome changes. */
export function bindChatViewport(element: HTMLElement, host: Window = window) {
  let frame = 0;
  const viewport = host.visualViewport;
  const update = () => {
    frame = 0;
    const value = chatViewportFrame(viewport || { width: host.innerWidth, height: host.innerHeight });
    if (!value) return;
    element.style.setProperty('--rib-chat-center-x', `${value.centerX}px`);
    element.style.setProperty('--rib-chat-center-y', `${value.centerY}px`);
    element.style.setProperty('--rib-chat-viewport-width', `${value.width}px`);
    element.style.setProperty('--rib-chat-viewport-height', `${value.height}px`);
    element.dataset.compact = String(value.compact);
  };
  const schedule = () => { if (!frame) frame = host.requestAnimationFrame(update); };
  update();
  viewport?.addEventListener('resize', schedule);
  viewport?.addEventListener('scroll', schedule);
  host.addEventListener('resize', schedule);
  return () => {
    if (frame) host.cancelAnimationFrame(frame);
    viewport?.removeEventListener('resize', schedule);
    viewport?.removeEventListener('scroll', schedule);
    host.removeEventListener('resize', schedule);
  };
}
