/** Correspondencia cargo ↔ bases.
 *
 * El cargo de la propuesta a veces trae incrustada la correspondencia con el
 * cargo oficial de las bases: "… (cargo bases N°5 ESPECIALISTA EN ESTRUCTURAS)".
 * La sacamos del nombre (donde se lee como ruido) y la mostramos como etiqueta
 * sutil — sin perder el dato. Las extracciones nuevas ya la traen separada en
 * `cargo_bases_num/nombre`; `refCargo` prefiere eso y cae al regex como respaldo. */

export function partirCargo(cargo: string): { nombre: string; basesNum: string | null; basesFull: string | null } {
  const m = cargo.match(/\s*\(\s*cargo bases\s*(N[°º]?\s*\d+)([^)]*)\)\s*$/i);
  if (!m) return { nombre: cargo, basesNum: null, basesFull: null };
  const num = m[1].replace(/\s+/g, "");
  const resto = m[2].trim();
  return {
    nombre: cargo.slice(0, m.index).trim(),
    basesNum: num,
    basesFull: `Cargo en bases ${num}${resto ? " · " + resto : ""}`,
  };
}

export function refCargo(cargo: string, num?: number | null, nombre?: string | null) {
  if (num != null) {
    return {
      nombre: cargo,
      basesNum: `N°${num}`,
      basesFull: `Cargo en bases N°${num}${nombre ? " · " + nombre : ""}`,
    };
  }
  return partirCargo(cargo);
}

export function EtiquetaBases({ num, full }: { num: string; full: string | null }) {
  return (
    <span
      title={full ?? undefined}
      className="text-nano font-semibold text-secondary bg-surface-container-high px-1.5 py-0.5 rounded whitespace-nowrap cursor-help"
    >
      bases {num}
    </span>
  );
}
