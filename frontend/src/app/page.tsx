import { redirect } from "next/navigation";

// El home del panel abre directo en el flujo del pivote (Concursos).
export default function Home() {
  redirect("/concursos");
}
