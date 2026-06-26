"use client";

import ThemeToggle from "./ThemeToggle";

interface TopNavProps {
  title: string;
  subtitle?: string;
}

export default function TopNav({ title, subtitle }: TopNavProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-header bg-surface/80 h-14 md:pl-64 border-b border-outline-variant/10">
      <div className="h-full flex justify-between items-center px-6">
        <div className="flex items-center gap-4 min-w-0">
          <h1 className="text-[0.875rem] font-semibold tracking-tight text-primary truncate">
            {title}
          </h1>
          {subtitle && (
            <span className="text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on-surface-variant truncate hidden sm:block">
              {subtitle}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ThemeToggle />
          <div className="h-8 w-8 ml-2 rounded-full overflow-hidden border border-outline-variant/20 bg-secondary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-[20px]">
              account_circle
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
