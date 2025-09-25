import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';

type Totals = { subtotalExcl?: number; totalTax?: number; totalIncl?: number } | null | undefined;

type Quote = {
  id: string;
  leadId: string;
  blockId: string;
  number?: string;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
  title?: string | null;
  version: number;
  currency: string;
  validUntil?: string | null;
  notes?: string | null;
  data?: unknown;
  totals?: Totals;
  createdAt: string;
  updatedAt: string;
};

type Item = {
  id?: string;
  order: number;
  label: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discountPct?: number;
  taxPct?: number;
};

export default function QuotesPage() {
  const { get, post, patch } = useAuthenticatedApi();
  const [leadId, setLeadId] = useState<string>('');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selected, setSelected] = useState<Quote | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [blockId, setBlockId] = useState<string>('');

  // Données de sélection provenant du système existant
  type LeadLite = { id: string; name: string; company?: string; email?: string };
  type BlockLite = { id: string; name: string };
  const [leads, setLeads] = useState<LeadLite[]>([]);
  const [blocks, setBlocks] = useState<BlockLite[]>([]);
  const [blocksLoadError, setBlocksLoadError] = useState<string | null>(null);

  // Charger la liste par lead
  useEffect(() => {
    if (!leadId) return;
    get<{ success?: boolean; data?: Quote[]; total?: number }>(`/api/quotes`, { params: { leadId } })
      .then((res) => {
        const list = (res && 'data' in res ? res.data : (res as unknown as Quote[])) || [];
        setQuotes(list);
      })
      .catch(() => {/* handled by hook */});
  }, [leadId, get]);

  // Charger les leads (page Devis doit utiliser les entités existantes)
  useEffect(() => {
    get<{ success?: boolean; data?: any[] }>(`/api/leads`)
      .then((res) => {
        const arr = (res && 'data' in res ? res.data : (Array.isArray(res) ? res : [])) as any[];
        const mapped = arr.map(l => ({ id: l.id, name: l.name || `${l.firstName ?? ''} ${l.lastName ?? ''}`.trim(), company: l.company, email: l.email })) as LeadLite[];
        setLeads(mapped);
        // Pré-sélection si vide et au moins un lead
        setLeadId(prev => (prev || (mapped[0]?.id ?? '')));
      })
      .catch(() => {
        // Silencieux: la page reste fonctionnelle même si les leads n'arrivent pas
      });
  }, [get]);

  const hasFetchedBlocks = useRef(false);
  // Charger les blocks de formulaire (respect des formulaires Prisma)
  useEffect(() => {
    if (hasFetchedBlocks.current) return;
    hasFetchedBlocks.current = true;
    let cancelled = false;

    const loadBlocks = async () => {
      setBlocksLoadError(null);
      try {
        const res = await get<{ success?: boolean; data?: any[] }>(`/api/blocks`);
        if (cancelled) return;
        const arr = (res && 'data' in res ? res.data : (Array.isArray(res) ? res : [])) as any[];
        const mapped = arr.map((b: any) => ({ id: b.id, name: b.name })) as BlockLite[];
        setBlocks(mapped);
        setBlockId(prev => (prev || (mapped[0]?.id ?? '')));
      } catch {
        if (cancelled) return;
        // L'endpoint /api/blocks peut être restreint aux administrateurs
        setBlocksLoadError('Impossible de charger les formulaires (droits requis). Saisissez un Block ID si besoin.');
      }
    };

    loadBlocks();

    return () => {
      cancelled = true;
    };
  }, [get]);

  // Charger items du devis sélectionné
  useEffect(() => {
    if (!selected) return;
    get<Quote>(`/api/quotes/${selected.id}`).then((q) => {
      setSelected(q);
      const qItems = (q as unknown as { items?: Item[] }).items || [];
      setItems(qItems);
    });
  }, [selected, get]);

  const canSave = useMemo(() => !!selected && items.length >= 0, [selected, items]);

  const addRow = () => {
    setItems((prev) => [
      ...prev,
      { order: prev.length, label: 'Nouvel article', quantity: 1, unitPrice: 0, discountPct: 0, taxPct: 21 },
    ]);
  };

  const updateRow = (idx: number, patchItem: Partial<Item>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patchItem } : it)));
  };

  const removeRow = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx).map((it, i) => ({ ...it, order: i })));
  };

  const saveItems = async () => {
    if (!selected) return;
    await post(`/api/quotes/${selected.id}/items`, { items });
    const refreshed = await get<Quote>(`/api/quotes/${selected.id}`);
    setSelected(refreshed);
    const qItems = (refreshed as unknown as { items?: Item[] }).items || [];
    setItems(qItems);
  };

  const createQuote = async () => {
    if (!leadId || !blockId) return alert('leadId et blockId requis');
    const lead = leads.find(l => l.id === leadId);
    const title = lead ? `Devis - ${lead.name}${lead.company ? ' (' + lead.company + ')' : ''}` : 'Nouveau devis';
    const created = await post<Quote>(`/api/quotes`, { leadId, blockId, title });
    setQuotes((q) => [created, ...q]);
    setSelected(created);
    setItems([]);
  };

  const duplicateQuote = async (id: string) => {
    const dup = await post<Quote>(`/api/quotes/${id}/duplicate`, {});
    setQuotes((q) => [dup, ...q]);
  };

  const updateMeta = async (patchData: Partial<Pick<Quote, 'title' | 'notes' | 'status' | 'currency' | 'validUntil'>>) => {
    if (!selected) return;
    const upd = await patch<Quote>(`/api/quotes/${selected.id}`, patchData);
    setSelected(upd);
    setQuotes((list) => list.map((q) => (q.id === upd.id ? { ...q, ...upd } : q)));
  };

  const totals = (selected?.totals || {}) as NonNullable<Totals> & { subtotalExcl?: number; totalTax?: number; totalIncl?: number };

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Devis (Phase 1)</h1>
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex gap-2 items-center">
          <label className="text-sm text-gray-600 w-28">Client</label>
          <select className="border px-2 py-1 flex-1" value={leadId} onChange={(e) => setLeadId(e.target.value)}>
            {leads.map(l => (
              <option key={l.id} value={l.id}>{l.name}{l.company ? ` — ${l.company}` : ''}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-sm text-gray-600 w-28">Formulaire</label>
          {blocks.length > 0 ? (
            <select className="border px-2 py-1 flex-1" value={blockId} onChange={(e) => setBlockId(e.target.value)}>
              {blocks.map(b => (<option key={b.id} value={b.id}>{b.name}</option>))}
            </select>
          ) : (
            <div className="flex-1 flex gap-2">
              <input className="border px-2 py-1 flex-1" placeholder="Block ID (si non listé)" value={blockId} onChange={(e) => setBlockId(e.target.value)} />
              {blocksLoadError && <span className="text-xs text-amber-600 self-center">{blocksLoadError}</span>}
            </div>
          )}
        </div>
        <div>
          <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={createQuote} disabled={!leadId || !blockId}>
            Créer un devis
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 border rounded p-3 bg-white">
          <h2 className="font-medium mb-2">Liste des devis</h2>
          <ul className="space-y-2 max-h-[60vh] overflow-auto">
            {quotes.map((q) => (
              <li key={q.id} className={`p-2 border rounded cursor-pointer ${selected?.id === q.id ? 'bg-blue-50' : ''}`} onClick={() => setSelected(q)}>
                <div className="text-sm font-semibold">{q.title || q.number || q.id.slice(0, 8)}</div>
                <div className="text-xs text-gray-500">{q.status} • {new Date(q.updatedAt).toLocaleString()}</div>
                <button className="text-xs text-blue-700 mt-1" onClick={(e) => { e.stopPropagation(); duplicateQuote(q.id); }}>Dupliquer</button>
              </li>
            ))}
          </ul>
        </div>

        <div className="col-span-2 border rounded p-3 bg-white">
          {!selected ? (
            <div>Sélectionnez un devis.</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <input className="border px-2 py-1" value={selected.title ?? ''} onChange={(e) => updateMeta({ title: e.target.value })} placeholder="Titre" />
                <select className="border px-2 py-1" value={selected.status} onChange={(e) => updateMeta({ status: e.target.value as Quote['status'] })}>
                  {['DRAFT','SENT','ACCEPTED','REJECTED','CANCELLED','EXPIRED'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input className="border px-2 py-1" value={selected.currency} onChange={(e) => updateMeta({ currency: e.target.value })} placeholder="Devise" />
                <input className="border px-2 py-1" type="date" value={selected.validUntil ? selected.validUntil.substring(0,10) : ''} onChange={(e) => updateMeta({ validUntil: e.target.value })} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Lignes</h3>
                  <button className="bg-gray-800 text-white px-2 py-1 rounded" onClick={addRow}>Ajouter</button>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="p-1">#</th>
                      <th className="p-1">Libellé</th>
                      <th className="p-1">Qté</th>
                      <th className="p-1">PU</th>
                      <th className="p-1">Remise %</th>
                      <th className="p-1">TVA %</th>
                      <th className="p-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-1 w-10">{idx + 1}</td>
                        <td className="p-1">
                          <input className="border px-1 py-0.5 w-full" value={it.label} onChange={(e) => updateRow(idx, { label: e.target.value })} />
                        </td>
                        <td className="p-1 w-16">
                          <input type="number" step="0.01" className="border px-1 py-0.5 w-full" value={it.quantity} onChange={(e) => updateRow(idx, { quantity: Number(e.target.value) })} />
                        </td>
                        <td className="p-1 w-24">
                          <input type="number" step="0.01" className="border px-1 py-0.5 w-full" value={it.unitPrice} onChange={(e) => updateRow(idx, { unitPrice: Number(e.target.value) })} />
                        </td>
                        <td className="p-1 w-24">
                          <input type="number" step="0.01" className="border px-1 py-0.5 w-full" value={it.discountPct ?? 0} onChange={(e) => updateRow(idx, { discountPct: Number(e.target.value) })} />
                        </td>
                        <td className="p-1 w-20">
                          <input type="number" step="0.01" className="border px-1 py-0.5 w-full" value={it.taxPct ?? 21} onChange={(e) => updateRow(idx, { taxPct: Number(e.target.value) })} />
                        </td>
                        <td className="p-1 w-16 text-right">
                          <button className="text-red-600" onClick={() => removeRow(idx)}>Suppr.</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-end mt-3">
                  <button disabled={!canSave} className={`px-3 py-1 rounded text-white ${canSave ? 'bg-blue-600' : 'bg-gray-400'}`} onClick={saveItems}>Sauvegarder les lignes</button>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <div>Total HT: {totals?.subtotalExcl ?? ''}</div>
                <div>TVA: {totals?.totalTax ?? ''}</div>
                <div>Total TTC: {totals?.totalIncl ?? ''}</div>
              </div>
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-4">UI minimale Phase 1 — onglets/form rules viendront ensuite.</p>
    </div>
  );
}
