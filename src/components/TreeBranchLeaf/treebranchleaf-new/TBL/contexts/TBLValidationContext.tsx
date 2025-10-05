import React, { createContext, useContext, useState, useCallback } from 'react';

export interface TBLValidationContextValue {
  isValidation: boolean;
  startValidation: () => void;
  stopValidation: () => void;
}

const TBLValidationContext = createContext<TBLValidationContextValue | null>(null);

export const TBLValidationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isValidation, setIsValidation] = useState(false);

  const startValidation = useCallback(() => {
    console.log('🎯 VALIDATION GLOBALE DÉMARRÉE');
    setIsValidation(true);
  }, []);

  const stopValidation = useCallback(() => {
    console.log('🎯 VALIDATION GLOBALE ARRÊTÉE');
    setIsValidation(false);
  }, []);

  const value: TBLValidationContextValue = {
    isValidation,
    startValidation,
    stopValidation
  };

  return (
    <TBLValidationContext.Provider value={value}>
      {children}
    </TBLValidationContext.Provider>
  );
};

export const useTBLValidationContext = () => {
  const context = useContext(TBLValidationContext);
  if (!context) {
    return {
      isValidation: false,
      startValidation: () => {},
      stopValidation: () => {}
    };
  }
  return context;
};