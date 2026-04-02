/**
 * VAT Lookup Service — Recherche d'entreprise par numéro de TVA
 * 
 * Sources utilisées :
 *   1. KBO/BCE Open Data (Belgique) via API publique
 *   2. VIES (EU VAT validation) en fallback
 *   3. Peppol Directory pour vérifier l'enregistrement Peppol
 * 
 * Ce service permet :
 *   - De remplir automatiquement les infos d'une entreprise à partir de son n° TVA
 *   - De vérifier si l'entreprise est déjà enregistrée sur Peppol (chez un autre AP)
 *   - De guider l'utilisateur en cas de migration nécessaire
 */

export interface CompanyInfo {
  name: string;
  vatNumber: string;
  address?: string;
  zipCode?: string;
  city?: string;
  country?: string;
  legalForm?: string;
  status?: string;
  email?: string;
  phone?: string;
}

export interface PeppolRegistrationInfo {
  isRegistered: boolean;
  accessPoint?: string;
  registrationDate?: string;
  endpoint?: string;
  /** true si enregistré chez un AUTRE Access Point (pas Odoo/Zhiive) */
  isRegisteredElsewhere: boolean;
  /** true si enregistré spécifiquement chez notre AP (Odoo/Zhiive) */
  isRegisteredWithUs: boolean;
}

export interface VatLookupResult {
  valid: boolean;
  company?: CompanyInfo;
  peppol: PeppolRegistrationInfo;
  source: 'kbo' | 'vies' | 'manual';
}

/**
 * Normalise un numéro de TVA belge en format standard
 * Accepte : BE0123456789, BE 0123.456.789, 0123456789, etc.
 */
export function normalizeVatNumber(vat: string): string {
  // Retirer tout sauf les chiffres et les lettres
  const cleaned = vat.replace(/[\s.\-/]/g, '').toUpperCase();
  
  // Extraire les chiffres
  const digits = cleaned.replace(/[^0-9]/g, '');
  
  // Ajouter le préfixe BE si absent (pour les numéros belges à 10 chiffres)
  if (digits.length === 10 && !cleaned.startsWith('BE')) {
    return `BE${digits}`;
  }
  
  // Si commence par BE suivi de chiffres
  if (cleaned.startsWith('BE') && digits.length === 10) {
    return `BE${digits}`;
  }
  
  return cleaned;
}

/**
 * Extrait les chiffres purs d'un numéro de TVA (pour Peppol endpoint)
 */
export function extractVatDigits(vat: string): string {
  return normalizeVatNumber(vat).replace(/[^0-9]/g, '');
}

/**
 * Recherche les informations d'une entreprise belge via KBO/BCE Open Data
 */
async function lookupKBO(vatDigits: string): Promise<CompanyInfo | null> {
  try {
    // KBO Open Data API (data.be)
    const response = await fetch(
      `https://kbopub.economie.fgov.be/kbopub/zoeknummerform.html?nummer=${vatDigits}&actionLu=Zoek`,
      {
        headers: { 'Accept': 'text/html' },
        signal: AbortSignal.timeout(5000),
      }
    );
    
    if (!response.ok) return null;
    
    const html = await response.text();
    
    // Parser le HTML pour extraire les infos de base
    const nameMatch = html.match(/<td[^>]*>Dénomination[^<]*<\/td>\s*<td[^>]*>([^<]+)/i)
      || html.match(/<td[^>]*>Benaming[^<]*<\/td>\s*<td[^>]*>([^<]+)/i);
    const addressMatch = html.match(/<td[^>]*>Adresse du siège[^<]*<\/td>\s*<td[^>]*>([^<]+)/i)
      || html.match(/<td[^>]*>Adres van de zetel[^<]*<\/td>\s*<td[^>]*>([^<]+)/i);
    
    if (!nameMatch) return null;
    
    return {
      name: nameMatch[1].trim(),
      vatNumber: `BE${vatDigits}`,
      address: addressMatch?.[1]?.trim(),
      country: 'BE',
    };
  } catch {
    return null;
  }
}

/**
 * Valide un numéro de TVA via le service VIES de la Commission Européenne
 * et récupère les informations de l'entreprise
 */
