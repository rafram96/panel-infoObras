/** Barra de progreso. Determinada si se pasan `valor`/`total`; si no, animada
 *  (indeterminada) para señalar que algo está en curso sin un % exacto. */
export function BarraProgreso({ valor, total, className = "" }: {
  valor?: number; total?: number; className?: string;
}) {
  const determinado = typeof valor === "number" && typeof total === "number" && total > 0;
  const pct = determinado ? Math.min(100, Math.round((valor! / total!) * 100)) : 0;
  return (
    <div className={`relative h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high ${className}`}>
      {determinado ? (
        <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
      ) : (
        <div className="absolute top-0 h-full rounded-full bg-primary animate-[barra-indeterminada_1.3s_ease-in-out_infinite]" />
      )}
    </div>
  );
}
