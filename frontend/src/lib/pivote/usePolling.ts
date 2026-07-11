"use client";

/** Auto-refresh cortés: ejecuta `fn` cada `ms` SOLO mientras la pestaña está
 *  visible. Al pasar a segundo plano se pausa (no martillea el backend con la
 *  laptop minimizada); al volver al primer plano dispara una vez de inmediato
 *  —para ponerse al día— y reanuda. `activo=false` lo apaga por completo.
 *
 *  No dispara en el montaje: la carga inicial la hace cada página en su propio
 *  effect (así no duplicamos el primer fetch). */
import { useEffect, useRef } from "react";

export function usePolling(fn: () => void, ms: number, activo = true) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!activo) return;
    let timer: ReturnType<typeof setInterval> | null = null;

    const arrancar = () => {
      if (timer == null) timer = setInterval(() => fnRef.current(), ms);
    };
    const parar = () => {
      if (timer != null) { clearInterval(timer); timer = null; }
    };

    const onVisibilidad = () => {
      if (document.visibilityState === "visible") {
        fnRef.current();   // ponerse al día al volver
        arrancar();
      } else {
        parar();
      }
    };

    document.addEventListener("visibilitychange", onVisibilidad);
    if (document.visibilityState === "visible") arrancar();

    return () => {
      document.removeEventListener("visibilitychange", onVisibilidad);
      parar();
    };
  }, [ms, activo]);
}