async function lookupVIES(countryCode: string, vatDigits: string): Promise<CompanyInfo | null> {
  try {
    const response = await fetch(
      `https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countryCode: countryCode.substring(0, 2),
          vatNumber: vatDigits,
        }),
        signal: AbortSignal.timeout(10000),
      }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json() as {
      valid: boolean;
      name?: string;
      address?: string;
      countryCode?: string;
      vatNumber?: string;
    };
    
    if (!data.valid || !data.name) return null;
    
    // Parser l'adresse VIES (format libre)
    const addressParts = data.address?.split('\n') || [];
    const streetLine = addressParts[0]?.trim() || '';
    const cityLine = addressParts[1]?.trim() || '';
    const zipMatch = cityLine.match(/^(\d{4,5})\s+(.+)/);
    
    return {
      name: data.name.trim(),
      vatNumber: `${data.countryCode || countryCode}${data.vatNumber || vatDigits}`,
      address: streetLine,
      zipCode: zipMatch?.[1],
      city: zipMatch?.[2] || cityLine,
      country: data.countryCode || countryCode.substring(0, 2),
    };
  } catch {
    return null;
  }
}

/**
 * Vérifie si un endpoint est enregistré sur le réseau Peppol
 * Interroge le Peppol Directory (directory.peppol.eu)
 */
/** Identifiants Access Point Odoo/Zhiive pour détection */
const OUR_ACCESS_POINT_IDENTIFIERS = [
  'odoo', 'zhiive', '2thier', 'peppol.api.odoo.com',
];

function isOurAccessPoint(apInfo: string | undefined): boolean {
  if (!apInfo) return false;
  const lower = apInfo.toLowerCase();
  return OUR_ACCESS_POINT_IDENTIFIERS.some(id => lower.includes(id));
}

async function checkPeppolDirectory(eas: string, endpoint: string): Promise<PeppolRegistrationInfo> {
  const defaultResult: PeppolRegistrationInfo = {
    isRegistered: false,
    isRegisteredElsewhere: false,
    isRegisteredWithUs: false,
  };
  
  try {
    // 1. Vérifier via le Peppol Directory REST API
    const directoryUrl = `https://directory.peppol.eu/search/1.0/json?participant=iso6523-actorid-upis::${eas}:${endpoint}`;
    const dirResponse = await fetch(directoryUrl, {
      signal: AbortSignal.timeout(8000),
    });
    
    if (dirResponse.ok) {
      const dirData = await dirResponse.json() as {
        total?: number;
        matches?: Array<{
          participantID?: { value?: string };
          docTypes?: Array<unknown>;
          entities?: Array<{
            name?: Array<{ value?: string }>;
            regDate?: string;
            additionalInfo?: string;
          }>;
        }>;
      };
      
      if (dirData.total && dirData.total > 0 && dirData.matches?.length) {
        const match = dirData.matches[0];
        const entity = match.entities?.[0];
        
        const apName = entity?.additionalInfo || undefined;
        const registeredWithUs = isOurAccessPoint(apName);
        return {
          isRegistered: true,
          accessPoint: apName,
          registrationDate: entity?.regDate || undefined,
          endpoint: `${eas}:${endpoint}`,
          isRegisteredElsewhere: !registeredWithUs,
          isRegisteredWithUs: registeredWithUs,
        };
      }
    }
    
    // 2. Vérifier via le SML DNS (fallback)
    // On ne peut pas faire de DNS lookup depuis le navigateur, mais on peut
    // vérifier via notre propre API Odoo
    
    return defaultResult;
  } catch {
    return defaultResult;
  }
}

/**
 * Recherche complète : infos entreprise + statut Peppol
 */
export async function vatLookup(vatNumber: string): Promise<VatLookupResult> {
  const normalized = normalizeVatNumber(vatNumber);
  const digits = extractVatDigits(vatNumber);
  const countryCode = normalized.substring(0, 2);
  
  if (digits.length < 9) {
    return { valid: false, peppol: { isRegistered: false, isRegisteredElsewhere: false, isRegisteredWithUs: false }, source: 'manual' };
  }
  
  // 1. Chercher les infos entreprise (KBO puis VIES en fallback)
  let company: CompanyInfo | null = null;
  let source: 'kbo' | 'vies' | 'manual' = 'manual';
  
  if (countryCode === 'BE') {
    company = await lookupKBO(digits);
    if (company) source = 'kbo';
  }
  
  if (!company) {
    company = await lookupVIES(countryCode, digits);
    if (company) source = 'vies';
  }
  
  // 2. Vérifier le statut Peppol
  const eas = countryCode === 'BE' ? '0208' : '9925'; // Adapter selon le pays
  const peppol = await checkPeppolDirectory(eas, digits);
  
  return {
    valid: !!company,
    company: company || { name: '', vatNumber: normalized, country: countryCode },
    peppol,
    source,
  };
}

/**
 * Vérifie uniquement le statut Peppol (plus rapide que vatLookup complet)
 */
export async function checkPeppolStatus(vatNumber: string): Promise<PeppolRegistrationInfo> {
  const digits = extractVatDigits(vatNumber);
  const normalized = normalizeVatNumber(vatNumber);
  const countryCode = normalized.substring(0, 2);
  const eas = countryCode === 'BE' ? '0208' : '9925';
  
  return checkPeppolDirectory(eas, digits);
}
