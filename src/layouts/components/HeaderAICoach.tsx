import React, { useState } from 'react';
import { FiZap } from 'react-icons/fi';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

const HeaderAICoach: React.FC = () => {
  const { api } = useAuthenticatedApi();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      await api.post('/api/ai/analyze-current-page', {
        context: { currentPage: window.location.pathname }
      });
    } catch (error) {
      console.error('Erreur AI Coach:', error);
    } finally {
      setLoading(false);
      setOpen(true);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={handleClick}
        className="flex items-center gap-1 text-sm px-2 py-1 rounded bg-white/10 text-white/90 hover:bg-white/20 border border-white/20"
      >
        <FiZap className="text-white/90" />
        IA Coach
        {loading && <span className="animate-pulse text-[10px] ml-1">…</span>}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded shadow-lg p-4 z-50">
          <div className="font-semibold mb-2">Assistant CRM</div>
          <div className="text-sm text-gray-600">
            Comment puis-je vous aider avec cette page ?
          </div>
        </div>
      )}
    </div>
  );
};

export default HeaderAICoach;
