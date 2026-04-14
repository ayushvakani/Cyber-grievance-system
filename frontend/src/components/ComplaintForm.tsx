import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ComplaintForm: React.FC = () => {
    const [formData, setFormData] = useState({
        citizen_name: '',
        phone: '',
        location: '',
        date_of_incident: '',
        complaint_text: ''
    });
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [copied, setCopied] = useState(false);
    const [submitState, setSubmitState] = useState<
        | { type: 'idle' }
        | { type: 'success'; complaintId: string }
        | { type: 'error'; message: string }
    >({ type: 'idle' });
    const [lastFormData, setLastFormData] = useState<FormData | null>(null);

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (errors[e.target.name]) {
            setErrors(prev => ({ ...prev, [e.target.name]: '' }));
        }
    };

    const handlePhoneBlur = () => {
        const phoneRegex = /^[0-9]{10}$/;
        if (formData.phone && !phoneRegex.test(formData.phone)) {
            setErrors(prev => ({ ...prev, phone: 'Phone number must be exactly 10 digits.' }));
        } else {
            setErrors(prev => ({ ...prev, phone: '' }));
        }
    };

    const handleRequiredBlur = (fieldName: string, label: string) => () => {
        const value = formData[fieldName as keyof typeof formData];
        if (value !== undefined && !value.trim()) {
            setErrors(prev => ({ ...prev, [fieldName]: `${label} is required.` }));
        } else {
            setErrors(prev => ({ ...prev, [fieldName]: '' }));
        }
    };

    const handleDescriptionBlur = () => {
        if (!formData.complaint_text.trim() && !file) {
            setErrors(prev => ({ ...prev, content: 'Please provide either a description or an image.' }));
        } else {
            setErrors(prev => ({ ...prev, content: '' }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(URL.createObjectURL(selectedFile));
            setErrors(prev => ({ ...prev, content: '' }));
        }
    };

    const removeFile = () => {
        setFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(formData.phone)) {
            newErrors.phone = 'Phone number must be exactly 10 digits.';
        }
        if (!formData.complaint_text.trim() && !file) {
            newErrors.content = 'Please provide either a description or an image.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const submitToApi = async (data: FormData) => {
        setIsSubmitting(true);
        setSubmitState({ type: 'idle' });
        try {
            const response = await axios.post('http://localhost:8000/api/complaint/submit', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setSubmitState({ type: 'success', complaintId: response.data.complaint_id });
            setFormData({ citizen_name: '', phone: '', location: '', date_of_incident: '', complaint_text: '' });
            setLastFormData(null);
            removeFile();
        } catch (error: any) {
            console.error('Submission error:', error);
            
            let message = 'Something went wrong. Please try again.';
            if (error.code === 'ERR_NETWORK') {
                message = 'Backend not started. Please ensure the server is running on port 8000.';
            } else if (error.response?.data?.detail) {
                message = error.response.data.detail;
            } else if (error.message) {
                message = error.message;
            }
            
            setSubmitState({ type: 'error', message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        const data = new FormData();
        data.append('citizen_name', formData.citizen_name);
        data.append('phone', formData.phone);
        data.append('location', formData.location);
        data.append('date_of_incident', formData.date_of_incident);
        data.append('complaint_text', formData.complaint_text);
        if (file) data.append('complaint_image', file);
        setLastFormData(data);
        await submitToApi(data);
    };

    const handleRetry = async () => {
        if (lastFormData) await submitToApi(lastFormData);
    };

    const handleCopyId = (id: string) => {
        navigator.clipboard.writeText(id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
            {/* Header */}
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-5xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between">
                    <div className="flex items-center gap-4 mb-4 sm:mb-0">
                        <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center font-bold text-xl shadow-sm">
                            CG
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold text-gray-900">Ministry of Electronics & IT</h1>
                            <p className="text-sm text-gray-500">Government of India Cyber Grievance Portal</p>
                        </div>
                    </div>
                    <div className="text-sm text-gray-600 text-center sm:text-right">
                        <p className="font-medium">Helpline: <span className="text-red-600">1800-XXX-XXXX</span></p>
                        <p>cyber-support@meity.gov.in</p>
                    </div>
                </div>
                <div className="bg-red-600 text-white text-center py-2 text-xs font-medium tracking-wide">
                    NATIONAL CYBER CRIME REPORTING PORTAL
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-3xl mx-auto px-4 py-10">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-8 py-6 border-b border-gray-100">
                        <h2 className="text-2xl font-semibold text-gray-900">File a Complaint</h2>
                        <p className="text-sm text-gray-500 mt-1">Please provide accurate details. Fields marked with <span className="text-red-500">*</span> are mandatory.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="px-8 py-6 space-y-8">
                        {/* Section 1 */}
                        <div>
                            <h3 className="text-base font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4">1. Complainant Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Full Name <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                        type="text" name="citizen_name" required value={formData.citizen_name}
                                        className={`w-full px-4 py-2.5 bg-gray-50 border rounded-lg text-sm transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400 ${errors.citizen_name ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                                        onChange={handleChange}
                                        onBlur={handleRequiredBlur('citizen_name', 'Full Name')}
                                    />
                                    {errors.citizen_name && <p className="mt-1.5 text-xs text-red-500">{errors.citizen_name}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Phone Number <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                        type="text" name="phone" required value={formData.phone}
                                        placeholder="10-digit number"
                                        className={`w-full px-4 py-2.5 bg-gray-50 border rounded-lg text-sm transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400 ${errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                                        onChange={handleChange}
                                        onBlur={handlePhoneBlur}
                                    />
                                    {errors.phone && <p className="mt-1.5 text-xs text-red-500">{errors.phone}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Section 2 */}
                        <div>
                            <h3 className="text-base font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4">2. Incident Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Location / Address <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                        type="text" name="location" required value={formData.location}
                                        className={`w-full px-4 py-2.5 bg-gray-50 border rounded-lg text-sm transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400 ${errors.location ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                                        onChange={handleChange}
                                        onBlur={handleRequiredBlur('location', 'Location')}
                                    />
                                    {errors.location && <p className="mt-1.5 text-xs text-red-500">{errors.location}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Date of Incident <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                        type="date" name="date_of_incident" required value={formData.date_of_incident}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400"
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 3 */}
                        <div>
                            <h3 className="text-base font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4">3. Complaint Description</h3>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Describe the Incident <span className="text-red-500">*</span>
                                </label>
                                <textarea 
                                    name="complaint_text" rows={4} value={formData.complaint_text}
                                    className={`w-full px-4 py-3 bg-gray-50 border rounded-lg text-sm transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400 resize-y ${errors.content ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                                    placeholder="Provide detailed information about the cybercrime..."
                                    onChange={handleChange}
                                    onBlur={handleDescriptionBlur}
                                ></textarea>
                                {errors.content && <p className="mt-1.5 text-xs text-red-500">{errors.content}</p>}
                                <p className="mt-2 text-xs text-gray-500">Include details like platforms involved, how you were targeted, and any financial loss.</p>
                            </div>
                        </div>

                        {/* Section 4 */}
                        <div>
                            <h3 className="text-base font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4">4. Evidence</h3>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Upload Supporting Document (Screenshot / Image)
                                </label>
                                {!previewUrl ? (
                                    <div className="border border-dashed border-gray-300 bg-gray-50 rounded-xl p-8 text-center hover:bg-gray-100 hover:border-gray-400 transition-colors cursor-pointer">
                                        <input 
                                            type="file" accept="image/*"
                                            className="hidden"
                                            id="file-upload"
                                            onChange={handleFileChange}
                                        />
                                        <label htmlFor="file-upload" className="cursor-pointer block w-full h-full">
                                            <svg className="w-8 h-8 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                            <span className="text-sm font-medium text-red-600 hover:text-red-700">Click to upload</span>
                                            <span className="text-sm text-gray-500"> or drag and drop</span>
                                            <p className="text-xs text-gray-400 mt-2">PNG, JPG, JPEG up to 5MB</p>
                                        </label>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4 border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
                                        <img src={previewUrl} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-gray-100" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{file?.name}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">Ready to submit</p>
                                        </div>
                                        <button 
                                            type="button" onClick={removeFile}
                                            className="text-sm text-red-600 hover:text-red-700 font-medium px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Notice */}
                        <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 flex gap-3 text-sm">
                            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-amber-800">
                                Filing a false complaint is a punishable offence under the IT Act, 2000. Ensure all provided information is accurate.
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-4 pt-4 border-t border-gray-100">
                            <button 
                                type="button"
                                onClick={() => setFormData({ citizen_name: '', phone: '', location: '', date_of_incident: '', complaint_text: '' })}
                                className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Clear Form
                            </button>
                            <button 
                                type="submit" disabled={isSubmitting}
                                className={`w-full sm:w-auto px-8 py-2.5 text-sm font-medium text-white rounded-lg transition-all flex items-center justify-center gap-2 ${isSubmitting ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 shadow-sm hover:shadow'}`}
                            >
                                {isSubmitting ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Submitting...</span>
                                    </>
                                ) : (
                                    <span>Submit Complaint</span>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Status Messages */}
                {submitState.type === 'success' && (
                    <div className="mt-6 bg-white border border-green-200 rounded-xl p-6 shadow-sm">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-gray-900">Complaint Registered Successfully</h3>
                                <p className="text-sm text-gray-600 mt-1">Your grievance has been submitted to the Ministry. Please save your Complaint ID for future reference.</p>
                                <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 inline-flex items-center gap-3">
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Complaint ID</span>
                                    <span className="text-sm font-mono font-medium text-gray-900">{submitState.complaintId}</span>
                                    <button 
                                        onClick={() => handleCopyId(submitState.complaintId)}
                                        className="ml-2 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
                                        title="Copy Complaint ID"
                                    >
                                        {copied ? (
                                            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {submitState.type === 'error' && (
                    <div className="mt-6 bg-white border border-red-200 rounded-xl p-6 shadow-sm">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-base font-semibold text-gray-900">Submission Failed</h3>
                                <p className="text-sm text-gray-600 mt-1">{submitState.message}</p>
                                <button
                                    onClick={handleRetry}
                                    disabled={isSubmitting}
                                    className="mt-4 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Retrying...' : 'Try Again'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 py-8 text-center">
                <div className="max-w-3xl mx-auto px-4">
                    <p className="text-sm text-gray-600">© 2024 Ministry of Electronics & Information Technology, Government of India</p>
                    <p className="text-xs text-gray-400 mt-2">This system is powered by AI to analyze cyber complaints for faster resolution.</p>
                </div>
            </footer>
        </div>
    );
};

export default ComplaintForm;