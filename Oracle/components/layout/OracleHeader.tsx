import React from 'react';
import { MenuOutlined, SearchOutlined, BellOutlined, UserOutlined } from '@ant-design/icons';

interface OracleHeaderProps {
  onMenuClick: () => void;
}

const OracleHeader: React.FC<OracleHeaderProps> = ({ onMenuClick }) => {
  return (
    <header className="h-14 bg-[#312D2A] flex items-center px-4 shadow-lg z-50">
      {/* Partie gauche */}
      <div className="flex items-center">
        <button 
          onClick={onMenuClick}
          className="p-2 text-white/80 hover:text-white hover:bg-[#D67D35] active:bg-[#B8652A] rounded-lg transition-colors duration-200"
        >
          <MenuOutlined className="text-xl" />
        </button>
        
        <div className="ml-4 flex items-center space-x-8">
          <img src="/oracle-logo.svg" alt="Oracle Logo" className="h-6" />
          <span className="text-white/90 font-medium">Cloud Infrastructure</span>
        </div>
      </div>

      {/* Partie droite */}
      <div className="ml-auto flex items-center space-x-4">
        {/* Barre de recherche */}
        <div className="relative">
          <input 
            type="text"
            placeholder="Rechercher..."
            className="
              bg-[#4a4541] 
              text-white 
              placeholder-white/60
              px-4 
              py-1.5 
              pl-10
              rounded-lg
              border
              border-[#625D59]
              focus:outline-none
              focus:border-[#D67D35]
              focus:ring-2
              focus:ring-[#D67D35]/20
              w-64
            "
          />
          <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
        </div>

        {/* Icônes d'actions */}
        <button className="p-2 text-white/80 hover:text-white hover:bg-[#D67D35] active:bg-[#B8652A] rounded-lg transition-colors duration-200">
          <BellOutlined className="text-xl" />
        </button>

        {/* Profil */}
        <button className="
          flex items-center space-x-2 
          px-3 py-1.5 
          text-white/80 
          hover:text-white 
          hover:bg-[#D67D35] 
          active:bg-[#B8652A]
          rounded-lg
          transition-colors duration-200
        ">
          <UserOutlined className="text-lg" />
          <span>Profil</span>
        </button>
      </div>
    </header>
  );
};

export default OracleHeader;
