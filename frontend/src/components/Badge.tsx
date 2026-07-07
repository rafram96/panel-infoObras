/** Píldora de estado semántica. Consume los tonos de `lib/ui` para que
 *  CUMPLE / NO CUMPLE / Por confirmar / En proceso / Claude, etc. se vean
 *  igual en todo el panel. Es informativa (no clickeable) por diseño.
 *  `chico` la compacta para tablas densas. */
import { TONO, type Tono, cx } from "@/lib/ui";

export function Badge({
  tono,
  children,
  icono,
  className,
  title,
  chico = false,
}: {
  tono: Tono;
  children: React.ReactNode;
  /** Nombre de un Material Symbol opcional a la izquierda del texto. */
  icono?: string;
  className?: string;
  /** Tooltip nativo opcional. */
  title?: string;
  /** Variante compacta para celdas de tabla. */
  chico?: boolean;
}) {
  return (
    <span
      title={title}
      className={cx(
        "inline-flex items-center font-bold whitespace-nowrap",
        chico ? "gap-0.5 px-2 py-0.5 rounded text-micro" : "gap-1 px-2.5 py-1 rounded-lg text-xs",
        TONO[tono].chip,
        className,
      )}
    >
      {icono && (
        <span className={cx("material-symbols-outlined", chico ? "text-[13px]" : "text-[15px]")}>
          {icono}
        </span>
      )}
      {children}
    </span>
  );
}
