import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Network,
  ShieldAlert,
  Settings,
  LogOut,
} from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/complaints", label: "Complaints", icon: FileText },
  { to: "/network", label: "Fraud Network", icon: Network },
  { to: "/alerts", label: "Alerts", icon: ShieldAlert },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="w-56 bg-gray-900 text-gray-100 flex flex-col min-h-screen flex-shrink-0">
      {/* Branding strip */}
      <div className="bg-gov-primary px-4 py-3 border-b border-red-800">
        <p className="text-xs font-semibold tracking-widest uppercase opacity-90">
          Investigator Panel
        </p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-4">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-5 py-3 text-sm font-medium transition-all duration-150 border-l-4 ${
                isActive
                  ? "border-gov-primary bg-red-950 text-white"
                  : "border-transparent text-gray-400 hover:text-white hover:bg-gray-800"
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-700 text-xs text-gray-500">
        <div className="flex items-center gap-2 cursor-pointer hover:text-red-400 transition-colors">
          <LogOut size={14} />
          <span>Sign Out</span>
        </div>
      </div>
    </aside>
  );
}
