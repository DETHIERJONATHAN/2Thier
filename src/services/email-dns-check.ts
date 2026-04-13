/**
 * 📧 SPF / DKIM / DMARC DNS VERIFICATION
 * ========================================
 * 
 * Checks DNS records to verify that email sending domains
 * have proper SPF, DKIM, and DMARC configuration.
 * 
 * Used by the admin panel to validate domain setup before
 * enabling email sending for an organization.
 * 
 * @module email-dns-check
 */

import { promises as dns } from 'dns';
import { logger } from '../lib/logger';

export interface DNSCheckResult {
  domain: string;
  spf: { found: boolean; record?: string; valid: boolean; issues: string[] };
  dkim: { found: boolean; record?: string; valid: boolean; selector: string };
  dmarc: { found: boolean; record?: string; valid: boolean; policy?: string; issues: string[] };
  mx: { found: boolean; records: string[] };
  overall: 'pass' | 'warn' | 'fail';
}

/**
 * Check SPF record for a domain.
 */
async function checkSPF(domain: string): Promise<DNSCheckResult['spf']> {
  const issues: string[] = [];
  try {
    const records = await dns.resolveTxt(domain);
    const spfRecords = records.flat().filter(r => r.startsWith('v=spf1'));
    
    if (spfRecords.length === 0) {
      return { found: false, valid: false, issues: ['No SPF record found'] };
    }
    if (spfRecords.length > 1) {
      issues.push('Multiple SPF records found (should be exactly 1)');
    }
    
    const spf = spfRecords[0];
    
    // Check for common issues
    if (!spf.includes('-all') && !spf.includes('~all')) {
      issues.push('SPF record should end with -all (hard fail) or ~all (soft fail)');
    }
    if (spf.includes('+all')) {
      issues.push('SPF record has +all which allows any server to send — very insecure');
    }
    
    return { found: true, record: spf, valid: issues.length === 0, issues };
  } catch (err) {
    return { found: false, valid: false, issues: [`DNS lookup failed: ${(err as Error)?.message}`] };
  }
}

/**
 * Check DKIM record for a domain with a given selector.
 */
async function checkDKIM(domain: string, selector: string = 'postal'): Promise<DNSCheckResult['dkim']> {
  try {
    const dkimDomain = `${selector}._domainkey.${domain}`;
    const records = await dns.resolveTxt(dkimDomain);
    const dkimRecord = records.flat().join('');
    
    if (!dkimRecord) {
      return { found: false, valid: false, selector };
    }
    
    const valid = dkimRecord.includes('v=DKIM1') && dkimRecord.includes('p=');
    return { found: true, record: dkimRecord.slice(0, 200), valid, selector };
  } catch {
    return { found: false, valid: false, selector };
  }
}

/**
 * Check DMARC record for a domain.
 */
async function checkDMARC(domain: string): Promise<DNSCheckResult['dmarc']> {
  const issues: string[] = [];
  try {
    const records = await dns.resolveTxt(`_dmarc.${domain}`);
    const dmarcRecords = records.flat().filter(r => r.startsWith('v=DMARC1'));
    
    if (dmarcRecords.length === 0) {
      return { found: false, valid: false, issues: ['No DMARC record found'] };
    }
    
    const dmarc = dmarcRecords[0];
    
    // Extract policy
    const policyMatch = dmarc.match(/p=(\w+)/);
    const policy = policyMatch ? policyMatch[1] : undefined;
    
    if (policy === 'none') {
      issues.push('DMARC policy is "none" — emails will not be rejected on failure');
    }
    if (!dmarc.includes('rua=')) {
      issues.push('No aggregate report address (rua=) configured');
    }
    
    return { found: true, record: dmarc, valid: issues.length === 0, policy, issues };
  } catch (err) {
    return { found: false, valid: false, issues: [`DNS lookup failed: ${(err as Error)?.message}`] };
  }
}

/**
 * Check MX records for a domain.
 */
async function checkMX(domain: string): Promise<DNSCheckResult['mx']> {
  try {
    const records = await dns.resolveMx(domain);
    const mxHosts = records.sort((a, b) => a.priority - b.priority).map(r => `${r.priority} ${r.exchange}`);
    return { found: mxHosts.length > 0, records: mxHosts };
  } catch {
    return { found: false, records: [] };
  }
}

/**
 * Full DNS check for email sending configuration.
 */
export async function checkEmailDNS(domain: string, dkimSelector: string = 'postal'): Promise<DNSCheckResult> {
  logger.info(`[EMAIL-DNS] Checking DNS records for ${domain}`);
  
  const [spf, dkim, dmarc, mx] = await Promise.all([
    checkSPF(domain),
    checkDKIM(domain, dkimSelector),
    checkDMARC(domain),
    checkMX(domain),
  ]);
  
  // Calculate overall score
  let overall: 'pass' | 'warn' | 'fail' = 'pass';
  if (!spf.found || !dmarc.found) overall = 'fail';
  else if (!dkim.found || !spf.valid || !dmarc.valid) overall = 'warn';
  
  return { domain, spf, dkim, dmarc, mx, overall };
}
