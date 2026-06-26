/** Fetch con reintentos — para que una pantalla no quede pegada en "no encontrado"
 *  si el backend tarda un instante en responder (arranque, reinicio, blip de red).
 *  Reintenta ante error de red O respuesta no-ok, con espera entre intentos. */
export async function fetchRetry(
  url: string,
  opts?: RequestInit,
  tries = 5,
  delayMs = 800,
): Promise<Response> {
  let ultima: Response | undefined;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, opts);
      if (r.ok) return r;
      ultima = r;
    } catch {
      /* error de red → reintentar */
    }
    if (i < tries - 1) await new Promise((res) => setTimeout(res, delayMs));
  }
  return ultima ?? new Response(null, { status: 503 });
}
