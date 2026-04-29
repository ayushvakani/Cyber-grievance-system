import { ReactNode } from "react";
import GovHeader from "./GovHeader";
import Sidebar from "./Sidebar";

interface GovLayoutProps {
  children: ReactNode;
}

export default function GovLayout({ children }: GovLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-gov-bg">
      <GovHeader />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
