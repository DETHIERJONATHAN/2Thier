import React from 'react';
import { FaExchangeAlt } from 'react-icons/fa';
import { useAuth } from '../../auth/useAuth';

const HeaderImpersonation: React.FC = () => {
  const { 
    isImpersonating, 
    clearImpersonation,
    user 
  } = useAuth();

  if (!isImpersonating) return null;

  return (
    <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm flex items-center">
      <FaExchangeAlt className="mr-1" />
      <span>Mode usurpation: {user?.firstName} {user?.lastName}</span>
      <button 
        onClick={clearImpersonation}
        className="ml-2 text-yellow-700 hover:text-yellow-900 font-medium"
      >
        Quitter
      </button>
    </div>
  );
};

export default HeaderImpersonation;
