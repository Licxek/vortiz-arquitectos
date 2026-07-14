/**
 * Helper para trabajar con scroll cuando el scroll vive en <app-root>
 * en vez de window (por el fix de overscroll de Chrome Android).
 */

/** Obtiene el elemento que hace scroll (app-root o fallback a window) */
export function obtenerContenedorScroll(): HTMLElement | Window {
  const appRoot = document.querySelector('app-root') as HTMLElement | null;
  return appRoot ?? window;
}

/** Scroll top del contenedor real (app-root) */
export function scrollAlInicio(smooth: boolean = false) {
  const contenedor = obtenerContenedorScroll();
  contenedor.scrollTo({
    top: 0,
    behavior: smooth ? 'smooth' : 'auto',
  });
}

/** Scroll a Y específico del contenedor real */
export function scrollA(y: number, smooth: boolean = false) {
  const contenedor = obtenerContenedorScroll();
  contenedor.scrollTo({
    top: y,
    behavior: smooth ? 'smooth' : 'auto',
  });
}

/** Obtiene el scrollY actual del contenedor real */
export function obtenerScrollY(): number {
  const appRoot = document.querySelector('app-root') as HTMLElement | null;
  return appRoot?.scrollTop ?? window.scrollY;
}

/** Suscribirse a scroll del contenedor real. Devuelve función para cleanup. */
export function escucharScroll(
  callback: (y: number) => void,
): () => void {
  const appRoot = document.querySelector('app-root') as HTMLElement | null;
  const target: EventTarget = appRoot ?? window;

  const handler = () => {
    const y = appRoot?.scrollTop ?? window.scrollY;
    callback(y);
  };

  target.addEventListener('scroll', handler, { passive: true });

  return () => {
    target.removeEventListener('scroll', handler);
  };
}
