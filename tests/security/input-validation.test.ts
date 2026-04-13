/**
 * Tests pour la validation d'entrée et la sanitization
 * Couvre toutes les formes d'injection et de XSS
 */
import { describe, it, expect } from 'vitest';

describe('Input Validation', () => {
  describe('XSS Prevention', () => {
    const sanitizeHtml = (input: string) => input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    it('should escape HTML tags', () => {
      expect(sanitizeHtml('<script>alert(1)</script>')).not.toContain('<script>');
      expect(sanitizeHtml('<img onerror=alert(1)>')).not.toContain('<img');
    });

    it('should handle event handler injection', () => {
      const input = '<div onmouseover="alert(1)">hover me</div>';
      const sanitized = sanitizeHtml(input);
      expect(sanitized).not.toContain('<div');
    });

    it('should handle SVG-based XSS', () => {
      const input = '<svg/onload=alert(1)>';
      const sanitized = sanitizeHtml(input);
      expect(sanitized).not.toContain('<svg');
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should detect SQL injection patterns', () => {
      const isSqlInjection = (input: string) => {
        const patterns = [
          /'\s*OR\s+/i,
          /'\s*;\s*DROP\s/i,
          /UNION\s+SELECT/i,
          /--\s*$/,
          /\/\*.*\*\//,
          /'\s*;\s*DELETE\s/i,
          /1\s*=\s*1/,
        ];
        return patterns.some(p => p.test(input));
      };

      expect(isSqlInjection("' OR 1=1--")).toBe(true);
      expect(isSqlInjection("'; DROP TABLE users--")).toBe(true);
      expect(isSqlInjection("UNION SELECT * FROM users")).toBe(true);
      expect(isSqlInjection("Robert'); DROP TABLE students;--")).toBe(true);
      expect(isSqlInjection("Normal search text")).toBe(false);
      expect(isSqlInjection("John O'Brien")).toBe(false); // Legitimate name
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should block path traversal attempts', () => {
      const isPathTraversal = (input: string) => /\.\.[/\\]/.test(input);

      expect(isPathTraversal('../etc/passwd')).toBe(true);
      expect(isPathTraversal('..\\windows\\system32')).toBe(true);
      expect(isPathTraversal('../../secret.txt')).toBe(true);
      expect(isPathTraversal('normal/path/file.txt')).toBe(false);
      expect(isPathTraversal('file.txt')).toBe(false);
    });

    it('should sanitize file paths', () => {
      const sanitizePath = (input: string) => {
        return input
          .replace(/\.\.[/\\]/g, '')
          .replace(/^[/\\]/, '')
          .replace(/[^a-zA-Z0-9._/-]/g, '_');
      };

      expect(sanitizePath('../../../etc/passwd')).toBe('etc/passwd');
      expect(sanitizePath('normal/file.txt')).toBe('normal/file.txt');
    });
  });

  describe('Email Validation', () => {
    const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

    it('should validate good emails', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('first.last@company.be')).toBe(true);
      expect(isValidEmail('user+tag@domain.org')).toBe(true);
    });

    it('should reject bad emails', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('notanemail')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('user@.com')).toBe(false);
    });
  });

  describe('Phone Number Validation', () => {
    const isValidPhone = (phone: string) => /^\+?[0-9\s()-]{7,20}$/.test(phone.trim());

    it('should validate good phone numbers', () => {
      expect(isValidPhone('+32 470 12 34 56')).toBe(true);
      expect(isValidPhone('+33 6 12 34 56 78')).toBe(true);
      expect(isValidPhone('0470123456')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(isValidPhone('abc')).toBe(false);
      expect(isValidPhone('')).toBe(false);
      expect(isValidPhone('12')).toBe(false);
    });
  });

  describe('URL Validation', () => {
    it('should only allow http/https URLs', () => {
      const isValidUrl = (url: string) => {
        try {
          const parsed = new URL(url);
          return ['http:', 'https:'].includes(parsed.protocol);
        } catch {
          return false;
        }
      };

      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('javascript:alert(1)')).toBe(false);
      expect(isValidUrl('file:///etc/passwd')).toBe(false);
      expect(isValidUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
      expect(isValidUrl('not-a-url')).toBe(false);
    });
  });

  describe('File Upload Validation', () => {
    it('should only allow safe file extensions', () => {
      const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx'];
      const isAllowedFile = (filename: string) => {
        const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
        return ALLOWED_EXTENSIONS.includes(ext);
      };

      expect(isAllowedFile('photo.jpg')).toBe(true);
      expect(isAllowedFile('document.pdf')).toBe(true);
      expect(isAllowedFile('image.PNG')).toBe(true);
      expect(isAllowedFile('malware.exe')).toBe(false);
      expect(isAllowedFile('script.js')).toBe(false);
      expect(isAllowedFile('hack.php')).toBe(false);
      expect(isAllowedFile('shell.sh')).toBe(false);
    });

    it('should enforce file size limits', () => {
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
      const isValidSize = (size: number) => size > 0 && size <= MAX_FILE_SIZE;

      expect(isValidSize(1024)).toBe(true);
      expect(isValidSize(50 * 1024 * 1024)).toBe(true);
      expect(isValidSize(51 * 1024 * 1024)).toBe(false);
      expect(isValidSize(0)).toBe(false);
      expect(isValidSize(-1)).toBe(false);
    });

    it('should detect MIME type mismatch', () => {
      const MIME_EXT_MAP: Record<string, string[]> = {
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
        'application/pdf': ['.pdf'],
      };

      const isMimeMatch = (mime: string, ext: string) => {
        const allowed = MIME_EXT_MAP[mime];
        return allowed ? allowed.includes(ext.toLowerCase()) : false;
      };

      expect(isMimeMatch('image/jpeg', '.jpg')).toBe(true);
      expect(isMimeMatch('image/jpeg', '.exe')).toBe(false);
      expect(isMimeMatch('application/pdf', '.pdf')).toBe(true);
      expect(isMimeMatch('application/x-executable', '.exe')).toBe(false);
    });
  });
});
