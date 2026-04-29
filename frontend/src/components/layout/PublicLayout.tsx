import { ReactNode } from "react";
import GovHeader from "./GovHeader";

interface PublicLayoutProps {
  children: ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <GovHeader />
      <main className="flex-1 overflow-auto bg-white">
        {children}
      </main>
    </div>
  );
}
