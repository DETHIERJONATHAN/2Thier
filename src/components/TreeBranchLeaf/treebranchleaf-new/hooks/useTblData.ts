import { useEffect, useMemo, useState } from 'react';
import { useAuthenticatedApi } from '../../../../hooks/useAuthenticatedApi';
import type { TblNode, TblTab, TblTree, JsonObject } from '../types/types';

type ApiTree = { id: string; name: string } | undefined;
type ApiNode = {
	id: string;
	parentId: string | null;
	label: string;
	description?: string | null;
	type: string;
	subType?: string | null;
	fieldType?: string | null;
	order?: number | null;
    metadata?: Record<string, unknown> | null;
	// 📦 Filtrage par Produit
	hasProduct?: boolean;
	product_sourceNodeId?: string | null;
	product_visibleFor?: string[] | null;
	product_options?: Array<{ value: string; label: string }> | null;
	// 🛒 Select options depuis colonne DB
	select_options?: Array<{ label: string; value: string }> | null;
	select_multiple?: boolean | null;
};

const mockTree: TblTree = {
	id: 'tree-tbl-new',
	name: 'Système Multi-secteurs — Devis',
	variables: [],
	nodes: [
		{
			id: 'tab-general',
			parentId: null,
			title: 'Mesures générales',
			type: 'GROUP',
			leafType: null,
			order: 0,
			markers: [],
			children: [
				{
					id: 'leaf-type-client',
					parentId: 'tab-general',
					title: 'Type de client',
					subtitle: 'Choisissez le type de client',
					type: 'LEAF',
					leafType: 'FIELD',
					order: 0,
					markers: [],
					children: [],
					fieldConfig: {
						id: 'cfg-type-client',
						fieldType: 'SELECT',
						selectConfig: {
							options: [
								{ label: 'Particulier', value: 'particulier' },
								{ label: 'Entreprise', value: 'entreprise' },
								{ label: 'Autre', value: 'autre' }
							],
							defaultValue: 'particulier'
						}
					},
					conditionConfig: null,
					formulaConfig: null
				},
				{
					id: 'leaf-budget',
					parentId: 'tab-general',
					title: 'Budget global',
					subtitle: 'Montant disponible pour le projet',
					type: 'LEAF',
					leafType: 'FIELD',
					order: 1,
					markers: [],
					children: [],
					fieldConfig: {
						id: 'cfg-budget',
						fieldType: 'NUMBER',
						numberConfig: { min: 2000, max: 60000, step: 500, defaultValue: 12000, ui: 'slider' }
					},
					conditionConfig: null,
					formulaConfig: null
				},
				{
					id: 'leaf-surface',
					parentId: 'tab-general',
					title: 'Surface utile (m²)',
					subtitle: 'Surface estimée disponible (toiture/façades)',
					type: 'LEAF',
					leafType: 'FIELD',
					order: 2,
					markers: [],
					children: [],
					fieldConfig: {
						id: 'cfg-surface',
						fieldType: 'NUMBER',
						numberConfig: { min: 10, max: 200, step: 5, defaultValue: 40, ui: 'slider' }
					},
					conditionConfig: null,
					formulaConfig: null
				},
				{
					id: 'leaf-orientation',
					parentId: 'tab-general',
					title: 'Orientation',
					type: 'LEAF',
					leafType: 'FIELD',
					order: 3,
					markers: [],
					children: [],
					fieldConfig: {
						id: 'cfg-orientation',
						fieldType: 'SELECT',
						selectConfig: {
							options: [
								{ label: 'Sud', value: 'sud' },
								{ label: 'Est', value: 'est' },
								{ label: 'Ouest', value: 'ouest' },
								{ label: 'Nord', value: 'nord' }
							],
							defaultValue: 'sud'
						}
					},
					conditionConfig: null,
					formulaConfig: null
				},
				{
					id: 'leaf-inclinaison',
					parentId: 'tab-general',
					title: 'Inclinaison',
					type: 'LEAF',
					leafType: 'FIELD',
					order: 4,
					markers: [],
					children: [],
					fieldConfig: {
						id: 'cfg-inclinaison',
						fieldType: 'SELECT',
						selectConfig: {
							options: [
								{ label: '15°', value: '15' },
								{ label: '25°', value: '25' },
								{ label: '35°', value: '35' },
								{ label: '45°', value: '45' }
							],
							defaultValue: '35'
						}
					},
					conditionConfig: null,
					formulaConfig: null
				},
				{
					id: 'leaf-toiture-type',
					parentId: 'tab-general',
					title: 'Type de toiture',
					type: 'LEAF',
					leafType: 'FIELD',
					order: 5,
					markers: [],
					children: [],
					fieldConfig: {
						id: 'cfg-toiture',
						fieldType: 'SELECT',
						selectConfig: {
							options: [
								{ label: 'Tuiles', value: 'tuiles' },
								{ label: 'Ardoises', value: 'ardoises' },
								{ label: 'Bac acier', value: 'bacacier' }
							],
							defaultValue: 'tuiles'
						}
					},
					conditionConfig: null,
					formulaConfig: null
				}
			]
		},
		{ id: 'tab-pv', parentId: null, title: 'Photovoltaïque', type: 'GROUP', leafType: null, order: 1, markers: [], children: [], conditionConfig: null, formulaConfig: null },
		{ id: 'tab-toiture', parentId: null, title: 'Toiture', type: 'GROUP', leafType: null, order: 2, markers: [], children: [], conditionConfig: null, formulaConfig: null },
		{ id: 'tab-pacAA', parentId: null, title: 'PAC Air-Air', type: 'GROUP', leafType: null, order: 3, markers: [], children: [], conditionConfig: null, formulaConfig: null },
		{ id: 'tab-pacAE', parentId: null, title: 'PAC Air-Eau', type: 'GROUP', leafType: null, order: 4, markers: [], children: [], conditionConfig: null, formulaConfig: null },
		{ id: 'tab-thermo', parentId: null, title: 'Thermodynamique', type: 'GROUP', leafType: null, order: 5, markers: [], children: [], conditionConfig: null, formulaConfig: null },
		{ id: 'tab-eau', parentId: null, title: "Traitement de l'eau", type: 'GROUP', leafType: null, order: 6, markers: [], children: [], conditionConfig: null, formulaConfig: null },
		{ id: 'tab-isolation', parentId: null, title: 'Isolation murs', type: 'GROUP', leafType: null, order: 7, markers: [], children: [], conditionConfig: null, formulaConfig: null },
		{ id: 'tab-docs', parentId: null, title: 'Docs & Devis', type: 'GROUP', leafType: null, order: 8, markers: [], children: [], conditionConfig: null, formulaConfig: null }
	]
};

