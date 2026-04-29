import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface CrimeChartProps {
  data: { crime_type: string; count: number }[];
}

// Color bars by rough severity association
const barColor = (crimeType: string): string => {
  const t = crimeType?.toLowerCase() ?? "";
  if (t.includes("ransomware") || t.includes("hacking")) return "#b7202e";
  if (t.includes("phishing") || t.includes("fraud")) return "#dc2626";
  if (t.includes("upi") || t.includes("otp")) return "#f59e0b";
  if (t.includes("stalking") || t.includes("bullying")) return "#0891b2";
  return "#1e3a8a";
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-gray-200 shadow-lg rounded px-3 py-2 text-xs">
        <p className="font-semibold text-gray-800">{label}</p>
        <p className="text-gov-primary font-bold">{payload[0].value} complaints</p>
      </div>
    );
  }
  return null;
};

export default function CrimeBarChart({ data }: CrimeChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-gray-400">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 60 }}>
        <XAxis
          dataKey="crime_type"
          tick={{ fontSize: 10, fill: "#6b7280" }}
          angle={-35}
          textAnchor="end"
          interval={0}
        />
        <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={barColor(entry.crime_type)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
