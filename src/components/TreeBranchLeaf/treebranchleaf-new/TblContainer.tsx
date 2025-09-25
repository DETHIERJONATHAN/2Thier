import React, { useMemo, useState } from "react";
import { Lead, Answers, TblNode } from "./types/types";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";
import { useTblData } from "./hooks/useTblData";
import DynamicTab from "./tabs/DynamicTab";
import { useTblSubmission } from "./hooks/useTblSubmission";
import { useSubmissionSummary } from "./hooks/useSubmissionSummary";
import { useSubmissionOperations } from "./hooks/useSubmissionOperations";
import { Button, Card, Progress, Timeline, Typography, message } from "antd";
import { useAuth } from "../../../auth/useAuth";
import type { TblFieldConfig } from "./types/types";
// Importer d'autres onglets ici quand ils seront créés
// import PvTab from "./tabs/PvTab";

interface TblContainerProps { treeId?: string }

const TblContainer: React.FC<TblContainerProps> = ({ treeId }) => {
  // === STATE ===
  const [activeTab, setActiveTab] = useState<string>("");
  const [debug, setDebug] = useState(false);

  // Données du Lead (viendront des props ou d'un appel API)
  const [lead] = useState<Lead>({
    name: "Dupont Alice",
    email: "alice.dupont@example.com",
    phone: "+32 477 12 34 56",
    address: "Rue des Fleurs 12, 1000 Bruxelles",
  });

  // Réponses du formulaire
  const [answers] = useState<Answers>({
    typeClient: "particulier",
    tva: "",
    budget: 12000,
    surface: 40,
    orientation: "sud",
    inclinaison: 35,
    toitureType: "tuiles",
    images: [],
    include: {},
  });
  // Charger la structure TBL et en dériver les onglets
  const { tree, tabs } = useTblData(treeId || "tree-tbl-new");

  // Etat local (temporaire) pour valeurs dynamiques par nodeId + hook de soumission
  const [values, setValues] = useState<Record<string, unknown>>({});
  const { state: submissionState, setValue: setSubmissionValue, setCalculatedValue, saveDraft, complete, isSaving } = useTblSubmission(tree?.id || treeId || "tree-tbl-new");
  const setValue = (nodeId: string, v: unknown) => {
    setValues(prev => ({ ...prev, [nodeId]: v }));
    setSubmissionValue(nodeId, v);
  };

  // Accès Super Admin
  const { isSuperAdmin } = useAuth();

  // ===== Auto-remplissage (Admin) =====
  const makeTestValue = (cfg?: TblFieldConfig | null): unknown => {
    if (!cfg) return '';
    switch (cfg.fieldType) {
      case 'TEXT':
        return cfg.textConfig?.defaultValue ?? cfg.textConfig?.placeholder ?? 'Valeur de test';
      case 'NUMBER': {
        const min = cfg.numberConfig?.min ?? 0;
        const max = cfg.numberConfig?.max ?? 100;
        const step = cfg.numberConfig?.step ?? 1;
        if (typeof cfg.numberConfig?.defaultValue === 'number') return cfg.numberConfig.defaultValue;
        const mid = min + Math.floor(((max - min) / 2) / step) * step;
        return mid;
      }
      case 'SELECT': {
        const def = cfg.selectConfig?.defaultValue;
        if (def) return def;
        const first = cfg.selectConfig?.options?.[0]?.value;
        return first ?? '';
      }
      case 'CHECKBOX':
        return true;
      case 'DATE': {
        const d = new Date();
        const iso = d.toISOString().slice(0, 10); // yyyy-mm-dd
        return iso;
      }
      default:
        return '';
    }
  };

  const fillAllFields = async (alsoSave: boolean) => {
    if (!tree?.nodes?.length) {
      message.warning("Aucun nœud TBL à remplir");
      return;
    }
    const leaves = tree.nodes.filter(n => n.type === 'LEAF' && n.fieldConfig);
    let filled = 0;
    for (const leaf of leaves) {
      const val = makeTestValue(leaf.fieldConfig as TblFieldConfig | undefined);
      setValue(leaf.id, val);
      filled++;
    }
    if (alsoSave) {
      await saveDraft();
      message.success(`Champs remplis (${filled}) et brouillon enregistré`);
    } else {
      message.success(`Champs remplis (${filled}). Vous pouvez maintenant enregistrer.`);
    }
  };

  // Résumé & opérations (rafraîchis quand l'id de soumission existe et quand on sauvegarde)
  const refreshKey = isSaving; // change when save lifecycle toggles
  const { data: summary } = useSubmissionSummary(submissionState.submissionId, refreshKey);
  const { items: operations } = useSubmissionOperations(submissionState.submissionId, refreshKey);

  // Initialiser l'onglet actif au premier onglet dès que les tabs sont là
  React.useEffect(() => {
    if (!activeTab && tabs.length > 0) {
      setActiveTab(tabs[0].key);
    }
  }, [tabs, activeTab]);

  // === HANDLERS ===

  // === LOGIQUE DÉRIVÉE (CALCULS) ===
  const derivedValues = useMemo(() => {
    const surface = Number(answers.surface ?? 0);
    const budget = Number(answers.budget ?? 0);

    // 🧮 @cout_total = Surface × 250 (PV)
    const coutTotal = surface > 0 ? Math.round(surface * 250) : undefined;
    // 🧩 Tableau 2D simplifié : orientation × inclinaison → rendement
    const rendementTable: Record<string, Record<number, number>> = {
      sud: { 15: 95, 25: 98, 35: 100, 45: 97 },
      est: { 15: 86, 25: 89, 35: 92, 45: 90 },
      ouest: { 15: 86, 25: 89, 35: 92, 45: 90 },
      nord: { 15: 65, 25: 70, 35: 72, 45: 71 },
    };
    const rendementRow = rendementTable[answers.orientation];
    const inclinaison = (answers.inclinaison ?? 35) as 15 | 25 | 35 | 45;
    const rendementPv = rendementRow?.[inclinaison] ?? undefined;

    // ⚖️ Condition : si budget >= coutTotal → "solvable"
    const isSolvable = (coutTotal && budget) ? budget >= coutTotal : undefined;

    return { coutTotal, rendementPv, isSolvable };
  }, [answers]);

  // 🎯 Sauvegarder les valeurs calculées quand elles changent
  React.useEffect(() => {
    if (derivedValues.coutTotal !== undefined) {
      setCalculatedValue('cout_total', derivedValues.coutTotal);
    }
    if (derivedValues.rendementPv !== undefined) {
      setCalculatedValue('rendement_pv', derivedValues.rendementPv);
    }
    if (derivedValues.isSolvable !== undefined) {
      setCalculatedValue('is_solvable', derivedValues.isSolvable);
    }
  }, [derivedValues, setCalculatedValue]);

  const renderActiveTab = () => {
    const activeTabKey = activeTab;

    // Onglet dynamique avec children réels si disponibles
    const found = tree?.nodes.find(n => n.id === activeTabKey);
    const groupNode: TblNode = found ?? {
      id: activeTabKey,
      parentId: null,
      title: tabs.find(t => t.key === activeTabKey)?.label || activeTabKey,
      subtitle: undefined,
      type: 'GROUP',
      leafType: null,
      order: 0,
      markers: [],
      children: [],
    };

    return <DynamicTab groupNode={groupNode} values={values} onChange={setValue} debugMode={debug} />;
  };

  return (
    <div className="min-h-screen bg-slate-50">
  <Header
        lead={lead}
        debug={debug}
        setDebug={setDebug}
        tabs={tabs}
        activeTab={activeTab}
    setActiveTab={setActiveTab}
    unsaved={!submissionState.submissionId}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-6">
          {isSuperAdmin && (
            <Card size="small">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-slate-700 font-medium">Outils Super Admin</div>
                <div className="flex items-center gap-2">
                  <Button onClick={() => { void fillAllFields(false); }}>Remplir tout (admin)</Button>
                  <Button type="primary" onClick={() => { void fillAllFields(true); }} loading={isSaving}>
                    Remplir + Enregistrer
                  </Button>
                </div>
              </div>
            </Card>
          )}
          {renderActiveTab()}

          {/* Résumé de complétion */}
          {summary ? (
            <Card size="small" title="Résumé de la soumission">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div>
                  <Progress percent={Math.round(summary.completion.percent)} />
                </div>
                <div>
                  <Typography.Text>Champs: {summary.counts.fields.filled}/{summary.counts.fields.total}</Typography.Text><br />
                  <Typography.Text type="secondary">Vides: {summary.counts.fields.empty}</Typography.Text>
                </div>
                <div>
                  <Typography.Text>Options + Champ: {summary.counts.optionFields.filled}/{summary.counts.optionFields.total}</Typography.Text><br />
                  <Typography.Text type="secondary">Variables: {summary.counts.variables.total}</Typography.Text>
                </div>
              </div>
            </Card>
          ) : (
            <Card size="small" title="Résumé de la soumission">
              <Typography.Text type="secondary">Pas encore de données enregistrées. Modifiez un champ pour commencer, puis sauvegardez.</Typography.Text>
            </Card>
          )}

          {/* Timeline des opérations */}
          {operations && operations.length > 0 ? (
            <Card size="small" title="Historique des opérations">
              <Timeline
                items={operations.map(op => ({
                  children: (
                    <div>
                      <Typography.Text strong>{op.operationResult}</Typography.Text>
                      <div className="text-slate-500 text-xs">
                        {op.operationSource}{op.operationDetail ? ` · ${op.operationDetail}` : ''} · {new Date(op.lastResolved).toLocaleString('fr-BE')}
                      </div>
                    </div>
                  )
                }))}
              />
            </Card>
          ) : (
            <Card size="small" title="Historique des opérations">
              <Typography.Text type="secondary">Aucune opération pour le moment. Saisissez des réponses pour voir l’historique apparaître.</Typography.Text>
            </Card>
          )}
        </div>

  <Sidebar
            answers={answers}
            derivedValues={derivedValues}
      tabs={tabs}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
        />
      </main>

  <Footer activeTabLabel={tabs.find(s => s.key === activeTab)?.label}
  onSaveDraft={() => { void saveDraft(); }}
  onComplete={() => { void complete(); }}
  saving={isSaving}
  />
    </div>
  );
};

export default TblContainer;
