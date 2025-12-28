import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, LogOut, Building2, Check } from 'lucide-react';
import { useAuth } from '../auth/useAuth';

const ProfileMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showOrgSelector, setShowOrgSelector] = useState(false);
  const { user, logout, isSuperAdmin, organizations, currentOrganization, selectOrganization } = useAuth();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    if (logout) {
      logout();
    }
    navigate('/login');
  };

  const handleOrgChange = async (orgId: string) => {
    try {
      await selectOrganization(orgId);
      setShowOrgSelector(false);
      setIsOpen(false);
    } catch (error) {
      console.error('Erreur lors du changement d\'organisation:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
      >
        <User className="h-6 w-6 rounded-full" />
        <div className="hidden sm:block text-left">
          <div className="text-sm font-medium">{user.firstName}</div>
          {isSuperAdmin && currentOrganization && (
            <div className="text-xs text-gray-500">{currentOrganization.name}</div>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-10 py-1 border border-gray-200">
          <Link
            to="/settings/profile"
            onClick={() => setIsOpen(false)}
            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <User className="mr-2 h-4 w-4" />
            <span>Mon Profil</span>
          </Link>

          {isSuperAdmin && organizations && organizations.length > 0 && (
            <>
              <div className="border-t border-gray-200 my-1"></div>
              <button
                onClick={() => setShowOrgSelector(!showOrgSelector)}
                className="w-full text-left flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <div className="flex items-center">
                  <Building2 className="mr-2 h-4 w-4" />
                  <span>Changer d'organisation</span>
                </div>
                <svg 
                  className={`h-4 w-4 transition-transform ${showOrgSelector ? 'rotate-180' : ''}`}
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {showOrgSelector && (
                <div className="ml-4 max-h-48 overflow-y-auto">
                  {organizations.map(org => (
                    <button
                      key={org.id}
                      onClick={() => handleOrgChange(org.id)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 flex items-center justify-between"
                    >
                      <span>{org.name}</span>
                      {currentOrganization?.id === org.id && (
                        <Check className="h-4 w-4 text-blue-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="border-t border-gray-200 my-1"></div>
          <button
            onClick={handleLogout}
            className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Déconnexion</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileMenu;
