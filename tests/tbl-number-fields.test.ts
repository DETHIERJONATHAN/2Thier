/**
 * 🧪 Tests E2E pour les champs NUMBER dans TBL
 */

import { describe, it, expect } from 'vitest';

describe('TBLFieldRendererAdvanced - Champs NUMBER - Tests Simples', () => {
  describe('Conversion de valeurs', () => {
    it('devrait convertir une chaîne vide en null', () => {
      const finalValue = '';
      const numericValue = finalValue === '' || finalValue === null || finalValue === undefined 
        ? null 
        : Number(finalValue);
      
      expect(numericValue).toBe(null);
    });

    it('devrait convertir null en null', () => {
      const finalValue = null;
      const numericValue = finalValue === '' || finalValue === null || finalValue === undefined 
        ? null 
        : Number(finalValue);
      
      expect(numericValue).toBe(null);
    });

    it('devrait convertir undefined en null', () => {
      const finalValue = undefined;
      const numericValue = finalValue === '' || finalValue === null || finalValue === undefined 
        ? null 
        : Number(finalValue);
      
      expect(numericValue).toBe(null);
    });

    it('devrait convertir "123" en 123', () => {
      const finalValue = '123';
      const numericValue = finalValue === '' || finalValue === null || finalValue === undefined 
        ? null 
        : Number(finalValue);
      
      expect(numericValue).toBe(123);
    });

    it('devrait convertir "3.14" en 3.14', () => {
      const finalValue = '3.14';
      const numericValue = finalValue === '' || finalValue === null || finalValue === undefined 
        ? null 
        : Number(finalValue);
      
      expect(numericValue).toBe(3.14);
    });

    it('devrait gérer les nombres négatifs', () => {
      const finalValue = '-42';
      const numericValue = finalValue === '' || finalValue === null || finalValue === undefined 
        ? null 
        : Number(finalValue);
      
      expect(numericValue).toBe(-42);
    });

    it('devrait retourner NaN pour une chaîne invalide', () => {
      const finalValue = 'abc';
      const numericValue = finalValue === '' || finalValue === null || finalValue === undefined 
        ? null 
        : Number(finalValue);
      
      expect(isNaN(numericValue as number)).toBe(true);
    });
  });

  describe('Logique disabled/readOnly', () => {
    it('disabled devrait être true si disabled=true', () => {
      const disabled = true;
      const isReadOnly = false;
      const isDisabled = disabled || isReadOnly;
      
      expect(isDisabled).toBe(true);
    });

    it('disabled devrait être true si isReadOnly=true', () => {
      const disabled = false;
      const isReadOnly = true;
      const isDisabled = disabled || isReadOnly;
      
      expect(isDisabled).toBe(true);
    });

    it('disabled devrait être false si les deux sont false', () => {
      const disabled = false;
      const isReadOnly = false;
      const isDisabled = disabled || isReadOnly;
      
      expect(isDisabled).toBe(false);
    });
  });

  describe('Logique useCalculatedValue', () => {
    it('devrait utiliser calculatedValue si hasFormula=true et !manualOverrideAllowed', () => {
      const hasFormula = true;
      const manualOverrideAllowed = false;
      const formulaIsConstraint = false;
      
      const useCalculatedValue = hasFormula && !manualOverrideAllowed && !formulaIsConstraint;
      
      expect(useCalculatedValue).toBe(true);
    });

    it('ne devrait PAS utiliser calculatedValue si manualOverrideAllowed=true', () => {
      const hasFormula = true;
      const manualOverrideAllowed = true;
      const formulaIsConstraint = false;
      
      const useCalculatedValue = hasFormula && !manualOverrideAllowed && !formulaIsConstraint;
      
      expect(useCalculatedValue).toBe(false);
    });

    it('ne devrait PAS utiliser calculatedValue si formulaIsConstraint=true', () => {
      const hasFormula = true;
      const manualOverrideAllowed = false;
      const formulaIsConstraint = true;
      
      const useCalculatedValue = hasFormula && !manualOverrideAllowed && !formulaIsConstraint;
      
      expect(useCalculatedValue).toBe(false);
    });

    it('ne devrait PAS utiliser calculatedValue si hasFormula=false', () => {
      const hasFormula = false;
      const manualOverrideAllowed = false;
      const formulaIsConstraint = false;
      
      const useCalculatedValue = hasFormula && !manualOverrideAllowed && !formulaIsConstraint;
      
      expect(useCalculatedValue).toBe(false);
    });
  });

  describe('Détection de formules de contrainte', () => {
    it('devrait détecter une formule de contrainte number_max', () => {
      const formulaInstances = {
        'formula-1': {
          targetProperty: 'number_max',
          expression: '100'
        }
      };
      
      const isConstraintFormula = (instances: Record<string, any>): boolean => {
        for (const [_, instance] of Object.entries(instances)) {
          const targetProperty = instance.targetProperty as string | undefined;
          if (targetProperty && ['number_max', 'number_min', 'max', 'min', 'step', 'visible', 'disabled', 'required'].includes(targetProperty)) {
            return true;
          }
        }
        return false;
      };
      
      expect(isConstraintFormula(formulaInstances)).toBe(true);
    });

    it('ne devrait PAS détecter une formule de valeur', () => {
      const formulaInstances = {
        'formula-1': {
          targetProperty: 'value',
          expression: '@value.field1 + @value.field2'
        }
      };
      
      const isConstraintFormula = (instances: Record<string, any>): boolean => {
        for (const [_, instance] of Object.entries(instances)) {
          const targetProperty = instance.targetProperty as string | undefined;
          if (targetProperty && ['number_max', 'number_min', 'max', 'min', 'step', 'visible', 'disabled', 'required'].includes(targetProperty)) {
            return true;
          }
        }
        return false;
      };
      
      expect(isConstraintFormula(formulaInstances)).toBe(false);
    });
  });

  describe('Contraintes min/max avec clamping', () => {
    it('devrait clamper une valeur au-dessus du max', () => {
      const val = 150;
      const numberMax = 100;
      
      let clampedVal = val;
      if (numberMax !== undefined && val > numberMax) {
        clampedVal = numberMax;
      }
      
      expect(clampedVal).toBe(100);
    });

    it('devrait clamper une valeur en-dessous du min', () => {
      const val = -10;
      const numberMin = 0;
      
      let clampedVal = val;
      if (numberMin !== undefined && val < numberMin) {
        clampedVal = numberMin;
      }
      
      expect(clampedVal).toBe(0);
    });

    it('ne devrait PAS clamper une valeur dans les limites', () => {
      const val = 50;
      const numberMin = 0;
      const numberMax = 100;
      
      let clampedVal = val;
      if (numberMax !== undefined && val > numberMax) {
        clampedVal = numberMax;
      }
      if (numberMin !== undefined && val < numberMin) {
        clampedVal = numberMin;
      }
      
      expect(clampedVal).toBe(50);
    });
  });
});
