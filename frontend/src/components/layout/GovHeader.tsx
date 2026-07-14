import { Shield } from "lucide-react";

// Government of India Official Header
export default function GovHeader() {
  return (
    <header className="bg-gov-header text-white shadow-md">
      {/* Top stripe */}
      <div className="bg-gov-primary px-6 py-1 flex items-center justify-between text-xs">
        <span className="font-medium tracking-wider">Cyber Grievance Portal</span>
        <span className="opacity-80">Ministry of Home Affairs — Cyber Crime Division</span>
      </div>

      {/* Main header bar */}
      <div className="px-6 py-3 flex items-center gap-4">
        {/* Seal Icon */}
        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm border-2 border-gray-100">
          <Shield size={24} className="text-gov-primary fill-gov-primary/10" />
        </div>

        <div>
          <h1 className="text-xl font-bold tracking-tight leading-tight">
            Cyber Public Grievance System
          </h1>
          <p className="text-xs opacity-80 font-medium">
            AI-Powered Complaint Investigation Portal — Official Use Only
          </p>
        </div>
      </div>
    </header>
  );
}
