import { Link } from "react-router-dom";
import { Shield, FileText, Brain, Search, Network, ChevronRight } from "lucide-react";

export default function Home() {
  return (
    <div className="relative flex flex-col min-h-screen overflow-hidden bg-white selection:bg-red-100 selection:text-red-900">
      {/* Decorative background gradients */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-red-50/50 blur-3xl" />
        <div className="absolute top-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-blue-50/50 blur-3xl" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 flex-1 flex flex-col justify-center pt-24 pb-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 text-red-700 font-semibold text-sm mb-8 ring-1 ring-red-200/50 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            Cyber Grievance Portal
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 tracking-tight mb-8 leading-[1.1]">
            National Cyber <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gov-primary to-red-600">
              Grievance System
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-12 leading-relaxed font-light">
            A state-of-the-art platform for reporting, analyzing, and resolving cybercrimes with AI-powered intelligence and forensic precision.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-medium border border-blue-100 shadow-sm">
              <Brain size={15} /> AI Triage & OCR
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-700 text-sm font-medium border border-red-100 shadow-sm">
              <Network size={15} /> Fraud Network Analysis
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium border border-emerald-100 shadow-sm">
              <Search size={15} /> Semantic RAG Search
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <Link
              to="/submit"
              className="group relative flex items-center justify-center gap-2 bg-gov-primary hover:bg-red-800 text-white font-semibold px-6 py-4 rounded-xl shadow-lg shadow-red-900/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-red-900/30 w-full sm:w-auto"
            >
              <FileText size={20} />
              <span>File Complaint</span>
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to="/status"
              className="group flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold px-6 py-4 rounded-xl shadow-sm ring-1 ring-gray-200 transition-all hover:-translate-y-0.5 hover:shadow-md w-full sm:w-auto"
            >
              <Search size={20} className="text-gov-blue" />
              <span>Check Status</span>
            </Link>

            <Link
              to="/admin/login"
              className="group flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold px-6 py-4 rounded-xl shadow-sm ring-1 ring-gray-200 transition-all hover:-translate-y-0.5 hover:shadow-md w-full sm:w-auto"
            >
              <Shield size={20} className="text-gov-blue" />
              <span>Admin Login</span>
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 bg-white border-t border-gray-100 py-8 text-center">
        <p className="text-sm text-gray-400 font-medium">
          © {new Date().getFullYear()} Cyber Grievance System. For demonstration purposes.
        </p>
      </footer>
    </div>
  );
}
