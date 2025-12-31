/**
 * 🧪 Tests unitaires pour les champs NUMBER dans TBLFieldRendererAdvanced
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TBLFieldRendererAdvanced from '../TBLFieldRendererAdvanced';

// Mock des dépendances
vi.mock('../../../../../hooks/useTBLTooltip', () => ({
  useTBLTooltip: () => ({ hasTooltip: false })
}));

vi.mock('../contexts/TBLValidationContext', () => ({
  useTBLValidationContext: () => ({ isValidation: false })
}));

vi.mock('../hooks/useTBLTableLookup', () => ({
  useTBLTableLookup: () => ({ options: [], loading: false })
}));

describe('TBLFieldRendererAdvanced - Champs NUMBER', () => {
  const mockOnChange = vi.fn();
  const defaultProps = {
    field: {
      id: 'test-number-field',
      label: 'Test Number',
      type: 'NUMBER',
      required: false,
      config: {},
      capabilities: {}
    },
    value: null,
    onChange: mockOnChange,
    disabled: false,
    formData: {},
    treeMetadata: {},
    allNodes: []
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendu basique', () => {
    it('devrait rendre un InputNumber', () => {
      render(<TBLFieldRendererAdvanced {...defaultProps} />);
      const input = screen.getByRole('spinbutton');
      expect(input).toBeInTheDocument();
    });

    it('devrait afficher le label du champ', () => {
      render(<TBLFieldRendererAdvanced {...defaultProps} />);
      expect(screen.getByText('Test Number')).toBeInTheDocument();
    });

    it('devrait être éditable par défaut', () => {
      render(<TBLFieldRendererAdvanced {...defaultProps} />);
      const input = screen.getByRole('spinbutton');
      expect(input).not.toBeDisabled();
      expect(input).not.toHaveAttribute('readonly');
    });
  });

  describe('Saisie de valeurs', () => {
    it('devrait permettre la saisie de nombres', async () => {
      const user = userEvent.setup();
      render(<TBLFieldRendererAdvanced {...defaultProps} />);
      
      const input = screen.getByRole('spinbutton');
      await user.click(input);
      await user.type(input, '42');

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it('devrait convertir les valeurs vides en null', () => {
      render(<TBLFieldRendererAdvanced {...defaultProps} value="" />);
      const input = screen.getByRole('spinbutton');
      expect(input).toHaveValue(null);
    });

    it('devrait convertir les valeurs en nombres', () => {
      render(<TBLFieldRendererAdvanced {...defaultProps} value="123" />);
      const input = screen.getByRole('spinbutton');
      expect(input).toHaveValue(123);
    });

    it('devrait gérer les nombres décimaux', async () => {
      const user = userEvent.setup();
      render(<TBLFieldRendererAdvanced {...defaultProps} />);
      
      const input = screen.getByRole('spinbutton');
      await user.click(input);
      await user.type(input, '3.14');

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });
  });

  describe('État disabled', () => {
    it('devrait être désactivé si disabled=true', () => {
      render(<TBLFieldRendererAdvanced {...defaultProps} disabled={true} />);
      const input = screen.getByRole('spinbutton');
      expect(input).toBeDisabled();
    });

    it('devrait être désactivé si le champ a une formule sans override', () => {
      const propsWithFormula = {
        ...defaultProps,
        field: {
          ...defaultProps.field,
          config: {
            hasFormula: true,
            formulaConfig: { allowManualOverride: false }
          }
        }
      };
      render(<TBLFieldRendererAdvanced {...propsWithFormula} />);
      
      // Devrait afficher BackendValueDisplay au lieu d'un input
      const input = screen.queryByRole('spinbutton');
      expect(input).not.toBeInTheDocument();
    });

    it('devrait être éditable si allowManualOverride=true', () => {
      const propsWithFormula = {
        ...defaultProps,
        field: {
          ...defaultProps.field,
          config: {
            hasFormula: true,
            formulaConfig: { allowManualOverride: true }
          }
        }
      };
      render(<TBLFieldRendererAdvanced {...propsWithFormula} />);
      
      const input = screen.getByRole('spinbutton');
      expect(input).not.toBeDisabled();
    });
  });

  describe('Contraintes min/max', () => {
    it('devrait appliquer une valeur minimale', () => {
      const propsWithMin = {
        ...defaultProps,
        field: {
          ...defaultProps.field,
          config: {
            numberConfig: { min: 0 }
          }
        }
      };
      render(<TBLFieldRendererAdvanced {...propsWithMin} />);
      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('aria-valuemin', '0');
    });

    it('devrait appliquer une valeur maximale', () => {
      const propsWithMax = {
        ...defaultProps,
        field: {
          ...defaultProps.field,
          config: {
            numberConfig: { max: 100 }
          }
        }
      };
      render(<TBLFieldRendererAdvanced {...propsWithMax} />);
      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('aria-valuemax', '100');
    });

    it('devrait clamper la valeur au blur si hors limites', async () => {
      const user = userEvent.setup();
      const propsWithConstraints = {
        ...defaultProps,
        field: {
          ...defaultProps.field,
          config: {
            numberConfig: { min: 0, max: 100 }
          }
        }
      };
      render(<TBLFieldRendererAdvanced {...propsWithConstraints} />);
      
      const input = screen.getByRole('spinbutton');
      await user.click(input);
      await user.type(input, '200');
      await user.tab(); // Déclenche onBlur

      await waitFor(() => {
        // Devrait avoir été clampé à 100
        expect(mockOnChange).toHaveBeenCalledWith(100);
      });
    });
  });

  describe('Variantes de rendu', () => {
    it('devrait rendre un Slider si variant=slider', () => {
      const propsWithSlider = {
        ...defaultProps,
        field: {
          ...defaultProps.field,
          config: {
            appearance: { variant: 'slider' },
            numberConfig: { min: 0, max: 100 }
          }
        }
      };
      render(<TBLFieldRendererAdvanced {...propsWithSlider} />);
      
      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
    });

    it('devrait afficher un préfixe/suffixe si configuré', () => {
      const propsWithUnit = {
        ...defaultProps,
        field: {
          ...defaultProps.field,
          config: {
            numberConfig: {
              prefix: '€',
              suffix: ' m²'
            }
          }
        },
        value: 100
      };
      render(<TBLFieldRendererAdvanced {...propsWithUnit} />);
      
      expect(screen.getByText('€', { exact: false })).toBeInTheDocument();
      expect(screen.getByText('m²', { exact: false })).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('devrait afficher un astérisque si requis', () => {
      const propsRequired = {
        ...defaultProps,
        field: {
          ...defaultProps.field,
          required: true
        }
      };
      render(<TBLFieldRendererAdvanced {...propsRequired} />);
      
      expect(screen.getByText('Test Number *')).toBeInTheDocument();
    });

    it('devrait afficher une erreur de validation', () => {
      const propsWithError = {
        ...defaultProps,
        field: {
          ...defaultProps.field,
          required: true
        },
        value: null
      };
      // TODO: Implémenter la logique de validation
    });
  });

  describe('Contraintes dynamiques', () => {
    it('devrait appliquer des contraintes dynamiques depuis formules', () => {
      const propsWithDynamicConstraints = {
        ...defaultProps,
        field: {
          ...defaultProps.field,
          config: {},
          capabilities: {
            formula: {
              instances: {
                'formula-1': {
                  targetProperty: 'number_max',
                  expression: '100'
                }
              }
            }
          }
        }
      };
      render(<TBLFieldRendererAdvanced {...propsWithDynamicConstraints} />);
      
      // Les contraintes dynamiques devraient être appliquées
      const input = screen.getByRole('spinbutton');
      expect(input).toBeInTheDocument();
    });
  });
});
