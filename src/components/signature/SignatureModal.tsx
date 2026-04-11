/**
 * ✍️ SignatureModal — Flux complet de signature électronique avancée (eIDAS)
 * 
 * Étapes :
 * 1. Initiation : choix du type + infos signataire
 * 2. OTP : envoi et vérification du code par email
 * 3. Signature : canvas manuscrit + clause légale
 * 4. Confirmation : résumé avec hash + piste d'audit
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Modal, Steps, Button, Input, Typography, Space, Alert, Checkbox, Result, message, Divider } from 'antd';
import { MailOutlined, SafetyCertificateOutlined, EditOutlined, CheckCircleOutlined, LockOutlined, ReloadOutlined } from '@ant-design/icons';
import SignatureCanvas, { type SignatureCanvasRef } from './SignatureCanvas';
import SignedPdfPreviewModal from './SignedPdfPreviewModal';
import { SF } from '../zhiive/ZhiiveTheme';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

const { Text, Title } = Typography;
const { Step } = Steps;

interface SignatureModalProps {
  open: boolean;
  onClose: () => void;
  onSigned?: (result: { signatureId: string; signatureHash: string; documentHash?: string }) => void;
  submissionId: string;
  leadId?: string;
  signatureType?: 'DEVIS' | 'RECTIFICATION' | 'CONTRAT' | 'PV_RECEPTION';
  signerRole?: 'CLIENT' | 'COMMERCIAL' | 'TECHNICIEN';
  signerName?: string;
  signerEmail?: string;
  signerPhone?: string;
  documentId?: string;
}

const SignatureModal: React.FC<SignatureModalProps> = ({
  open,
  onClose,
  onSigned,
  submissionId,
  leadId,
  signatureType = 'DEVIS',
  signerRole = 'CLIENT',
  signerName: initialName = '',
  signerEmail: initialEmail = '',
  signerPhone: initialPhone = '',
  documentId,
}) => {
  const { api } = useAuthenticatedApi();
  const canvasRef = useRef<SignatureCanvasRef>(null);

  // Étapes
  const [currentStep, setCurrentStep] = useState(0);

  // État étape 1 : Infos signataire
  const [signerName, setSignerName] = useState(initialName);
  const [signerEmail, setSignerEmail] = useState(initialEmail);
  const [signerPhone, setSignerPhone] = useState(initialPhone);

  // État étape 2 : OTP
  const [signatureId, setSignatureId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [_otpSent, setOtpSent] = useState(false);
  const [_otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(5);

  // État étape 3 : Signature
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [signing, setSigning] = useState(false);

  // État résultat
  const [signResult, setSignResult] = useState<{ signatureId: string; signatureHash: string; documentHash?: string } | null>(null);

  // Loading
  const [initiating, setInitiating] = useState(false);

  // PDF Preview
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);

  // Ref pour détecter la transition open: false → true
  const wasOpenRef = useRef(false);

  // Reset complet quand le modal S'OUVRE (transition false → true)
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      // Transition false → true : reset complet du formulaire
      setCurrentStep(0);
      setSignerName(initialName);
      setSignerEmail(initialEmail);
      setSignerPhone(initialPhone);
      setSignatureId(null);
      setOtpCode('');
      setOtpSent(false);
      setOtpVerified(false);
      setOtpLoading(false);
      setRemainingAttempts(5);
      setLegalAccepted(false);
      setSigning(false);
      setSignResult(null);
      setInitiating(false);
    }
    wasOpenRef.current = open;
  }, [open, initialName, initialEmail, initialPhone]);

  // Sync des coordonnées client quand les props changent APRÈS l'ouverture
  // (cas où clientData se charge après que le modal est ouvert)
  useEffect(() => {
    if (!open || currentStep !== 0) return;
    // Mettre à jour seulement si le champ est vide et que la prop a une valeur
    if (initialName) setSignerName(prev => prev || initialName);
    if (initialEmail) setSignerEmail(prev => prev || initialEmail);
    if (initialPhone) setSignerPhone(prev => prev || initialPhone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialName, initialEmail, initialPhone]);

  // ═══════════════════════════════════════
  // ÉTAPE 1 : Initier + envoyer OTP
  // ═══════════════════════════════════════
  const handleInitiateAndSendOtp = useCallback(async () => {
    if (!signerName.trim() || !signerEmail.trim()) {
      message.warning('Nom et email sont requis');
      return;
    }
    // Validation email basique
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signerEmail)) {
      message.warning('Adresse email invalide');
      return;
    }

    try {
      setInitiating(true);

      // 1. Initier la demande de signature
      const initRes = await api.post('/api/e-signature/initiate', {
        submissionId,
        documentId: documentId || undefined,
        leadId: leadId || undefined,
        signatureType,
        signerRole,
        signerName: signerName.trim(),
        signerEmail: signerEmail.trim(),
        signerPhone: signerPhone.trim() || undefined,
        expiresInHours: 72,
      }) as any;

      if (!initRes?.success || !initRes?.signatureId) {
        throw new Error(initRes?.message || 'Erreur initiation');
      }

      const newSigId = initRes.signatureId;
      setSignatureId(newSigId);

      // 2. Envoyer le code OTP
      const otpRes = await api.post(`/api/e-signature/${newSigId}/send-otp`, {}) as any;
      if (!otpRes?.success) {
        throw new Error(otpRes?.message || 'Erreur envoi OTP');
      }

      setOtpSent(true);
      setCurrentStep(1);
      message.success(`Code de vérification envoyé à ${signerEmail}`);

    } catch (err: any) {
      console.error('[SignatureModal] Erreur initiation/OTP:', err);
      message.error(err?.message || 'Erreur lors de l\'initiation');
    } finally {
      setInitiating(false);
    }
  }, [api, submissionId, documentId, leadId, signatureType, signerRole, signerName, signerEmail, signerPhone]);

  // ═══════════════════════════════════════
  // ÉTAPE 2 : Vérifier OTP
  // ═══════════════════════════════════════
  const handleVerifyOtp = useCallback(async () => {
    if (!signatureId || otpCode.length !== 6) {
      message.warning('Entrez le code à 6 chiffres reçu par email');
      return;
    }

    try {
      setOtpLoading(true);
      const res = await api.post(`/api/e-signature/${signatureId}/verify-otp`, { otp: otpCode }) as any;

      if (res?.success) {
        setOtpVerified(true);
        setCurrentStep(2);
        message.success('Identité vérifiée');
      } else {
        setRemainingAttempts(res?.remainingAttempts ?? remainingAttempts - 1);
        message.error(res?.message || 'Code incorrect');
      }
    } catch (err: any) {
      const msg = err?.message || 'Erreur vérification';
      if (err?.remainingAttempts !== undefined) {
        setRemainingAttempts(err.remainingAttempts);
      }
      message.error(msg);
    } finally {
      setOtpLoading(false);
    }
  }, [api, signatureId, otpCode, remainingAttempts]);

  // Renvoyer OTP
  const handleResendOtp = useCallback(async () => {
    if (!signatureId) return;
    try {
      setOtpLoading(true);
      setOtpCode('');
      const res = await api.post(`/api/e-signature/${signatureId}/send-otp`, {}) as any;
      if (res?.success) {
        message.success('Nouveau code envoyé');
      }
    } catch (err: any) {
      message.error(err?.message || 'Erreur renvoi code');
    } finally {
      setOtpLoading(false);
    }
  }, [api, signatureId]);

  // ═══════════════════════════════════════
  // ÉTAPE 3 : Signer
  // ═══════════════════════════════════════
  const handleSign = useCallback(async () => {
    if (!signatureId || !canvasRef.current) return;

    if (canvasRef.current.isEmpty()) {
      message.warning('Veuillez dessiner votre signature');
      return;
    }

    if (!legalAccepted) {
      message.warning('Veuillez accepter les conditions juridiques');
      return;
    }

    try {
      setSigning(true);
      const signatureData = canvasRef.current.toDataURL();

      const res = await api.post(`/api/e-signature/${signatureId}/sign`, {
        signatureData,
        legalAccepted: true,
      }) as any;

      if (res?.success) {
        const result = {
          signatureId: res.signatureId || signatureId,
          signatureHash: res.signatureHash,
          documentHash: res.documentHash,
        };
        setSignResult(result);
        setCurrentStep(3);
        onSigned?.(result);
        message.success('Document signé avec succès');
      } else {
        throw new Error(res?.message || 'Erreur signature');
      }
    } catch (err: any) {
      console.error('[SignatureModal] Erreur signature:', err);
      message.error(err?.message || 'Erreur lors de la signature');
    } finally {
      setSigning(false);
    }
  }, [api, signatureId, legalAccepted, onSigned]);

  // Voir le PDF signé dans un modal preview
  const handleViewSignedPdf = useCallback(() => {
    if (!signatureId) return;
    setPdfPreviewOpen(true);
  }, [signatureId]);

  // ═══════════════════════════════════════
  // PREVIEW PDF
  // ═══════════════════════════════════════
  const handlePreviewPdf = useCallback(() => {
    window.open(`/api/e-signature/tbl/${submissionId}/pdf/preview`, '_blank');
  }, [submissionId]);

  // Date formatée
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-BE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const legalText = `En signant ce document, je, ${signerName || '[nom]'}, confirme avoir pris connaissance de l'intégralité du devis ci-joint et accepte les termes et conditions qui y sont décrits. Cette signature électronique a la même valeur juridique qu'une signature manuscrite conformément au règlement européen eIDAS (Règlement UE n°910/2014). Date : ${dateStr}.`;

  const roleLabels: Record<string, string> = {
    CLIENT: 'Client',
    COMMERCIAL: 'Commercial',
    TECHNICIEN: 'Technicien',
  };

  const typeLabels: Record<string, string> = {
    DEVIS: 'Devis',
    RECTIFICATION: 'Devis rectifié',
    CONTRAT: 'Contrat',
    PV_RECEPTION: 'PV de réception',
  };

  // ═══════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════
  return (
    <Modal
      open={open}
      onCancel={currentStep === 3 ? onClose : undefined}
      closable={currentStep === 3}
      maskClosable={false}
      width={640}
      title={
        <Space>
          <SafetyCertificateOutlined style={{ color: '#1677ff' }} />
          <span>Signature électronique — {typeLabels[signatureType] || 'Document'}</span>
        </Space>
      }
      footer={null}
      destroyOnClose
    >
      <Steps current={currentStep} size="small" style={{ marginBottom: 24 }}>
        <Step title="Identité" icon={<MailOutlined />} />
        <Step title="Vérification" icon={<LockOutlined />} />
        <Step title="Signature" icon={<EditOutlined />} />
        <Step title="Confirmé" icon={<CheckCircleOutlined />} />
      </Steps>

      {/* ═══ ÉTAPE 0 : Infos signataire ═══ */}
      {currentStep === 0 && (
        <div>
          <Alert
            type="info"
            showIcon
            message="Signature électronique avancée (eIDAS)"
            description="Un code de vérification sera envoyé par email pour confirmer votre identité avant la signature."
            style={{ marginBottom: 16 }}
          />

          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <Text strong>Rôle du signataire</Text>
              <div style={{ marginTop: 4, padding: '8px 12px', background: '#f5f5f5', borderRadius: 6 }}>
                {roleLabels[signerRole] || signerRole} — {typeLabels[signatureType] || signatureType}
              </div>
            </div>

            <div>
              <Text strong>Nom complet *</Text>
              <Input
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
                placeholder="Jean Dupont"
                size="large"
              />
            </div>

            <div>
              <Text strong>Email *</Text>
              <Input
                value={signerEmail}
                onChange={e => setSignerEmail(e.target.value)}
                placeholder="jean@example.com"
                type="email"
                size="large"
              />
            </div>

            <div>
              <Text strong>Téléphone (optionnel)</Text>
              <Input
                value={signerPhone}
                onChange={e => setSignerPhone(e.target.value)}
                placeholder="+32 470 12 34 56"
              />
            </div>

            <Button
              type="link"
              onClick={handlePreviewPdf}
              style={{ padding: 0 }}
            >
              Prévisualiser le document PDF avant signature
            </Button>
          </Space>

          <div style={{ marginTop: 24, textAlign: 'right' }}>
            <Space>
              <Button onClick={onClose}>Annuler</Button>
              <Button
                type="primary"
                icon={<MailOutlined />}
                onClick={handleInitiateAndSendOtp}
                loading={initiating}
                disabled={!signerName.trim() || !signerEmail.trim()}
              >
                Envoyer le code de vérification
              </Button>
            </Space>
          </div>
        </div>
      )}

      {/* ═══ ÉTAPE 1 : Vérification OTP ═══ */}
      {currentStep === 1 && (
        <div>
          <Alert
            type="success"
            showIcon
            message={`Code envoyé à ${signerEmail}`}
            description="Vérifiez votre boîte mail (et vos spams). Le code expire dans 10 minutes."
            style={{ marginBottom: 16 }}
          />

          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <Title level={5}>Entrez le code à 6 chiffres</Title>
            <Input
              value={otpCode}
              onChange={e => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setOtpCode(val);
              }}
              placeholder="000000"
              maxLength={6}
              style={{
                width: 200,
                fontSize: 28,
                textAlign: 'center',
                letterSpacing: 8,
                fontFamily: 'monospace',
              }}
              size="large"
              onPressEnter={handleVerifyOtp}
            />

            <div style={{ marginTop: 12 }}>
              <Text type="secondary">
                {remainingAttempts} tentative(s) restante(s)
              </Text>
            </div>

            <div style={{ marginTop: 8 }}>
              <Button
                type="link"
                icon={<ReloadOutlined />}
                onClick={handleResendOtp}
                loading={otpLoading}
                size="small"
              >
                Renvoyer le code
              </Button>
            </div>
          </div>

          <div style={{ marginTop: 24, textAlign: 'right' }}>
            <Space>
              <Button onClick={onClose}>Annuler</Button>
              <Button
                type="primary"
                icon={<LockOutlined />}
                onClick={handleVerifyOtp}
                loading={otpLoading}
                disabled={otpCode.length !== 6}
              >
                Vérifier
              </Button>
            </Space>
          </div>
        </div>
      )}

      {/* ═══ ÉTAPE 2 : Signature manuscrite ═══ */}
      {currentStep === 2 && (
        <div>
          <Alert
            type="success"
            showIcon
            message="Identité vérifiée"
            description="Vous pouvez maintenant apposer votre signature ci-dessous."
            style={{ marginBottom: 16 }}
          />

          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Text strong style={{ fontSize: 14 }}>Dessinez votre signature</Text>
            <div style={{ marginTop: 8 }}>
              <SignatureCanvas
                ref={canvasRef}
                width={560}
                height={180}
                penColor={SF.dark}
                penWidth={2.5}
              />
            </div>
            <Button
              type="link"
              onClick={() => canvasRef.current?.clear()}
              size="small"
              style={{ marginTop: 4 }}
            >
              Effacer et recommencer
            </Button>
          </div>

          <Divider style={{ margin: '12px 0' }} />

          {/* Clause juridique */}
          <div style={{
            background: '#fafafa',
            border: '1px solid #d9d9d9',
            borderRadius: 6,
            padding: '12px 16px',
            marginBottom: 16,
            fontSize: 12,
            lineHeight: 1.6,
            color: '#595959',
          }}>
            <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 12, color: '#1a1a1a' }}>
              Clause juridique
            </Text>
            {legalText}
          </div>

          <Checkbox
            checked={legalAccepted}
            onChange={e => setLegalAccepted(e.target.checked)}
          >
            <Text style={{ fontSize: 13 }}>
              Je reconnais avoir lu et j'accepte la clause juridique ci-dessus
            </Text>
          </Checkbox>

          <div style={{ marginTop: 24, textAlign: 'right' }}>
            <Space>
              <Button onClick={onClose}>Annuler</Button>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={handleSign}
                loading={signing}
                disabled={!legalAccepted}
                size="large"
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              >
                Signer le document
              </Button>
            </Space>
          </div>
        </div>
      )}

      {/* ═══ ÉTAPE 3 : Confirmation ═══ */}
      {currentStep === 3 && signResult && (
        <div>
          <Result
            status="success"
            title="Document signé avec succès"
            subTitle={`Signé par ${signerName} (${roleLabels[signerRole]})`}
          />

          <div style={{
            background: '#f6ffed',
            border: '1px solid #b7eb8f',
            borderRadius: 6,
            padding: '12px 16px',
            marginBottom: 16,
          }}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 11 }}>ID Signature :</Text>{' '}
                <Text code style={{ fontSize: 11 }}>{signResult.signatureId}</Text>
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 11 }}>Hash signature (SHA-256) :</Text>{' '}
                <Text code style={{ fontSize: 10, wordBreak: 'break-all' }}>{signResult.signatureHash}</Text>
              </div>
              {signResult.documentHash && (
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>Hash document (SHA-256) :</Text>{' '}
                  <Text code style={{ fontSize: 10, wordBreak: 'break-all' }}>{signResult.documentHash}</Text>
                </div>
              )}
            </Space>
          </div>

          <Space style={{ width: '100%', justifyContent: 'center' }}>
            <Button
              type="primary"
              onClick={handleViewSignedPdf}
              icon={<SafetyCertificateOutlined />}
            >
              PDF signé
            </Button>
            <Button onClick={onClose}>
              Fermer
            </Button>
          </Space>
        </div>
      )}

      {signatureId && (
        <SignedPdfPreviewModal
          open={pdfPreviewOpen}
          onClose={() => setPdfPreviewOpen(false)}
          signatureId={signatureId}
        />
      )}
    </Modal>
  );
};

export default SignatureModal;
