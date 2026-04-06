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
    const [submitState, setSubmitState] = useState<
        | { type: 'idle' }
        | { type: 'success'; complaintId: string }
        | { type: 'error'; message: string }
    >({ type: 'idle' });
    const [lastFormData, setLastFormData] = useState<FormData | null>(null);

    // Cleanup preview URL on unmount
    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        // Clear field-specific error when user starts typing
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

    // Generic blur validator for required text fields
    const handleRequiredBlur = (fieldName: string, label: string) => () => {
        const value = formData[fieldName as keyof typeof formData];
        if (value !== undefined && !value.trim()) {
            setErrors(prev => ({ ...prev, [fieldName]: `${label} is required.` }));
        } else {
            setErrors(prev => ({ ...prev, [fieldName]: '' }));
        }
    };

    // Description blur - validate content requirement
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
            
            // Generate preview
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(URL.createObjectURL(selectedFile));
            
            // Clear content error
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
        
        // 1. Phone validation (exactly 10 digits)
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(formData.phone)) {
            newErrors.phone = 'Phone number must be exactly 10 digits.';
        }

        // 2. Required content check (either text or image)
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
            // Clear form on success
            setFormData({ citizen_name: '', phone: '', location: '', date_of_incident: '', complaint_text: '' });
            setLastFormData(null);
            removeFile();
        } catch (error: any) {
            console.error('Submission error:', error);
            const message = error.response?.data?.detail
                || error.message
                || 'Something went wrong. Please try again.';
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

    return (
        <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Submit Cyber Grievance</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Full Name</label>
                        <input 
                            type="text" name="citizen_name" required value={formData.citizen_name}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 transition ${errors.citizen_name ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                            onChange={handleChange}
                            onBlur={handleRequiredBlur('citizen_name', 'Full Name')}
                        />
                        {errors.citizen_name && <p className="mt-1 text-xs text-red-500 font-medium">{errors.citizen_name}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Phone Number</label>
                        <input 
                            type="text" name="phone" required value={formData.phone}
                            placeholder="10-digit number"
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 transition ${errors.phone ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                            onChange={handleChange}
                            onBlur={handlePhoneBlur}
                        />
                        {errors.phone && <p className="mt-1 text-xs text-red-500 font-medium">{errors.phone}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Location</label>
                        <input 
                            type="text" name="location" required value={formData.location}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 transition ${errors.location ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                            onChange={handleChange}
                            onBlur={handleRequiredBlur('location', 'Location')}
                        />
                        {errors.location && <p className="mt-1 text-xs text-red-500 font-medium">{errors.location}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Date of Incident</label>
                        <input 
                            type="date" name="date_of_incident" required value={formData.date_of_incident}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 transition"
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Complaint Description</label>
                    <textarea 
                        name="complaint_text" rows={4} value={formData.complaint_text}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 transition ${errors.content ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                        placeholder="Describe what happened..."
                        onChange={handleChange}
                        onBlur={handleDescriptionBlur}
                    ></textarea>
                    {errors.content && <p className="mt-1 text-xs text-red-500 font-medium">{errors.content}</p>}
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Upload Evidence (Image/Screenshot)</label>
                    {!previewUrl ? (
                        <input 
                            type="file" accept="image/*"
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition"
                            onChange={handleFileChange}
                        />
                    ) : (
                        <div className="relative inline-block mt-2 group">
                            <img src={previewUrl} alt="Preview" className="h-32 w-auto rounded-lg shadow-md border border-gray-100" />
                            <button 
                                type="button" onClick={removeFile}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            <p className="mt-1 text-xs text-gray-400">Selected: {file?.name}</p>
                        </div>
                    )}
                </div>

                <button 
                    type="submit" disabled={isSubmitting}
                    className={`w-full py-3 flex items-center justify-center space-x-2 text-white font-bold rounded-lg transform transition shadow-lg ${isSubmitting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-0.5'}`}
                >
                    {isSubmitting ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Processing...</span>
                        </>
                    ) : (
                        <span>Submit Grievance</span>
                    )}
                </button>
            </form>

            {/* Success Banner */}
            {submitState.type === 'success' && (
                <div className="mt-6 p-5 rounded-xl bg-green-50 border border-green-200 flex items-start space-x-4">
                    <div className="flex-shrink-0 mt-0.5">
                        <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-bold text-green-800 text-base">Grievance Submitted Successfully</h3>
                        <p className="text-sm text-green-700 mt-1">Your complaint has been registered and will be reviewed shortly.</p>
                        <div className="mt-2 px-3 py-1.5 bg-green-100 rounded-lg inline-block">
                            <span className="text-xs text-green-600 font-semibold">Complaint ID: </span>
                            <span className="text-xs font-mono font-bold text-green-800">{submitState.complaintId}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Banner with Retry */}
            {submitState.type === 'error' && (
                <div className="mt-6 p-5 rounded-xl bg-red-50 border border-red-200">
                    <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 mt-0.5">
                            <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-red-800 text-base">Submission Failed</h3>
                            <p className="text-sm text-red-600 mt-1">{submitState.message}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleRetry}
                        disabled={isSubmitting}
                        className="mt-3 w-full py-2 flex items-center justify-center space-x-2 border-2 border-red-400 text-red-700 font-semibold rounded-lg hover:bg-red-100 transition disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Retrying...</span>
                            </>
                        ) : (
                            <>
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>Retry Submission</span>
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ComplaintForm;
