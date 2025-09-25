import React, { useState, useEffect } from 'react';
import { CaretRightOutlined } from '@ant-design/icons';
import { NavLink, useLocation } from 'react-router-dom';

import { useAuth } from '../../auth/useAuth';
import { useSharedSections } from '../../hooks/useSharedSections';
import { organizeModulesInSections } from '../../utils/modulesSections';

const OracleSidebar: React.FC = () => {
  const { modules, isSuperAdmin, can } = useAuth();
  const { sections } = useSharedSections();
  
  // Organiser les modules dans les sections
  const sectionsWithModules = organizeModulesInSections(sections, modules);
  
  // État pour gérer les sections ouvertes
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  
  useEffect(() => {
    // Initialiser les sections ouvertes
    const defaultOpen: Record<string, boolean> = {};
    sectionsWithModules.forEach(section => {
      defaultOpen[section.id] = true;
    });
    setOpenSections(defaultOpen);
  }, [sectionsWithModules]);

  // Fonction pour basculer une section
  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Style commun pour les éléments du menu
  const menuItemClass = "flex items-center text-white/80 hover:text-white hover:bg-[#D67D35] px-4 py-2.5 cursor-pointer transition-colors duration-200";
  const menuItemActiveClass = "bg-[#D67D35] text-white";

  return (
    <div className="h-full bg-[#312D2A] text-white">
      {/* Navigation principale */}
      <div className="py-2">
        {sectionsWithModules.map(section => (
          <div key={section.id}>
            <div 
              className={`${menuItemClass} justify-between`}
              onClick={() => toggleSection(section.id)}
            >
              <span>{section.title}</span>
              <CaretRightOutlined className={`
                transition-transform duration-200
                ${openSections[section.id] ? 'rotate-90' : ''}
              `} />
            </div>
            
            {/* Sous-menu avec les modules de la section */}
            {openSections[section.id] && section.modules.length > 0 && (
              <div className="bg-[#3C3833] py-1">
                {section.modules.map(module => (
                  <NavLink 
                    key={module.key || module.id}
                    to={module.route || `/modules/${module.key}`}
                    className={({ isActive }) => `
                      ${menuItemClass} 
                      pl-8
                      ${isActive ? 'bg-[#D67D35] text-white' : ''}
                    `}
                  >
                    {module.label || module.name}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default OracleSidebar;
