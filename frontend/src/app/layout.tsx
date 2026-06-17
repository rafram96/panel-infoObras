import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InfoObras Analyzer",
  description: "Procesamiento OCR y segmentación de profesionales",
};

// Script anti-flash: aplica la clase .dark al <html> ANTES del render
// para evitar el "flash de tema claro" cuando el usuario tiene tema oscuro
// guardado o preferido por el sistema. Se inyecta inline para que se ejecute
// antes de pintar nada en pantalla.
const ANTI_FLASH = `
(function() {
  try {
    var stored = localStorage.getItem('panel-theme');
    var dark = stored !== 'light';   // oscuro por defecto (diseño unificado)
    var root = document.documentElement;
    root.classList.toggle('dark', dark);
    root.style.colorScheme = dark ? 'dark' : 'light';
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: ANTI_FLASH }} />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface text-on-surface antialiased">
        {children}
      </body>
    </html>
  );
}
