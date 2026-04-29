import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  iconColor?: string;
  loading?: boolean;
}

// Day 80: Stat card with red top-border (border-top: 3px solid #b7202e)
export function StatCard({ title, value, icon: Icon, iconColor = "text-gov-primary", loading = false }: StatCardProps) {
  return (
    <div className="bg-white border-t-[3px] border-gov-primary rounded shadow-sm p-5 flex items-start gap-4 hover:-translate-y-0.5 hover:shadow-gov-hover transition-all duration-200 cursor-default">
      <div className={`p-3 rounded-full bg-red-50 ${iconColor}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{title}</p>
        {loading ? (
          <div className="h-7 w-20 bg-gray-200 rounded animate-pulse mt-1" />
        ) : (
          <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        )}
      </div>
    </div>
  );
}

// Generic content card
interface CardProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export function Card({ children, title, className = "" }: CardProps) {
  return (
    <div className={`bg-white rounded shadow-sm border border-gray-200 ${className}`}>
      {title && (
        <div className="px-5 py-3 border-b border-gray-100 border-l-4 border-l-gov-primary">
          <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">{title}</h2>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
