/**
 * ✍️ PublicSignaturePage — Page publique de signature de devis
 * 
 * Accessible via /sign/:token (sans authentification).
 * Le client reçoit un email avec un lien vers cette page.
 * Il peut voir les infos du devis et signer directement.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import SignatureCanvas, { type SignatureCanvasRef } from '../../components/signature/SignatureCanvas';

const API_BASE = '/api';

interface SignatureInfo {
  signatureId: string;
  signerName: string;
  signerEmail: string;
  signerRole: string;
  signatureType: string;
  legalText: string;
  status: string;
  submissionId: string;
  alreadySigned?: boolean;
}

const PublicSignaturePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const canvasRef = useRef<SignatureCanvasRef>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<SignatureInfo | null>(null);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [signResult, setSignResult] = useState<{ signatureHash: string; documentHash: string; signatureId?: string; signedPdfUrl?: string } | null>(null);
  const [canvasEmpty, setCanvasEmpty] = useState(true);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfFilename, setPdfFilename] = useState('devis-signe.pdf');

  // Charger le PDF et l'afficher en preview dès que la signature est faite
  const loadPdfPreview = useCallback(async (pdfUrl: string) => {
    setPdfLoading(true);
    try {
      const url = `${API_BASE}${pdfUrl.startsWith('/api') ? pdfUrl.replace('/api', '') : pdfUrl}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Erreur ${response.status}`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      setPdfBlobUrl(blobUrl);
      const disposition = response.headers.get('Content-Disposition');
      const filenameMatch = disposition?.match(/filename="?([^"]+)"?/);
      if (filenameMatch?.[1]) setPdfFilename(filenameMatch[1]);
    } catch (err) {
      console.error('Erreur chargement PDF:', err);
    } finally {
      setPdfLoading(false);
    }
  }, []);

  // Télécharger le PDF depuis le blob déjà chargé
  const handleDownloadPdf = useCallback(() => {
    if (!pdfBlobUrl) return;
    const a = document.createElement('a');
    a.href = pdfBlobUrl;
    a.download = pdfFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [pdfBlobUrl, pdfFilename]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => { if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl); };
  }, [pdfBlobUrl]);

  // Charger les infos de la signature
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/e-signature/sign/${token}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.message || 'Lien invalide ou expiré');
          return;
        }
        if (data.alreadySigned) {
          setSigned(true);
        }
        setInfo(data);
      } catch {
        setError('Impossible de charger les informations de signature');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Soumettre la signature
  const handleSign = useCallback(async () => {
    if (!token || !canvasRef.current || canvasRef.current.isEmpty()) return;
    if (!legalAccepted) return;

    setSigning(true);
    try {
      const signatureData = canvasRef.current.toDataURL();
      const res = await fetch(`${API_BASE}/e-signature/sign/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureData, legalAccepted: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Erreur lors de la signature');
        return;
      }
      setSigned(true);
      setSignResult(data);
      // Charger le PDF pour preview immédiat
      if (data.signedPdfUrl) {
        loadPdfPreview(data.signedPdfUrl);
      }
    } catch {
      setError('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setSigning(false);
    }
  }, [token, legalAccepted, loadPdfPreview]);

  // ═══ LOADING ═══
  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.spinner} />
          <p style={{ textAlign: 'center', color: '#666', marginTop: 16 }}>Chargement...</p>
        </div>
      </div>
    );
  }

  // ═══ ERROR ═══
  if (error && !info) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
            <h2 style={{ color: '#ff4d4f', marginBottom: 8 }}>Lien invalide</h2>
            <p style={{ color: '#666' }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // ═══ ALREADY SIGNED ═══
  if (signed) {
    return (
      <div style={styles.page}>
        <div style={{ ...styles.card, maxWidth: pdfBlobUrl ? 800 : 560 }}>
          <div style={{ textAlign: 'center', padding: '24px 20px 16px' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
            <h2 style={{ color: '#52c41a', marginBottom: 8 }}>Document signé !</h2>
            <p style={{ color: '#666', marginBottom: 12 }}>
              Merci <strong>{info?.signerName}</strong>, votre signature a été enregistrée.
              <br />
              <span style={{ fontSize: 13 }}>📧 Une copie vous a été envoyée par email.</span>
            </p>
          </div>

          {/* PDF Preview */}
          {pdfLoading && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={styles.spinner} />
              <p style={{ color: '#666', fontSize: 13, marginTop: 8 }}>⏳ Chargement du devis signé...</p>
            </div>
          )}
          {pdfBlobUrl && (
            <div style={{ padding: '0 16px 16px' }}>
              <iframe
                src={pdfBlobUrl}
                style={{ width: '100%', height: 600, border: '1px solid #e8e8e8', borderRadius: 8 }}
                title="Devis signé"
              />
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <button
                  onClick={handleDownloadPdf}
                  style={{
                    display: 'inline-block',
                    background: 'linear-gradient(135deg, #1890ff, #096dd9)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '10px 24px',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(24,144,255,0.3)',
                  }}
                >
                  📥 Télécharger le PDF
                </button>
              </div>
            </div>
          )}

          {signResult && (
            <div style={{ padding: '0 20px 20px' }}>
              <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, padding: 12, fontSize: 12, color: '#666' }}>
                <p style={{ margin: '2px 0' }}>🔐 Hash : <code>{signResult.signatureHash?.substring(0, 16)}...</code></p>
                <p style={{ margin: '2px 0' }}>📅 {new Date().toLocaleString('fr-BE')}</p>
              </div>
              <p style={{ color: '#999', fontSize: 11, marginTop: 14, textAlign: 'center' }}>
                Vous pouvez fermer cette page. Votre interlocuteur a été notifié.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══ SIGNATURE FORM ═══
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={{ margin: 0, fontSize: 20, color: '#fff' }}>✍️ Signature électronique</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
            {info?.signatureType === 'DEVIS' ? 'Signature de devis' : info?.signatureType}
          </p>
        </div>

        <div style={{ padding: '24px 30px' }}>
          {/* Infos signataire */}
          <div style={styles.infoBox}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#333' }}>📋 Informations</h3>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Nom :</span>
              <span style={styles.infoValue}>{info?.signerName}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Email :</span>
              <span style={styles.infoValue}>{info?.signerEmail}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Rôle :</span>
              <span style={styles.infoValue}>{info?.signerRole === 'CLIENT' ? 'Client' : info?.signerRole}</span>
            </div>
          </div>

          {/* Clause légale */}
          <div style={styles.legalBox}>
            <p style={{ fontSize: 12, color: '#666', lineHeight: 1.6, margin: 0 }}>
              {info?.legalText}
            </p>
          </div>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, margin: '16px 0', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={legalAccepted}
              onChange={e => setLegalAccepted(e.target.checked)}
              style={{ marginTop: 3, width: 18, height: 18, accentColor: '#1890ff' }}
            />
            <span style={{ fontSize: 13, color: '#333', lineHeight: 1.5 }}>
              J'ai lu et j'accepte les conditions ci-dessus. Je reconnais que cette signature électronique a valeur juridique.
            </span>
          </label>

          {/* Canvas signature */}
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h3 style={{ margin: 0, fontSize: 15, color: '#333' }}>🖊️ Votre signature</h3>
              <button
                onClick={() => { canvasRef.current?.clear(); setCanvasEmpty(true); }}
                style={styles.clearBtn}
              >
                Effacer
              </button>
            </div>
            <SignatureCanvas
              ref={canvasRef}
              width={480}
              height={180}
              penColor="#1a1a2e"
              penWidth={2.5}
              backgroundColor="#fafafa"
              borderColor={canvasEmpty ? '#d9d9d9' : '#1890ff'}
              placeholder="Signez ici avec votre souris ou votre doigt"
              onChange={(isEmpty) => setCanvasEmpty(isEmpty)}
            />
          </div>

          {/* Erreur */}
          {error && (
            <div style={{ background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 6, padding: '8px 12px', marginTop: 12, color: '#ff4d4f', fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* Bouton signer */}
          <button
            onClick={handleSign}
            disabled={!legalAccepted || canvasEmpty || signing}
            style={{
              ...styles.signBtn,
              opacity: (!legalAccepted || canvasEmpty || signing) ? 0.5 : 1,
              cursor: (!legalAccepted || canvasEmpty || signing) ? 'not-allowed' : 'pointer',
            }}
          >
            {signing ? '⏳ Signature en cours...' : '✍️ Signer le document'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 11, color: '#aaa', marginTop: 16 }}>
            🔒 Signature sécurisée conforme eIDAS · Données chiffrées
          </p>
        </div>
      </div>
    </div>
  );
};

