"use client";

/** Toaster de feedback efímero para acciones (crear/renombrar/borrar). Antes
 *  esas mutaciones hacían `if (r.ok) recargar()` y en error fallaban en
 *  silencio — el evaluador no sabía si su acción funcionó. Esto lo hace visible.
 *
 *  Sin dependencias: un store a nivel de módulo + `toast()` invocable desde
 *  cualquier página. Se monta UNA vez en PanelShell. Colores del sistema TONO. */
import { useEffect, useState } from "react";
import { TONO, cx } from "@/lib/ui";

export type ToastTono = "ok" | "error" | "info";

interface Toast {
  id: number;
  mensaje: string;
  tono: ToastTono;
}

const ICONO: Record<ToastTono, string> = {
  ok: "check_circle",
  error: "error",
  info: "info",
};

let seq = 1;
let cola: Toast[] = [];
const listeners = new Set<(t: Toast[]) => void>();

function emitir() {
  for (const l of listeners) l(cola);
}

function descartar(id: number) {
  cola = cola.filter((t) => t.id !== id);
  emitir();
}

/** Muestra un toast. Los de error viven más tiempo (hay que leerlos). */
export function toast(mensaje: string, tono: ToastTono = "ok") {
  const id = seq++;
  cola = [...cola, { id, mensaje, tono }];
  emitir();
  setTimeout(() => descartar(id), tono === "error" ? 7000 : 4500);
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>(cola);
  useEffect(() => {
    listeners.add(setItems);
    setItems(cola);
    return () => { listeners.delete(setItems); };
  }, []);

  return (
    <div
      className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] sm:w-auto pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {items.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-start gap-2.5 rounded-xl px-4 py-3 shadow-ambient border border-outline-variant/15 bg-surface-container-lowest text-sm animate-[toast-in_.2s_ease]"
        >
          <span className={cx("material-symbols-outlined text-[20px] flex-shrink-0", TONO[t.tono].texto)}>
            {ICONO[t.tono]}
          </span>
          <span className="text-on-surface leading-snug pt-px flex-1">{t.mensaje}</span>
          <button
            onClick={() => descartar(t.id)}
            aria-label="Cerrar"
            className="ml-1 -mr-1 text-outline hover:text-on-surface transition-colors flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      ))}
    </div>
  );
}
