import React, { useState } from 'react';
import { FaSearch } from 'react-icons/fa';

const HeaderSearch: React.FC = () => {
  const [searchOpen, setSearchOpen] = useState(false);
  
  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Rechercher..."
        className="w-full bg-white/10 border border-white/20 rounded-full py-1.5 pl-10 pr-4 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/20"
        onClick={() => setSearchOpen(true)}
      />
      <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60" />
      
      {searchOpen && (
        <div className="absolute top-full left-0 w-full mt-1 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 p-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase">Sections récentes</h3>
              <div className="mt-2 space-y-1">
                <button className="block w-full text-left px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100">
                  Gestion clients
                </button>
                <button className="block w-full text-left px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100">
                  Facturation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeaderSearch;
