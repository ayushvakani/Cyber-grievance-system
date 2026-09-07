import React from "react";
import { ShieldAlert, ShieldCheck, AlertTriangle, Link2, Phone, Mail, Wallet } from "lucide-react";

type OsintData = {
  source: string;
  risk_score: number;
  flags: string[];
  status: string;
  details?: string;
};

export type OsintEntity = {
  type: string;
  value: string;
  osint: OsintData;
};

interface OsintPanelProps {
  entities: OsintEntity[];
}

export default function OsintPanel({ entities }: OsintPanelProps) {
  if (!entities || entities.length === 0) {
    return null;
  }

  // Deduplicate entities based on normalized value
  const uniqueEntities = entities.reduce((acc: OsintEntity[], current) => {
    // Normalize value (remove all non-alphanumeric chars for comparison)
    let normalized = current.value.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    
    // If the normalized value is 10 or more digits, it's likely a phone number. 
    // Take the last 10 digits to strip country codes like +91
    if (/^\d{10,}$/.test(normalized)) {
      normalized = normalized.slice(-10);
    }
    
    // Check if we already have an entity with the same normalized value
    const existsIndex = acc.findIndex(item => {
      let itemNormalized = item.value.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      if (/^\d{10,}$/.test(itemNormalized)) {
        itemNormalized = itemNormalized.slice(-10);
      }
      return itemNormalized === normalized;
    });
    
    // If it doesn't exist, push it
    if (existsIndex === -1) {
      acc.push(current);
    } else if (current.osint.risk_score > acc[existsIndex].osint.risk_score) {
      // If we find a duplicate with a higher risk score, replace the old one
      acc[existsIndex] = current;
    }
    return acc;
  }, []);

  const getIcon = (type: string) => {
    if (type === "phone_numbers") return <Phone size={16} />;
    if (type === "urls_domains") return <Link2 size={16} />;
    if (type === "emails") return <Mail size={16} />;
    if (type === "crypto_wallets") return <Wallet size={16} />;
    return <AlertTriangle size={16} />;
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return "text-red-600 bg-red-50 border-red-200";
    if (score >= 40) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-green-600 bg-green-50 border-green-200";
  };

  const getProgressColor = (score: number) => {
    if (score >= 70) return "bg-red-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert className="text-gov-primary" size={20} />
        <h3 className="text-lg font-semibold text-gray-900">Real-Time Threat Intelligence (OSINT)</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {uniqueEntities.map((entity, idx) => (
          <div key={idx} className={`p-4 rounded-md border ${getRiskColor(entity.osint.risk_score)} flex flex-col`}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2 font-medium">
                {getIcon(entity.type)}
                <span className="truncate max-w-[200px]" title={entity.value}>{entity.value}</span>
              </div>
              {entity.osint.status && (
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-white/50 shadow-sm">
                  {entity.osint.status}
                </span>
              )}
            </div>
            
            <div className="mb-2">
              <div className="flex justify-between text-xs mb-1">
                <span>Risk Score</span>
                <span className="font-bold">{entity.osint.risk_score}/100</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${getProgressColor(entity.osint.risk_score)}`} style={{ width: `${entity.osint.risk_score}%` }}></div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-1 mb-2 flex-grow">
              {entity.osint.flags && entity.osint.flags.map((flag, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-black/5 border border-black/10">
                  {flag}
                </span>
              ))}
            </div>
            
            <div className="text-[10px] opacity-70 flex justify-between items-end mt-2">
              <span className="font-semibold">{entity.osint.source}</span>
            </div>
            
            {entity.osint.details && (
              <div className="mt-3 pt-3 border-t border-black/10 text-xs opacity-90 font-medium">
                {entity.osint.details}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
