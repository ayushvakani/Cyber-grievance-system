import { useState } from "react";
import { Play, Activity, Database, Network, BrainCircuit, CheckCircle2, ChevronDown, ChevronUp, ShieldAlert } from "lucide-react";
import { api } from "../services/api";

export default function PipelineDemo() {
  const [text, setText] = useState(
    "I was scammed out of 10,000 INR via a fake trading app link sent on Telegram by 9876543210. The app asked me to invest more to unlock my funds."
  );
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<any[]>([]);
  const [demoId, setDemoId] = useState<string | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const runPipeline = async () => {
    if (!text.trim()) return;
    setRunning(true);
    setSteps([]);
    setDemoId(null);
    setExpandedStep(null);
    
    try {
      // Create a dummy timeline array that we will fill up over time to simulate a live process
      const res = await api.simulatePipeline(text);
      setDemoId(res.demo_id);
      
      // Simulate live streaming by sequentially revealing the steps
      for (let i = 0; i < res.steps.length; i++) {
        await new Promise((r) => setTimeout(r, 1200)); // fake delay between steps for presentation
        setSteps((prev) => [...prev, res.steps[i]]);
      }
    } catch (e) {
      alert("Pipeline simulation failed.");
    } finally {
      setRunning(false);
    }
  };

  const getStepIcon = (idx: number) => {
    switch (idx) {
      case 0: return <BrainCircuit size={18} className="text-purple-600" />;
      case 1: return <Network size={18} className="text-blue-600" />;
      case 2: return <Database size={18} className="text-amber-600" />;
      case 3: return <Activity size={18} className="text-orange-600" />;
      case 4: return <ShieldAlert size={18} className="text-red-600" />;
      case 5: return <CheckCircle2 size={18} className="text-green-600" />;
      default: return <Activity size={18} />;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="bg-white p-5 rounded border border-gray-200 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Activity size={20} className="text-gov-primary" /> RAG Pipeline Simulator
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Interactive demo showing the internal 7-step architecture of the cyber grievance pipeline.
        </p>
      </div>

      <div className="bg-white p-5 rounded border border-gray-200 shadow-sm space-y-4">
        <label className="block text-sm font-semibold text-gray-800">Input Complaint</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={running}
          className="w-full border border-gray-200 rounded p-3 text-sm focus:border-gov-primary focus:ring-1 focus:ring-gov-primary outline-none min-h-[100px]"
          placeholder="Paste a complaint here..."
        />
        
        <button
          onClick={runPipeline}
          disabled={running}
          className="bg-gov-primary hover:bg-red-800 text-white text-sm font-semibold px-5 py-2.5 rounded flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          {running ? (
            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <Play size={16} />
          )}
          {running ? "Processing Pipeline..." : "Run AI Pipeline"}
        </button>
      </div>

      {/* Execution Timeline */}
      {(steps.length > 0 || running) && (
        <div className="bg-gray-50 p-6 rounded border border-gray-200 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-6 flex items-center justify-between">
            <span>Execution Trace {demoId && <span className="text-xs text-gray-500 ml-2 font-mono">({demoId})</span>}</span>
            {running && <span className="text-xs text-gov-primary animate-pulse">Running...</span>}
          </h2>

          <div className="space-y-4">
            {steps.map((s, idx) => (
              <div key={idx} className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
                <div 
                  className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-100"
                  onClick={() => setExpandedStep(expandedStep === idx ? null : idx)}
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-white p-1.5 rounded shadow-sm">
                      {getStepIcon(idx)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">
                        <span className="text-gray-400 mr-2">[{s.step}/6]</span> 
                        {s.name}
                      </p>
                      <p className="text-xs text-gray-500">Completed in {s.time}s</p>
                    </div>
                  </div>
                  {expandedStep === idx ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
                </div>
                
                {expandedStep === idx && (
                  <div className="p-4 bg-slate-900 overflow-x-auto text-xs text-green-400 font-mono">
                    <pre>{JSON.stringify(s.data, null, 2)}</pre>
                  </div>
                )}
              </div>
            ))}

            {running && steps.length < 6 && (
              <div className="flex items-center gap-3 p-4 bg-white border border-dashed border-gray-300 rounded opacity-50">
                <div className="animate-spin h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full" />
                <span className="text-sm font-semibold text-gray-500">Executing step {steps.length + 1}...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


