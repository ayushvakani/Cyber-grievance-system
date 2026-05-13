import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard,
  FileText,
  Network,
  ShieldAlert,
  Settings,
  LogOut,
  Home,
  Cpu,
  BarChart3,
} from "lucide-react";

const navItems = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/complaints", label: "Complaints", icon: FileText },
  { to: "/admin/network", label: "Fraud Network", icon: Network },
  { to: "/admin/alerts", label: "Alerts", icon: ShieldAlert },
  { to: "/admin/pipeline", label: "AI Pipeline", icon: Cpu },
  { to: "/admin/officer-report", label: "Officer Report", icon: BarChart3 },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const [anomalyCount, setAnomalyCount] = useState(0);
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.getAnomaliesCount().then(setAnomalyCount).catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

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
            <span className="flex-1">{label}</span>
            {label === "Alerts" && anomalyCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {anomalyCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-700 space-y-2">
        <NavLink
          to="/"
          className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer hover:text-blue-400 transition-colors"
        >
          <Home size={14} />
          <span>Public Portal</span>
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 text-xs text-gray-500 cursor-pointer hover:text-red-400 transition-colors"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