// ═══ STYLES ═══
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f0f2f5 0%, #e6f7ff 100%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: '40px 16px',
    fontFamily: 'Arial, Helvetica, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: '#fff',
    borderRadius: 12,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  header: {
    background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
    padding: '20px 30px',
  },
  spinner: {
    width: 40,
    height: 40,
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #1890ff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '40px auto',
  },
  infoBox: {
    background: '#f6f8fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
    fontSize: 13,
  },
  infoLabel: {
    color: '#888',
  },
  infoValue: {
    color: '#333',
    fontWeight: 500,
  },
  legalBox: {
    background: '#fff7e6',
    border: '1px solid #ffe58f',
    borderRadius: 8,
    padding: 16,
  },
  clearBtn: {
    background: 'none',
    border: '1px solid #d9d9d9',
    borderRadius: 6,
    padding: '4px 12px',
    fontSize: 12,
    color: '#666',
    cursor: 'pointer',
  },
  signBtn: {
    width: '100%',
    marginTop: 20,
    padding: '14px 0',
    fontSize: 16,
    fontWeight: 600,
    color: '#fff',
    background: 'linear-gradient(135deg, #1890ff, #096dd9)',
    border: 'none',
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(24,144,255,0.3)',
  },
};

export default PublicSignaturePage;
