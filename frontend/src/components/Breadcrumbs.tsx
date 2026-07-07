/** Migas de pan para la navegación jerárquica
 *  (Concursos › Expediente › Postor › Por confirmar). Reemplaza los enlaces
 *  "← Atrás" sueltos y da contexto de dónde está parado el evaluador. */
import Link from "next/link";

export interface Miga {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Miga[] }) {
  return (
    <nav aria-label="Ruta de navegación" className="mb-5">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-on-surface-variant">
        {items.map((m, i) => {
          const ultimo = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1 min-w-0">
              {m.href && !ultimo ? (
                <Link
                  href={m.href}
                  className="hover:text-primary transition-colors truncate max-w-[16rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                >
                  {m.label}
                </Link>
              ) : (
                <span
                  aria-current={ultimo ? "page" : undefined}
                  className={ultimo ? "font-semibold text-on-surface truncate max-w-[20rem]" : "truncate max-w-[16rem]"}
                >
                  {m.label}
                </span>
              )}
              {!ultimo && (
                <span className="material-symbols-outlined text-[16px] text-outline-variant" aria-hidden="true">
                  chevron_right
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
