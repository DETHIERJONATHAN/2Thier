// Central mapping between numeric DB codes and app-friendly string enums for TBL
// Keep frontend light; do decoding/encoding on the server/API layer.

export type TblNodeTypeName =
  | 'branch'              // 1
  | 'sub_branch'          // 2
  | 'field'               // 3
  | 'option'              // 4
  | 'option_field'        // 5 (aka leaf_option_field in some UI code)
  | 'data_field'          // 6
  | 'section';            // 7

export type TblCapacityName =
  | 'neutral'             // 1
  | 'formula'             // 2
  | 'condition'           // 3
  | 'table';              // 4

export const TypeCodeToName: Record<number, TblNodeTypeName> = {
  1: 'branch',
  2: 'sub_branch',
  3: 'field',
  4: 'option',
  5: 'option_field',
  6: 'data_field',
  7: 'section',
};

export const TypeNameToCode: Record<TblNodeTypeName, number> = {
  branch: 1,
  sub_branch: 2,
  field: 3,
  option: 4,
  option_field: 5,
  data_field: 6,
  section: 7,
};

export const CapacityCodeToName: Record<number, TblCapacityName> = {
  1: 'neutral',
  2: 'formula',
  3: 'condition',
  4: 'table',
};

export const CapacityNameToCode: Record<TblCapacityName, number> = {
  neutral: 1,
  formula: 2,
  condition: 3,
  table: 4,
};

export function decodeType(input: number | string | null | undefined): TblNodeTypeName | null {
  if (input == null) return null;
  if (typeof input === 'number') return TypeCodeToName[input] ?? null;
  const s = String(input).toLowerCase();
  if (s === 'leaf_option_field') return 'option_field'; // alias support
  if (Object.prototype.hasOwnProperty.call(TypeNameToCode, s)) {
    return s as TblNodeTypeName;
  }
  return null;
}

export function encodeType(input: TblNodeTypeName | string | number | null | undefined): number | null {
  if (input == null) return null;
  if (typeof input === 'number') return TypeCodeToCodeSafe(input);
  const s = String(input).toLowerCase();
  const alias = s === 'leaf_option_field' ? 'option_field' : s;
  return TypeNameToCode[alias as TblNodeTypeName] ?? null;
}

function TypeCodeToCodeSafe(n: number): number | null {
  return TypeCodeToName[n] ? n : null;
}

export function decodeCapacity(input: number | string | null | undefined): TblCapacityName | null {
  if (input == null) return null;
  if (typeof input === 'number') return CapacityCodeToName[input] ?? null;
  const s = String(input).toLowerCase();
  return Object.prototype.hasOwnProperty.call(CapacityNameToCode, s) ? (s as TblCapacityName) : null;
}

export function encodeCapacity(input: TblCapacityName | string | number | null | undefined): number | null {
  if (input == null) return null;
  if (typeof input === 'number') return CapacityCodeToName[input] ? input : null;
  const s = String(input).toLowerCase();
  return CapacityNameToCode[s as TblCapacityName] ?? null;
}
