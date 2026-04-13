/**
 * 📄 SignedPdfPreviewModal — Modal de prévisualisation du PDF signé
 * 
 * Charge le PDF via fetch+blob (évite les timeouts proxy Codespaces),
 * l'affiche dans un iframe, et propose un bouton de téléchargement.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Spin } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';

interface SignedPdfPreviewModalProps {
  open: boolean;
  onClose: () => void;
  signatureId: string;
  title?: string;
}

const SignedPdfPreviewModal: React.FC<SignedPdfPreviewModalProps> = ({
  open,
  onClose,
  signatureId,
  title = 'PDF signé',
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState('devis-signe.pdf');

  useEffect(() => {
    if (!open || !signatureId) return;
    let cancelled = false;

    const fetchPdf = async (retriesLeft = 2): Promise<void> => {
      try {
        // Utiliser format=base64 pour éviter les 502 du proxy Codespaces sur les réponses binaires
        const response = await fetch(`/api/e-signature/${signatureId}/download-signed-pdf?format=base64`, {
          credentials: 'same-origin',
        });
        if (!response.ok) {
          if ((response.status === 502 || response.status === 504) && retriesLeft > 0) {
            await new Promise(r => setTimeout(r, 800));
            return fetchPdf(retriesLeft - 1);
          }
          throw new Error(`Erreur ${response.status}`);
        }
        const json = await response.json();
        if (cancelled || !json.pdfBase64) return;
        
        // Décoder le base64 en blob PDF
        const binaryString = atob(json.pdfBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        if (json.filename) setFilename(json.filename);
      } catch (err: unknown) {
        // Retry sur erreur réseau (connexion coupée par le proxy)
        if (retriesLeft > 0 && (err.name === 'TypeError' || err.message?.includes('fetch'))) {
          await new Promise(r => setTimeout(r, 800));
          return fetchPdf(retriesLeft - 1);
        }
        if (!cancelled) setError(err.message || 'Erreur de chargement');
      }
    };

    (async () => {
      setLoading(true);
      setError(null);
      await fetchPdf();
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, signatureId]);

  // Cleanup blob URL when modal closes
  useEffect(() => {
    if (!open && blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }
  }, [open, blobUrl]);

  const handleDownload = useCallback(() => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [blobUrl, filename]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={`📄 ${title}`}
      width={850}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={onClose}>Fermer</Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleDownload}
            disabled={!blobUrl}
          >
            Télécharger le PDF
          </Button>
        </div>
      }
      destroyOnClose
    >
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <p style={{ marginTop: 16, color: '#666' }}>Chargement du PDF signé...</p>
        </div>
      )}
      {error && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#ff4d4f' }}>
          <p>❌ {error}</p>
        </div>
      )}
      {blobUrl && (
        <iframe
          src={blobUrl}
          style={{ width: '100%', height: 650, border: '1px solid #e8e8e8', borderRadius: 8 }}
          title="PDF signé"
        />
      )}
    </Modal>
  );
};

export default SignedPdfPreviewModal;
