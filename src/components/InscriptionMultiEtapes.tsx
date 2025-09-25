import React, { useState } from 'react';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi'; // Utiliser le hook pour la cohérence

export default function InscriptionMultiEtapes({ onSwitchToLogin }: { onSwitchToLogin?: () => void; }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // On utilise une instance non authentifiée de l'API pour les routes publiques
  const { post } = useAuthenticatedApi(true); 

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.email || !form.password || !form.firstName || !form.lastName) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    
    setLoading(true);

    try {
      await post('/register', form);

      setSuccess('Inscription réussie ! Vous pouvez maintenant vous connecter.');
      
      setTimeout(() => {
        if (onSwitchToLogin) {
          onSwitchToLogin();
        }
      }, 2000);

    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Créer un compte</h2>
      
      <input
        type="text"
        name="firstName"
        placeholder="Prénom"
        value={form.firstName}
        onChange={handleChange}
        className="w-full mb-2 p-2 border rounded"
        required
        disabled={loading}
      />
      <input
        type="text"
        name="lastName"
        placeholder="Nom"
        value={form.lastName}
        onChange={handleChange}
        className="w-full mb-2 p-2 border rounded"
        required
        disabled={loading}
      />
      <input
        type="email"
        name="email"
        placeholder="Email"
        value={form.email}
        onChange={handleChange}
        className="w-full mb-2 p-2 border rounded"
        required
        disabled={loading}
      />
      <div className="relative mb-2">
        <input
          type={showPassword ? 'text' : 'password'}
          name="password"
          placeholder="Mot de passe"
          value={form.password}
          onChange={handleChange}
          className="w-full p-2 border rounded pr-10"
          required
          disabled={loading}
        />
        <button
          type="button"
          tabIndex={-1}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500"
          onClick={() => setShowPassword((v) => !v)}
          disabled={loading}
        >
          {showPassword ? 'Masquer' : 'Afficher'}
        </button>
      </div>

      {error && <div className="text-red-500 mb-2">{error}</div>}
      {success && <div className="text-green-500 mb-2">{success}</div>}

      <div className="flex justify-between mt-4">
        <button type="submit" className="w-full px-4 py-2 bg-green-600 text-white rounded" disabled={loading}>
          {loading ? 'Inscription en cours...' : 'S\'inscrire'}
        </button>
      </div>

      <div className="mt-4 text-center">
        <button type="button" className="text-blue-600 underline text-sm" onClick={onSwitchToLogin} disabled={loading}>
          Déjà un compte ? Se connecter
        </button>
      </div>
    </form>
  );
}

