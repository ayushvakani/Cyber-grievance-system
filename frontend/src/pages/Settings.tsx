import { Settings as SettingsIcon, Save, Key, Database, BellRing } from "lucide-react";

export default function Settings() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <SettingsIcon size={20} className="text-gov-primary" /> System Settings
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure investigation portal preferences and integrations
          </p>
        </div>
        <button className="bg-gov-primary hover:bg-red-800 text-white text-sm font-semibold px-4 py-2 rounded flex items-center gap-2 transition-colors">
          <Save size={16} /> Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left col */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white border border-gray-200 shadow-sm rounded p-5 space-y-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-2">
              <Key size={16} className="text-gov-blue" /> AI API Configurations
            </h2>
            
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Ollama / Local LLM Endpoint</label>
              <input type="text" defaultValue="http://localhost:11434" className="w-full text-sm border border-gray-200 rounded px-3 py-2 bg-gray-50 outline-none focus:border-gov-primary" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Mistral Model Name</label>
              <input type="text" defaultValue="mistral" className="w-full text-sm border border-gray-200 rounded px-3 py-2 bg-gray-50 outline-none focus:border-gov-primary" />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">HuggingFace Embeddings Model</label>
              <input type="text" defaultValue="sentence-transformers/all-MiniLM-L6-v2" className="w-full text-sm border border-gray-200 rounded px-3 py-2 bg-gray-50 outline-none focus:border-gov-primary" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 shadow-sm rounded p-5 space-y-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-2">
              <Database size={16} className="text-amber-500" /> Database Endpoints
            </h2>
            
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Neo4j Graph Database URI</label>
              <input type="text" defaultValue="bolt://localhost:7687" className="w-full text-sm border border-gray-200 rounded px-3 py-2 bg-gray-50 outline-none focus:border-gov-primary" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">PostgreSQL Connection String</label>
              <input type="password" defaultValue="postgresql://user:pass@localhost:5432/db" className="w-full text-sm border border-gray-200 rounded px-3 py-2 bg-gray-50 outline-none focus:border-gov-primary" />
            </div>
          </div>
        </div>

        {/* Right col */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 shadow-sm rounded p-5 space-y-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-2">
              <BellRing size={16} className="text-gov-success" /> Notification Preferences
            </h2>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4 text-gov-primary rounded border-gray-300 focus:ring-gov-primary" />
              <span className="text-sm text-gray-700">Email on Critical Anomalies</span>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4 text-gov-primary rounded border-gray-300 focus:ring-gov-primary" />
              <span className="text-sm text-gray-700">Daily Digest Report</span>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 text-gov-primary rounded border-gray-300 focus:ring-gov-primary" />
              <span className="text-sm text-gray-700">Slack Webhook Alerts</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
