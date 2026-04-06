"use client";

interface TopNavProps {
  title: string;
  subtitle?: string;
}

export default function TopNav({ title, subtitle }: TopNavProps) {
  return (
    <header className="fixed top-0 w-full z-50 glass-header bg-surface/80 h-12 flex justify-between items-center px-6 md:pl-72 border-b border-outline-variant/10">
      <div className="flex items-center gap-4">
        <h1 className="text-[0.875rem] font-semibold tracking-tight text-primary">
          {title}
        </h1>
        {subtitle && (
          <span className="text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-slate-400">
            {subtitle}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button className="p-1.5 rounded text-slate-500 hover:bg-surface-container transition-all duration-200">
          <span className="material-symbols-outlined text-[20px]">
            notifications
          </span>
        </button>
        <button className="p-1.5 rounded text-slate-500 hover:bg-surface-container transition-all duration-200">
          <span className="material-symbols-outlined text-[20px]">
            settings
          </span>
        </button>
        <div className="h-8 w-8 ml-2 rounded-full overflow-hidden border border-outline-variant/20 bg-secondary-container flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-[20px]">
            account_circle
          </span>
        </div>
      </div>
    </header>
  );
}
