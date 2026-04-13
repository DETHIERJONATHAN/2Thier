export interface Validation {
    id: string;
    fieldId: string;
    type: string;
    value?: string;
    message?: string;
    active?: boolean;
    params?: Record<string, unknown>;
}

export interface ValidationResult {
    isValid: boolean;
    message?: string;
}

export interface ValidationParams {
    min?: number;
    max?: number;
    pattern?: string;
    targetFieldId?: string;
    condition?: Record<string, unknown>;
    blacklist?: string[];
}
