import React, { useState } from 'react';
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
    const [status, setStatus] = useState<string>('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('Submitting...');

        const data = new FormData();
        data.append('citizen_name', formData.citizen_name);
        data.append('phone', formData.phone);
        data.append('location', formData.location);
        data.append('date_of_incident', formData.date_of_incident);
        data.append('complaint_text', formData.complaint_text);
        if (file) {
            data.append('complaint_image', file);
        }

        try {
            const response = await axios.post('http://localhost:8000/api/complaint/submit', data, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            setStatus(`Success! Complaint ID: ${response.data.complaint_id}`);
            console.log('Submission Result:', response.data);
        } catch (error) {
            console.error('Error submitting complaint:', error);
            setStatus('Error submitting complaint. Check console for details.');
        }
    };

    return (
        <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Submit Cyber Grievance</h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Full Name</label>
                        <input 
                            type="text" name="citizen_name" required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 transition"
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Phone Number</label>
                        <input 
                            type="text" name="phone" required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 transition"
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Location</label>
                        <input 
                            type="text" name="location" required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 transition"
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Date of Incident</label>
                        <input 
                            type="date" name="date_of_incident" required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 transition"
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Complaint Description</label>
                    <textarea 
                        name="complaint_text" rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 transition"
                        placeholder="Describe what happened..."
                        onChange={handleChange}
                    ></textarea>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Upload Evidence (Image/Screenshot)</label>
                    <input 
                        type="file" accept="image/*"
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition"
                        onChange={handleFileChange}
                    />
                </div>

                <button 
                    type="submit"
                    className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transform hover:-translate-y-0.5 transition shadow-lg"
                >
                    Submit Grievance
                </button>
            </form>

            {status && (
                <div className={`mt-6 p-4 rounded-lg text-center font-medium ${status.includes('Success') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                    {status}
                </div>
            )}
        </div>
    );
};

export default ComplaintForm;
