/** Stepper en vivo de la verificación · muestra las 8 etapas con su estado y, en
 *  la(s) etapa(s) en curso, el texto fino ("Verificando la obra 12 de 49") con su
 *  barra por-ítem. INFOOBRAS ∥ SUNAT pueden estar ambas "en curso" a la vez — es
 *  correcto, corren en paralelo. Consume /progreso; sin jerga (palabras de
 *  evaluador), colores del sistema TONO. */
import type { EstadoEtapa, ProgresoAnalisis } from "@/lib/pivote/types";
import { TONO, type Tono, cx } from "@/lib/ui";
import { BarraProgreso } from "@/components/BarraProgreso";

// estado de etapa → cómo se ve el punto del stepper
const ESTADO: Record<EstadoEtapa, { tono: Tono; icono: string; gira?: boolean }> = {
  ok: { tono: "ok", icono: "check" },
  ok_con_revision: { tono: "ok", icono: "check" },
  error_parcial: { tono: "alerta", icono: "priority_high" },
  error: { tono: "error", icono: "close" },
  en_curso: { tono: "acento", icono: "progress_activity", gira: true },
  pendiente: { tono: "info", icono: "radio_button_unchecked" },
};

export function StepperEtapas({ progreso }: { progreso: ProgresoAnalisis }) {
  const { pct, etapas } = progreso;
  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-ambient border border-outline-variant/10 p-5 mb-6">
      {/* barra global con shimmer mientras corre */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-micro font-bold uppercase tracking-[0.05rem] text-on-surface-variant">
          Verificando la propuesta
        </span>
        <span className="text-sm font-bold text-primary">{pct}%</span>
      </div>
      <div className="relative h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-5">
        <div className="absolute inset-y-0 left-0 bg-primary rounded-full transition-[width] duration-500" style={{ width: `${pct}%` }} />
        <div className="absolute inset-y-0 left-0 overflow-hidden rounded-full" style={{ width: `${pct}%` }}>
          <div className="absolute inset-0 animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        </div>
      </div>

      {/* lista de etapas */}
      <ol className="flex flex-col gap-3">
        {etapas.map((e) => {
          const s = ESTADO[e.estado] ?? ESTADO.pendiente;
          const activa = e.estado === "en_curso";
          const conContador = activa && typeof e.items_total === "number" && e.items_total > 0;
          return (
            <li key={e.etapa} className="flex items-start gap-3">
              <span
                className={cx(
                  "mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center",
                  TONO[s.tono].solido,
                )}
              >
                <span className={cx("material-symbols-outlined text-[15px]", s.gira && "animate-spin")}>
                  {s.icono}
                </span>
              </span>
              <div className="flex-1 min-w-0">
                <p className={cx(
                  "text-sm leading-snug",
                  activa ? "font-semibold text-on-surface" : "text-on-surface-variant",
                  e.estado === "pendiente" && "text-outline",
                )}>
                  {e.texto}
                </p>
                {activa && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <BarraProgreso
                      valor={conContador ? e.item_actual : undefined}
                      total={conContador ? e.items_total : undefined}
                      className="max-w-xs"
                    />
                    {conContador && (
                      <span className="text-nano font-semibold text-outline whitespace-nowrap">
                        {e.item_actual} de {e.items_total}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
