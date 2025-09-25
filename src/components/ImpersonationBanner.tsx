import React from 'react';
import { useAuth } from '../auth/useAuth';

const ImpersonationBanner: React.FC = () => {
  const { isImpersonating, user, originalUser, clearImpersonation } = useAuth();

  if (!isImpersonating) {
    return null;
  }

  return (
    <div className="bg-yellow-400 text-black p-2 text-center text-sm fixed top-0 left-0 right-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <span>
          Vous usurpez l'identité de{' '}
          <strong>
            {user?.firstName} {user?.lastName}
          </strong>{' '}
          ({user?.email})
          {originalUser && <span className="hidden md:inline"> en tant que {originalUser.email}</span>}.
        </span>
        <button
          onClick={clearImpersonation}
          className="ml-4 bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-md text-xs"
        >
          Arrêter
        </button>
      </div>
    </div>
  );
};

export default ImpersonationBanner;
