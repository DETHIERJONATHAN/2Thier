import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaSearch } from 'react-icons/fa';
import { useAuth } from '../../auth/useAuth';
import { useSidebar } from '../../hooks/useSidebar';
import NotificationsBell from '../../components/NotificationsBell';
import ProfileMenu from '../../components/ProfileMenu';
import OrganizationSelector from '../../components/OrganizationSelector';
import HeaderSearch from './HeaderSearch';
import HeaderImpersonation from './HeaderImpersonation';
import HeaderAICoach from '../../components/HeaderAICoach';

const Header: React.FC = () => {
  const { 
    user,
    currentOrganization,
    modules
  } = useAuth();
  
  const { sidebarOpen, setSidebarOpen } = useSidebar();
  const [searchOpen, setSearchOpen] = useState(false);
  
  return (
    <header className="h-16 bg-[#1F3B53] text-white shadow-md">
      <div className="h-full flex justify-between items-center px-4">
        {/* Section gauche */}
        <div className="flex items-center space-x-6">
          {/* Bouton menu */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="menu-burger-2thier"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Logo et nom organisation */}
          <div className="flex items-center space-x-3">
            <Link to="/" className="logo-2thier-container flex items-center space-x-2 text-white hover:text-gray-200">
              <img src="/logo.png" alt="Logo" className="h-8 w-8" />
              <span className="font-semibold">{currentOrganization?.name}</span>
            </Link>
          </div>
        </div>

        {/* Section centrale - Barre de recherche */}
        <div className="flex-1 max-w-2xl mx-6 hidden lg:block">
          <HeaderSearch />
        </div>

        {/* Section droite */}
        <div className="flex items-center space-x-2">
          <div className="header-special-2thier">
            <HeaderImpersonation />
          </div>
          <div className="header-special-2thier">
            <HeaderAICoach />
          </div>
          <div className="notifications-2thier-bell">
            <NotificationsBell />
          </div>
          <div className="org-selector-2thier">
            <OrganizationSelector />
          </div>
          <div className="profile-2thier-menu">
            <ProfileMenu />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
