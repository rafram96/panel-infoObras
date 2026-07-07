/** Placeholder de carga con brillo (usa el keyframe `shimmer` de globals.css).
 *  Evita el salto de layout y el frío "Cargando…" mientras llegan los datos
 *  del auto-refresh. */
import { cx } from "@/lib/ui";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cx("relative overflow-hidden rounded bg-surface-container-high", className)}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-black/[0.06] to-transparent dark:via-white/[0.08]" />
    </div>
  );
}

/** Filas fantasma para tablas mientras cargan. */
export function SkeletonTabla({ filas = 5, columnas = 4 }: { filas?: number; columnas?: number }) {
  return (
    <div className="divide-y divide-outline-variant/10" aria-hidden="true">
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          {Array.from({ length: columnas }).map((_, j) => (
            <Skeleton key={j} className={cx("h-4", j === 0 ? "flex-1" : "w-16")} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Tarjetas métricas fantasma. */
export function SkeletonMetricas({ n = 3 }: { n?: number }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <div
          key={i}
          className="bg-surface-container-lowest p-4 border-l-4 border-outline-variant/20 shadow-ambient rounded-xl flex items-start gap-4"
        >
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-6 w-12" />
          </div>
        </div>
      ))}
    </>
  );
}
