import React, { useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * Bouton flottant pour accéder rapidement à l'outil de diagnostic des formules
 * Ce bouton n'est visible que pour les développeurs (admin)
 */
const FormulaDiagnosticButton: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div className={`bg-white rounded-lg shadow-lg p-2 mb-2 transition-all duration-200 ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                <div className="flex flex-col gap-2">
                    <Link 
                        to="/admin/diagnostics/formulas"
                        className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 3v4a1 1 0 0 0 1 1h4"></path>
                            <path d="M5 8v-3a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2h-5"></path>
                            <circle cx="6" cy="14" r="3"></circle>
                            <path d="M4.5 17 9 11"></path>
                        </svg>
                        Diagnostic des formules
                    </Link>
                </div>
            </div>

            <button
                onClick={() => setIsOpen(!isOpen)}
                className="bg-blue-700 text-white p-2 rounded-full shadow-lg hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Outils de diagnostic"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12" y2="16"></line>
                </svg>
            </button>
        </div>
    );
};

export default FormulaDiagnosticButton;
