import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Card, Button, Typography, Alert, Checkbox, Rate, Input, Tag, Spin, Result, Divider,
} from 'antd';
import {
  CheckCircleOutlined, FileProtectOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface ReceptionData {
  id: string;
  status: string;
  checklist: Array<{ nodeId?: string; label: string; expectedValue?: string; checked: boolean; note?: string }>;
  workSummary: unknown;
  satisfactionQuestions: Array<{ id: string; question: string; type: string }>;
  legalText: string;
  clientName: string;
  totalAmount: number | null;
  organizationName: string;
  productLabel: string;
  siteAddress: string;
  alreadySigned?: boolean;
}

const ReceptionPage: React.FC = () => {
  const token = window.location.pathname.split('/reception/')[1];
  const [data, setData] = useState<ReceptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // État du formulaire
  const [checklist, setChecklist] = useState<ReceptionData['checklist']>([]);
  const [clientName, setClientName] = useState('');
  const [satisfactionAnswers, setSatisfactionAnswers] = useState<Array<{ id: string; question: string; answer: unknown; rating?: number }>>([]);
  const [reserves, setReserves] = useState<Array<{ description: string; severity: 'minor' | 'major' | 'critical' }>>([]);
  const [newReserve, setNewReserve] = useState('');
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [signature, setSignature] = useState('');

  // Canvas signature
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Lien invalide');
      setLoading(false);
      return;
    }
    fetch(`/api/chantier-workflow/reception/${token}`)
      .then(res => res.json())
      .then(result => {
        if (!result.success) {
          setError(result.message || 'Erreur');
        } else {
          const d = result.data;
          setData(d);
          setChecklist(d.checklist || []);
          setClientName(d.clientName || '');
          setSatisfactionAnswers(
            (d.satisfactionQuestions || []).map((q: Record<string, unknown>) => ({
              id: q.id,
              question: q.question,
              answer: q.type === 'boolean' ? null : q.type === 'rating' ? 0 : '',
              rating: q.type === 'rating' ? 0 : undefined,
            }))
          );
          if (d.alreadySigned) setSubmitted(true);
        }
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [token]);

  // Canvas drawing for signature
  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const endDraw = () => {
    setIsDrawing(false);
    if (canvasRef.current && hasSignature) {
      setSignature(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    setSignature('');
    setHasSignature(false);
  };

  const handleSubmit = useCallback(async () => {
    if (!clientName.trim()) {
      alert('Veuillez indiquer votre nom complet');
      return;
    }
    if (!hasSignature || !signature) {
      alert('Veuillez signer dans le cadre prévu');
      return;
    }
    if (!legalAccepted) {
      alert('Veuillez accepter les conditions pour valider la réception');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/chantier-workflow/reception/${token}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientName.trim(),
          clientSignature: signature,
          checklist,
          satisfactionAnswers: satisfactionAnswers.filter(a => a.answer !== null && a.answer !== '' && a.answer !== 0),
          reserves: reserves.length > 0 ? reserves : undefined,
          legalAccepted,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setSubmitted(true);
      } else {
        alert(result.message || 'Erreur lors de la signature');
      }
    } catch {
      alert('Erreur de connexion');
    } finally {
      setSubmitting(false);
    }
  }, [clientName, signature, hasSignature, legalAccepted, checklist, satisfactionAnswers, reserves, token]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
        <Spin size="large" tip="Chargement..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
        <Result status="error" title="Lien invalide ou expiré" subTitle={error} />
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
        <Result
          status="success"
          icon={<SafetyCertificateOutlined style={{ color: '#52c41a' }} />}
          title="Réception signée avec succès !"
          subTitle="Merci pour votre confiance. Vous recevrez une copie par email."
        />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '16px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* En-tête */}
      <Card style={{ marginBottom: 16, textAlign: 'center' }}>
        <Title level={3} style={{ marginBottom: 4 }}>
          <FileProtectOutlined /> Procès-Verbal de Réception
        </Title>
        <Text type="secondary">{data.organizationName}</Text>
        <Divider style={{ margin: '12px 0' }} />
        <div style={{ textAlign: 'left' }}>
          <Text><strong>Client :</strong> {data.clientName}</Text><br />
          <Text><strong>Adresse :</strong> {data.siteAddress}</Text><br />
          <Text><strong>Type :</strong> {data.productLabel}</Text><br />
          {data.totalAmount && (
            <Text><strong>Montant :</strong> {data.totalAmount.toLocaleString('fr-BE', { minimumFractionDigits: 2 })} € TTC</Text>
          )}
        </div>
      </Card>

      {/* Checklist */}
      <Card title="✅ Vérification point par point" size="small" style={{ marginBottom: 16 }}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
          Veuillez vérifier chaque élément et confirmer qu'il correspond à ce qui a été installé.
        </Text>
        {checklist.map((item, i) => (
          <div key={i} style={{
            padding: '10px 12px',
            marginBottom: 8,
            borderRadius: 6,
            border: `1px solid ${item.checked ? '#b7eb8f' : '#d9d9d9'}`,
            background: item.checked ? '#f6ffed' : '#fff',
          }}>
            <Checkbox
              checked={item.checked}
              onChange={e => {
                const updated = [...checklist];
                updated[i] = { ...updated[i], checked: e.target.checked };
                setChecklist(updated);
              }}
            >
              <Text strong>{item.label}</Text>
              {item.expectedValue && (
                <Text type="secondary" style={{ display: 'block', fontSize: 12, marginLeft: 24 }}>
                  Valeur prévue : {item.expectedValue}
                </Text>
              )}
            </Checkbox>
            {/* Note optionnelle */}
            <Input
              size="small"
              placeholder="Remarque (optionnel)..."
              value={item.note || ''}
              onChange={e => {
                const updated = [...checklist];
                updated[i] = { ...updated[i], note: e.target.value };
                setChecklist(updated);
              }}
              style={{ marginTop: 6, marginLeft: 24, width: 'calc(100% - 24px)' }}
            />
          </div>
        ))}
      </Card>

      {/* Réserves */}
      <Card title="⚠️ Réserves éventuelles" size="small" style={{ marginBottom: 16 }}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
          Si des travaux ne sont pas conformes ou nécessitent une correction, décrivez-les ici.
        </Text>
        {reserves.map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Tag color={r.severity === 'critical' ? 'red' : r.severity === 'major' ? 'orange' : 'blue'}>
              {r.severity}
            </Tag>
            <Text style={{ flex: 1 }}>{r.description}</Text>
            <Button size="small" danger onClick={() => setReserves(prev => prev.filter((_, idx) => idx !== i))}>✕</Button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            size="small"
            value={newReserve}
            onChange={e => setNewReserve(e.target.value)}
            placeholder="Décrivez la réserve..."
            style={{ flex: 1 }}
            onPressEnter={() => {
              if (newReserve.trim()) {
                setReserves(prev => [...prev, { description: newReserve.trim(), severity: 'minor' }]);
                setNewReserve('');
              }
            }}
          />
          <Button size="small" onClick={() => {
            if (newReserve.trim()) {
              setReserves(prev => [...prev, { description: newReserve.trim(), severity: 'minor' }]);
              setNewReserve('');
            }
          }}>Ajouter</Button>
        </div>
      </Card>

      {/* Satisfaction */}
      <Card title="⭐ Satisfaction" size="small" style={{ marginBottom: 16 }}>
        {satisfactionAnswers.map((sa, i) => {
          const q = data.satisfactionQuestions?.find(q => q.id === sa.id);
          if (!q) return null;
          return (
            <div key={sa.id} style={{ marginBottom: 12 }}>
              <Text style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>{q.question}</Text>
              {q.type === 'rating' && (
                <Rate
                  value={sa.rating || 0}
                  onChange={val => {
                    const updated = [...satisfactionAnswers];
                    updated[i] = { ...updated[i], answer: val, rating: val };
                    setSatisfactionAnswers(updated);
                  }}
                />
              )}
              {q.type === 'boolean' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    size="small"
                    type={sa.answer === true ? 'primary' : 'default'}
                    onClick={() => {
                      const updated = [...satisfactionAnswers];
                      updated[i] = { ...updated[i], answer: true };
                      setSatisfactionAnswers(updated);
                    }}
                  >Oui</Button>
                  <Button
                    size="small"
                    type={sa.answer === false ? 'primary' : 'default'}
                    danger={sa.answer === false}
                    onClick={() => {
                      const updated = [...satisfactionAnswers];
                      updated[i] = { ...updated[i], answer: false };
                      setSatisfactionAnswers(updated);
                    }}
                  >Non</Button>
                </div>
              )}
              {q.type === 'text' && (
                <Input.TextArea
                  size="small"
                  rows={2}
                  value={sa.answer || ''}
                  onChange={e => {
                    const updated = [...satisfactionAnswers];
                    updated[i] = { ...updated[i], answer: e.target.value };
                    setSatisfactionAnswers(updated);
                  }}
                  placeholder="Votre commentaire..."
                />
              )}
            </div>
          );
        })}
      </Card>

      {/* Clause légale + Signature */}
      <Card title={<span><SafetyCertificateOutlined /> Acceptation et Signature</span>} size="small" style={{ marginBottom: 16 }}>
        {/* Texte juridique */}
        <div style={{
          padding: '12px 16px',
          background: '#fafafa',
          border: '1px solid #d9d9d9',
          borderRadius: 6,
          marginBottom: 12,
          maxHeight: 200,
          overflowY: 'auto',
          fontSize: 13,
          lineHeight: 1.6,
        }}>
          {data.legalText}
        </div>

        <Checkbox
          checked={legalAccepted}
          onChange={e => setLegalAccepted(e.target.checked)}
          style={{ marginBottom: 16 }}
        >
          <Text strong>J'ai lu et j'accepte les conditions ci-dessus</Text>
        </Checkbox>

        {/* Nom du signataire */}
        <div style={{ marginBottom: 12 }}>
          <Text style={{ display: 'block', marginBottom: 4 }}>Nom complet du signataire :</Text>
          <Input
            value={clientName}
            onChange={e => setClientName(e.target.value)}
            placeholder="Prénom et Nom"
          />
        </div>

        {/* Zone de signature */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text>Signature manuscrite :</Text>
            <Button size="small" onClick={clearSignature}>Effacer</Button>
          </div>
          <div style={{ border: '2px dashed #d9d9d9', borderRadius: 8, background: '#fff', touchAction: 'none' }}>
            <canvas
              ref={canvasRef}
              width={350}
              height={150}
              style={{ width: '100%', maxWidth: 350, height: 150, cursor: 'crosshair', display: 'block' }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
          </div>
          {!hasSignature && (
            <Text type="secondary" style={{ fontSize: 11 }}>Signez dans le cadre ci-dessus avec votre doigt ou votre souris</Text>
          )}
        </div>

        {/* Bouton final */}
        <Button
          type="primary"
          size="large"
          block
          icon={<CheckCircleOutlined />}
          loading={submitting}
          disabled={!legalAccepted || !hasSignature || !clientName.trim()}
          onClick={handleSubmit}
          style={{ height: 48, marginTop: 8, background: '#52c41a', borderColor: '#52c41a' }}
        >
          {reserves.length > 0 ? 'Signer avec réserves' : 'Signer et accepter la réception'}
        </Button>

        {reserves.length > 0 && (
          <Alert
            type="warning"
            showIcon
            message={`${reserves.length} réserve(s) seront jointe(s) au PV`}
            style={{ marginTop: 8 }}
          />
        )}
      </Card>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '16px 0', color: '#8c8c8c', fontSize: 11 }}>
        Document généré par {data.organizationName} — Ce PV fait foi et constitue une preuve de réception des travaux
      </div>
    </div>
  );
};

export default ReceptionPage;
