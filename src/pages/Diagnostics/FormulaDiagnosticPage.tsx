import React from 'react';
import FormulaDiagnosticTool from '../../components/diagnostics/FormulaDiagnosticTool';

/**
 * Page de diagnostic des formules pour les développeurs
 */
const FormulaDiagnosticPage: React.FC = () => {
    return (
        <div className="container mx-auto py-6 px-4">
            <header className="mb-6">
                <h1 className="text-2xl font-bold mb-2">Diagnostic des formules</h1>
                <p className="text-gray-600">
                    Utilisez cet outil pour tester et valider le comportement de l'éditeur de formules.
                    Cette page est destinée aux développeurs uniquement.
                </p>
            </header>
            
            <main>
                <FormulaDiagnosticTool />
            </main>
        </div>
    );
};

export default FormulaDiagnosticPage;