function coerceTree(response: unknown): ApiTree {
	if (!response || typeof response !== 'object') return undefined;
	const candidate = response as { id?: unknown; name?: unknown }; 
	if (typeof candidate.id === 'string') {
		return { id: candidate.id, name: typeof candidate.name === 'string' ? candidate.name : candidate.id };
	}
	if ('data' in (response as Record<string, unknown>)) {
		return coerceTree((response as { data: unknown }).data);
	}
	return undefined;
}

function coerceNodes(response: unknown): ApiNode[] | undefined {
	const root = 'data' in (response as Record<string, unknown>) ? (response as { data: unknown }).data : response;
	if (!Array.isArray(root)) return undefined;
	return root.filter(Boolean).map((item) => {
		const node = item as Record<string, unknown>;
		return {
			id: String(node.id ?? ''),
			parentId: node.parentId == null ? null : String(node.parentId),
			label: typeof node.label === 'string' ? node.label : String(node.label ?? ''),
			description: typeof node.description === 'string' ? node.description : null,
			type: typeof node.type === 'string' ? node.type : 'leaf_field',
			subType: typeof node.subType === 'string' ? node.subType : null,
			fieldType: typeof node.fieldType === 'string' ? node.fieldType : null,
			order: typeof node.order === 'number' ? node.order : null,
			metadata: typeof node.metadata === 'object' && node.metadata !== null ? (node.metadata as JsonObject) : null,
			// � Filtrage par Produit
			hasProduct: typeof node.hasProduct === 'boolean' ? node.hasProduct : false,
			product_sourceNodeId: typeof node.product_sourceNodeId === 'string' ? node.product_sourceNodeId : null,
			product_visibleFor: Array.isArray(node.product_visibleFor) ? node.product_visibleFor as string[] : null,
			product_options: Array.isArray(node.product_options) ? node.product_options as Array<{ value: string; label: string }> : null,
			// �🛒 Select options depuis les colonnes DB
			select_options: Array.isArray(node.select_options) ? node.select_options as Array<{ label: string; value: string }> : null,
			select_multiple: typeof node.select_multiple === 'boolean' ? node.select_multiple : null,
		};
	});
}

