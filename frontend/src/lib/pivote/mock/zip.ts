/**
 * Generador ZIP (método STORE, sin compresión) para las descargas del mock:
 * - el XLSX demo (un xlsx ES un zip con XMLs adentro — Excel lo abre)
 * - el ZIP InfoObras con el árbol de 4 niveles Proyecto→Profesional→Experiencia
 * El backend real sirve los archivos verdaderos; esto hace funcionales los
 * botones de descarga durante el desarrollo del panel.
 */

const enc = new TextEncoder();

// CRC-32 (tabla estándar)
const TABLA = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = TABLA[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function u16(v: number): number[] { return [v & 0xff, (v >> 8) & 0xff]; }
function u32(v: number): number[] { return [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff]; }

export function construirZip(entradas: { nombre: string; contenido: string }[]): Uint8Array {
  const locales: number[] = [];
  const central: number[] = [];
  let offset = 0;
  let nEntradas = 0;

  for (const { nombre, contenido } of entradas) {
    const nom = enc.encode(nombre);
    const data = enc.encode(contenido);
    const crc = crc32(data);
    const header = [
      0x50, 0x4b, 0x03, 0x04, ...u16(20), ...u16(0), ...u16(0),
      ...u16(0), ...u16(0),                       // time, date
      ...u32(crc), ...u32(data.length), ...u32(data.length),
      ...u16(nom.length), ...u16(0),
    ];
    locales.push(...header, ...nom, ...data);
    central.push(
      0x50, 0x4b, 0x01, 0x02, ...u16(20), ...u16(20), ...u16(0), ...u16(0),
      ...u16(0), ...u16(0),
      ...u32(crc), ...u32(data.length), ...u32(data.length),
      ...u16(nom.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(0), ...u32(offset), ...nom,
    );
    offset += header.length + nom.length + data.length;
    nEntradas++;
  }

  const eocd = [
    0x50, 0x4b, 0x05, 0x06, ...u16(0), ...u16(0),
    ...u16(nEntradas), ...u16(nEntradas),
    ...u32(central.length), ...u32(offset), ...u16(0),
  ];
  return new Uint8Array([...locales, ...central, ...eocd]);
}

/** XLSX mínimo y VÁLIDO (Excel lo abre) con una hoja de aviso demo. */
export function xlsxDemo(postor: string): Uint8Array {
  const fila = (n: number, textos: string[]) =>
    `<row r="${n}">${textos.map((t, i) =>
      `<c r="${String.fromCharCode(65 + i)}${n}" t="inlineStr"><is><t>${t}</t></is></c>`).join("")}</row>`;
  return construirZip([
    { nombre: "[Content_Types].xml", contenido:
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>` },
    { nombre: "_rels/.rels", contenido:
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { nombre: "xl/workbook.xml", contenido:
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="CLAUDE" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { nombre: "xl/_rels/workbook.xml.rels", contenido:
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>` },
    { nombre: "xl/worksheets/sheet1.xml", contenido:
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${
        fila(1, ["DEMO — Excel final enriquecido (mock del panel)"])}${
        fila(2, ["Postor", postor])}${
        fila(3, ["El backend real genera aqui el Formato de Evaluacion completo"])}${
        fila(4, ["(hoja CLAUDE + hojas por profesional con dias efectivos)"])
      }</sheetData></worksheet>` },
  ]);
}

/** ZIP InfoObras demo — árbol Proyecto → Profesional → Experiencia → archivos
 *  (la estructura de 4 niveles definida por el cliente). */
export function zipInfoObrasDemo(concurso: string, postor: string): Uint8Array {
  const raiz = concurso.replace(/[\\/:*?"<>|]/g, "-");
  const leeme = (ruta: string) =>
    `DEMO (mock del panel)\n\nAqui el backend real coloca los documentos descargados de InfoObras\npara esta experiencia: cronograma, valorizaciones, expediente tecnico,\nampliaciones de plazo, etc.\n\nRuta: ${ruta}\nPostor: ${postor}\n`;
  const entradas: { nombre: string; contenido: string }[] = [];
  for (const prof of ["Profesional 1 - Jefe de Supervision", "Profesional 2 - Esp Estructuras"]) {
    for (const exp of ["Experiencia 1", "Experiencia 2"]) {
      const ruta = `${raiz}/${prof}/${exp}`;
      entradas.push({ nombre: `${ruta}/LEEME.txt`, contenido: leeme(ruta) });
    }
  }
  entradas.push({
    nombre: `${raiz}/indice.txt`,
    contenido: `Indice del ZIP InfoObras (demo)\nConcurso: ${concurso}\nPostor: ${postor}\nEstructura: Proyecto -> Profesional -> Experiencia -> archivos\n`,
  });
  return construirZip(entradas);
}
