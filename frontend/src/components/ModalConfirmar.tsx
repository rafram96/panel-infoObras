"use client";

/** Modal de confirmación reusable para acciones destructivas (borrar).
 *  Backdrop con blur, Esc o click-fuera para cancelar. */
import { useEffect } from "react";

export function ModalConfirmar({
  abierto, titulo, mensaje, detalle, confirmar = "Borrar", onConfirmar, onCancelar,
}: {
  abierto: boolean;
  titulo: string;
  mensaje: string;
  detalle?: string;
  confirmar?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  useEffect(() => {
    if (!abierto) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onCancelar(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [abierto, onCancelar]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancelar} />
      <div className="relative w-full max-w-md rounded-2xl bg-surface-container-lowest shadow-xl border border-outline-variant/10 p-6 animate-[fadeIn_.15s_ease]">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center">
            <span className="material-symbols-outlined text-red-600 text-xl">delete</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-on-surface">{titulo}</h3>
            <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">{mensaje}</p>
            {detalle && <p className="text-xs text-outline mt-2">{detalle}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onCancelar}
            className="h-9 px-4 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirmar} autoFocus
            className="h-9 px-4 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors">
            {confirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