function coerceTreeList(response: unknown): ApiTree[] {
	const root = 'data' in (response as Record<string, unknown>) ? (response as { data: unknown }).data : response;
	if (!Array.isArray(root)) return [];
	return root.map((item) => coerceTree(item)).filter((tree): tree is ApiTree => Boolean(tree));
}

export function mapApiTree(tree: ApiTree, nodes: ApiNode[] | undefined): TblTree | null {
	if (!tree || !nodes || nodes.length === 0) return null;

	const nodeMap = new Map<string, TblNode>();
	const mapType = (type: string): { type: TblNode['type']; leafType: TblNode['leafType'] } => {
		const t = type.toLowerCase();
		if (t === 'branch' || t === 'group') return { type: 'GROUP', leafType: null };
		if (t === 'leaf_option') return { type: 'LEAF', leafType: 'OPTION' };
		if (t === 'leaf_option_field') return { type: 'LEAF', leafType: 'OPTION_FIELD' };
		return { type: 'LEAF', leafType: 'FIELD' };
	};

	const mapFieldConfig = (type: string, subType?: string | null, apiNode?: ApiNode | null): TblNode['fieldConfig'] => {
		const base = (subType || '').toUpperCase();
		const ft = (apiNode?.fieldType || '').toUpperCase();
		const t = type.toLowerCase();

		// 📦 Résoudre les options : select_options > product_options > []
		const resolvedOpts: Array<{ label: string; value: string }> =
			(apiNode?.select_options && apiNode.select_options.length > 0)
				? apiNode.select_options.map(o => ({ label: o.label, value: o.value }))
				: (apiNode?.product_options && apiNode.product_options.length > 0)
					? apiNode.product_options.map(o => ({ label: o.label, value: o.value }))
					: [];
		// 📦 Multiselect si select_multiple OU s'il a des product_options (champ Produit = toujours multi)
		const isProductSource = apiNode?.hasProduct === true && resolvedOpts.length > 0;
		const isMulti = apiNode?.select_multiple === true || isProductSource;

		if (t === 'leaf_number' || base === 'NUMBER' || ft === 'NUMBER') {
			return { id: `cfg-${Math.random().toString(36).slice(2, 8)}`, fieldType: 'NUMBER', numberConfig: { min: 0, max: 100, step: 1, defaultValue: 0, ui: 'input' } };
		}
		// 🛒 MULTISELECT: Traiter comme SELECT avec multiple=true
		if (base === 'MULTISELECT' || ft === 'MULTISELECT') {
			return { id: `cfg-${Math.random().toString(36).slice(2, 8)}`, fieldType: 'SELECT', multiple: true, selectConfig: { options: resolvedOpts } };
		}
		if (t === 'leaf_select' || base === 'SELECT' || ft === 'SELECT') {
			return { id: `cfg-${Math.random().toString(36).slice(2, 8)}`, fieldType: 'SELECT', multiple: isMulti, selectConfig: { options: resolvedOpts } };
		}
		if (t === 'leaf_checkbox' || base === 'CHECKBOX' || ft === 'CHECKBOX') {
			return { id: `cfg-${Math.random().toString(36).slice(2, 8)}`, fieldType: 'CHECKBOX' };
		}
		if (t === 'leaf_date' || base === 'DATE' || ft === 'DATE') {
			return { id: `cfg-${Math.random().toString(36).slice(2, 8)}`, fieldType: 'DATE' };
		}
		// 🛒 Fallback: Si le nœud a des options (select OU product), c'est un SELECT
		if (resolvedOpts.length > 0) {
			return { id: `cfg-${Math.random().toString(36).slice(2, 8)}`, fieldType: 'SELECT', multiple: isMulti, selectConfig: { options: resolvedOpts } };
		}
		return { id: `cfg-${Math.random().toString(36).slice(2, 8)}`, fieldType: 'TEXT', textConfig: { placeholder: '' } };
	};

	nodes.forEach((apiNode) => {
		if (!apiNode.id) return;
		const { type, leafType } = mapType(apiNode.type);
		nodeMap.set(apiNode.id, {
			id: apiNode.id,
			parentId: apiNode.parentId,
			title: apiNode.label,
			subtitle: apiNode.description || undefined,
			type,
			leafType,
			order: apiNode.order ?? 0,
			markers: [],
			children: [],
			fieldConfig: type === 'LEAF' ? mapFieldConfig(apiNode.type, apiNode.subType, apiNode) : null,
			conditionConfig: null,
			formulaConfig: null,
			metadata: apiNode.metadata as JsonObject ?? undefined,
			// 📦 Filtrage par Produit
			hasProduct: apiNode.hasProduct ?? false,
			product_sourceNodeId: apiNode.product_sourceNodeId ?? null,
			product_visibleFor: apiNode.product_visibleFor ?? null,
			product_options: apiNode.product_options ?? null,
		});
	});

	nodeMap.forEach((node) => {
		if (node.parentId && nodeMap.has(node.parentId)) {
			nodeMap.get(node.parentId)!.children.push(node);
		}
	});

	nodeMap.forEach((node) => {
		if (node.type === 'LEAF' && node.fieldConfig?.fieldType === 'SELECT') {
			const childOptions = node.children.filter((child) => child.type === 'LEAF' && child.leafType === 'OPTION');
			if (childOptions.length > 0) {
				node.fieldConfig.selectConfig = node.fieldConfig.selectConfig || { options: [] };
				node.fieldConfig.selectConfig.options = childOptions.map((child) => ({ label: child.title, value: child.id }));
			}
		}
	});

	const roots = Array.from(nodeMap.values()).filter((node) => !node.parentId);

	return {
		id: tree.id,
		name: tree.name,
		variables: [],
		nodes: roots
	};
}

