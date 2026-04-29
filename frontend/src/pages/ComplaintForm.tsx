import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Upload, Shield, AlertTriangle, CheckCircle } from "lucide-react";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function ComplaintForm() {
  const [loading, setLoading] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRef.current) return;
    
    setLoading(true);
    setError(null);
    setSuccessId(null);
    
    try {
      const formData = new FormData(formRef.current);
      
      const res = await fetch(`${BASE_URL}/api/complaint/submit`, {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || "Failed to submit complaint");
      }
      
      setSuccessId(data.complaint_id);
      formRef.current.reset();
      setFileName(null);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
    } else {
      setFileName(null);
    }
  };

  if (successId) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-6">
        <div className="bg-white border border-gray-200 rounded shadow-sm p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 text-gov-success rounded-full flex items-center justify-center mb-6">
            <CheckCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Complaint Submitted Successfully</h2>
          <p className="text-gray-600 mb-6">
            Your grievance has been securely recorded and is currently being processed by our AI systems.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded p-4 mb-8">
            <p className="text-sm text-gray-500 mb-1">Your Tracking ID</p>
            <p className="text-xl font-mono font-bold text-gov-blue">{successId}</p>
          </div>
          <div className="flex justify-center gap-4">
            <Link to="/" className="px-6 py-2 border border-gray-300 rounded text-gray-700 font-semibold hover:bg-gray-50 transition-colors">
              Return Home
            </Link>
            <button 
              onClick={() => setSuccessId(null)} 
              className="px-6 py-2 bg-gov-primary hover:bg-red-800 text-white rounded font-semibold transition-colors"
            >
              File Another Complaint
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-6">
      <Link to="/" className="inline-flex items-center gap-2 text-gov-blue hover:text-blue-800 font-medium mb-6">
        <ArrowLeft size={16} /> Back to Home
      </Link>
      
      <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
        <div className="bg-gov-bg border-b border-gray-200 px-8 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="text-gov-primary" size={24} />
            <h1 className="text-2xl font-bold text-gray-900">File a Cyber Grievance</h1>
          </div>
          <p className="text-gray-600 text-sm">
            Provide as much detail as possible. If you have screenshots of fraudulent messages, UPI transfers, or fake emails, please upload them. Our OCR system will automatically extract text from the images.
          </p>
        </div>
        
        <form ref={formRef} onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-gov-alert px-4 py-3 rounded flex items-start gap-2">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">Full Name *</label>
              <input 
                name="citizen_name" 
                required 
                placeholder="Enter your full name"
                className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-gov-blue focus:ring-1 focus:ring-gov-blue"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">Phone Number *</label>
              <input 
                name="phone" 
                required 
                placeholder="+91-XXXXXXXXXX"
                className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-gov-blue focus:ring-1 focus:ring-gov-blue"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">City / Location *</label>
              <input 
                name="location" 
                required 
                placeholder="e.g. Mumbai, Maharashtra"
                className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-gov-blue focus:ring-1 focus:ring-gov-blue"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">Date of Incident *</label>
              <input 
                name="date_of_incident" 
                type="date"
                required 
                className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-gov-blue focus:ring-1 focus:ring-gov-blue"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1.5">Complaint Description</label>
            <textarea 
              name="complaint_text" 
              placeholder="Describe the incident in detail..."
              className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-gov-blue focus:ring-1 focus:ring-gov-blue min-h-[120px]"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1.5">Evidence (Screenshot / Image)</label>
            <div 
              className="border-2 border-dashed border-gray-300 rounded bg-gray-50 p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={24} className="text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 font-medium">
                {fileName ? fileName : "Click to upload an image"}
              </p>
              <p className="text-xs text-gray-400 mt-1">Supports JPG, PNG, WEBP</p>
              <input 
                type="file" 
                name="complaint_image" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".jpg,.jpeg,.png,.webp"
                onChange={handleFileChange}
              />
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-200 flex justify-end">
            <button 
              type="submit" 
              disabled={loading}
              className="bg-gov-primary hover:bg-red-800 text-white font-semibold px-8 py-2.5 rounded transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Submitting...
                </>
              ) : (
                "Submit Complaint"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
