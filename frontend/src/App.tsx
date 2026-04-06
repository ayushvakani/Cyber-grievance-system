import React from 'react';
import ComplaintForm from './components/ComplaintForm';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header Section */}
        <header className="text-center space-y-4">
          <h1 className="text-5xl font-extrabold text-indigo-900 tracking-tight">
            Cyber Grievance Support System
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Report cybercrime, online harassment, or fraudulent activities. 
            Our AI-powered system will analyze your grievance for faster resolution.
          </p>
        </header>

        {/* Main Form Component */}
        <main>
          <ComplaintForm />
        </main>

        {/* Footer Info */}
        <footer className="text-center text-sm text-gray-400 mt-12 pb-8">
          &copy; 2024 Final Year Project - KJ Somaiya Institute of Technology. 
          Powered by Mistral AI & EasyOCR.
        </footer>
      </div>
    </div>
  );
}

export default App;
