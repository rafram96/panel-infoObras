"use client";

import Sidebar from "./Sidebar";
import TopNav from "./TopNav";

interface PanelShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function PanelShell({
  title,
  subtitle,
  children,
}: PanelShellProps) {
  return (
    <>
      <Sidebar />
      <TopNav title={title} subtitle={subtitle} />
      <main className="pt-16 pb-8 md:pl-64 px-6 min-h-screen">{children}</main>
    </>
  );
}
