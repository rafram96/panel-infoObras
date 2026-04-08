"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_MAIN = [
  { href: "/", icon: "dashboard", label: "Dashboard" },
  { href: "/nuevo-analisis", icon: "query_stats", label: "Nuevo Análisis" },
  { href: "/historial", icon: "manage_search", label: "Historial" },
] as const;

const NAV_TOOLS = [
  { href: "/herramientas/extraccion", icon: "person_search", label: "Profesionales" },
  { href: "/herramientas/tdr", icon: "fact_check", label: "Requisitos TDR" },
] as const;

const NAV_FOOTER = [
  { href: "/configuracion", icon: "settings", label: "Configuración" },
] as const;

// Flat list for mobile bottom nav (max 5 items)
const NAV_MOBILE = [
  ...NAV_MAIN,
  { href: "/herramientas/extraccion", icon: "person_search", label: "Profesionales" },
  { href: "/herramientas/tdr", icon: "fact_check", label: "TDR" },
] as const;

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex h-screen w-64 fixed left-0 top-0 flex-col bg-surface-container-low z-[60]">
        <div className="flex flex-col h-full py-4 space-y-1">
          {/* Brand */}
          <div className="px-6 py-4 mb-4">
            <span className="text-sm font-black uppercase tracking-[0.1rem] text-primary">
              InfoObras
            </span>
            <p className="text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-slate-500">
              Analyzer Framework
            </p>
          </div>

          {/* Nav links */}
          <nav className="flex-1 px-3 space-y-1">
            {NAV_MAIN.map(({ href, icon, label }) => (
              <Link
                key={href}
                href={href}
                className={
                  isActive(href)
                    ? "flex items-center px-3 h-10 bg-white text-primary font-bold border-l-4 border-primary transition-colors duration-150"
                    : "flex items-center px-3 h-10 text-slate-600 hover:text-primary hover:bg-surface-container-high transition-colors duration-150"
                }
              >
                <span
                  className="material-symbols-outlined mr-3 text-[20px]"
                  style={
                    isActive(href)
                      ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }
                      : undefined
                  }
                >
                  {icon}
                </span>
                <span className="text-[0.8125rem] font-medium">{label}</span>
              </Link>
            ))}

            {/* Herramientas section */}
            <div className="pt-4 pb-1">
              <span className="px-3 text-[0.6rem] font-bold uppercase tracking-[0.15rem] text-slate-400">
                Herramientas
              </span>
            </div>
            {NAV_TOOLS.map(({ href, icon, label }) => (
              <Link
                key={href}
                href={href}
                className={
                  isActive(href)
                    ? "flex items-center px-3 h-10 bg-white text-primary font-bold border-l-4 border-primary transition-colors duration-150"
                    : "flex items-center px-3 h-10 text-slate-600 hover:text-primary hover:bg-surface-container-high transition-colors duration-150"
                }
              >
                <span
                  className="material-symbols-outlined mr-3 text-[20px]"
                  style={
                    isActive(href)
                      ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }
                      : undefined
                  }
                >
                  {icon}
                </span>
                <span className="text-[0.8125rem] font-medium">{label}</span>
              </Link>
            ))}

            {/* Footer section */}
            <div className="pt-4" />
            {NAV_FOOTER.map(({ href, icon, label }) => (
              <Link
                key={href}
                href={href}
                className={
                  isActive(href)
                    ? "flex items-center px-3 h-10 bg-white text-primary font-bold border-l-4 border-primary transition-colors duration-150"
                    : "flex items-center px-3 h-10 text-slate-600 hover:text-primary hover:bg-surface-container-high transition-colors duration-150"
                }
              >
                <span
                  className="material-symbols-outlined mr-3 text-[20px]"
                  style={
                    isActive(href)
                      ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }
                      : undefined
                  }
                >
                  {icon}
                </span>
                <span className="text-[0.8125rem] font-medium">{label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full h-16 bg-surface border-t border-outline-variant/10 flex justify-around items-center z-50">
        {NAV_MOBILE.map(({ href, icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1 ${
              isActive(href) ? "text-primary" : "text-slate-400"
            }`}
          >
            <span
              className="material-symbols-outlined"
              style={
                isActive(href)
                  ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }
                  : undefined
              }
            >
              {icon}
            </span>
            <span className="text-[0.625rem] font-bold">{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