export function useTblData(treeId: string) {
	const { api } = useAuthenticatedApi();
	const [tree, setTree] = useState<TblTree | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		const load = async () => {
			setLoading(true);
			setError(null);
			try {
				const [treeRes, nodesRes] = await Promise.all([
					api.get(`/api/treebranchleaf/trees/${treeId}`),
					api.get(`/api/treebranchleaf/trees/${treeId}/nodes`)
				]);

				const mapped = mapApiTree(coerceTree(treeRes), coerceNodes(nodesRes));
				if (mapped && !cancelled) {
					setTree(mapped);
					return;
				}
				throw new Error('Invalid tree payload');
					} catch {
				if (cancelled) return;
				try {
							const listRes = await api.get(`/api/treebranchleaf/trees`);
							const trees = coerceTreeList(listRes);
							const fallbackId = trees[0]?.id;
					if (fallbackId) {
						const [fallbackTreeRes, fallbackNodesRes] = await Promise.all([
							api.get(`/api/treebranchleaf/trees/${fallbackId}`),
							api.get(`/api/treebranchleaf/trees/${fallbackId}/nodes`)
						]);
						const mapped = mapApiTree(coerceTree(fallbackTreeRes), coerceNodes(fallbackNodesRes));
						if (mapped && !cancelled) {
							setTree(mapped);
							setError(null);
							return;
						}
					}
				} catch {
					// ignore and fallback to mock
				}
				setTree(mockTree);
				setError('Impossible de charger l’arbre TBL (mode démo)');
			} finally {
				if (!cancelled) setLoading(false);
			}
		};

		void load();

		return () => {
			cancelled = true;
		};
	}, [api, treeId]);

	const tabs: TblTab[] = useMemo(() => {
		if (!tree) return [];
		return tree.nodes
			.filter((node) => node.parentId == null && node.type === 'GROUP')
			.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
			.map((node) => ({ key: node.id, label: node.title }));
	}, [tree]);

	return { tree, tabs, loading, error };
}
