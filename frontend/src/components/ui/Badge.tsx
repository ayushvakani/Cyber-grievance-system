// Reusable severity/status badge with Government color coding
type BadgeVariant = "high" | "critical" | "medium" | "low" | "resolved" | "pending" | "default";

const variantStyles: Record<BadgeVariant, string> = {
  high:     "bg-red-100 text-red-800 border border-red-300",
  critical: "bg-red-900 text-red-100 border border-red-700",
  medium:   "bg-amber-100 text-amber-800 border border-amber-300",
  low:      "bg-green-100 text-green-800 border border-green-300",
  resolved: "bg-emerald-100 text-emerald-800 border border-emerald-300",
  pending:  "bg-gray-100 text-gray-700 border border-gray-300",
  default:  "bg-blue-100 text-blue-800 border border-blue-300",
};

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  score?: number; // optional confidence %
}

export default function Badge({ label, variant = "default", score }: BadgeProps) {
  const style = variantStyles[variant] || variantStyles.default;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${style}`}>
      {label}
      {score !== undefined && (
        <span className="opacity-70 font-normal">{score}%</span>
      )}
    </span>
  );
}

// Helper to auto-detect variant from severity string
export function severityVariant(severity: string): BadgeVariant {
  const s = severity?.toLowerCase();
  if (s === "critical") return "critical";
  if (s === "high") return "high";
  if (s === "medium") return "medium";
  if (s === "low") return "low";
  return "default";
}

export function statusVariant(status: string): BadgeVariant {
  if (status === "resolved") return "resolved";
  if (status === "pending") return "pending";
  return "default";
}
