// src/pages/GestionSAVPage.tsx
import React from 'react';
import { useAuth } from '../auth/useAuth';

export default function GestionSAVPage() {
  const { modules, can } = useAuth();

  const hasSavModule = modules.some(module => module.name === 'gestion_sav' && module.active);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Gestion SAV</h1>
      <p className="mb-4">Ce module permet de gérer les tickets de service après-vente (SAV).</p>
      {/* Affichage du bouton uniquement si la feature et la permission sont actives */}
      {hasSavModule && can('sav:create') && (
        <button className="mb-4 px-4 py-2 bg-blue-600 text-white rounded font-semibold shadow hover:bg-blue-700 transition">
          Créer un ticket SAV
        </button>
      )}
      <div className="bg-blue-50 p-4 rounded">
        Module SAV plug & play (affiché si feature 'gestion_sav' active)
      </div>
    </div>
  );
}
