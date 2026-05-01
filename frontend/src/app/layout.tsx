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
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = stored === 'dark' || (!stored && prefersDark);
    if (dark) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.style.colorScheme = 'light';
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
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
