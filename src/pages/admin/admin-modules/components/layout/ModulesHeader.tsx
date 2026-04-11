import { SF, FB } from '../../../../../components/zhiive/ZhiiveTheme';
import React from 'react';
import { Input, Button, Tooltip, Badge } from 'antd';
import { ReloadOutlined, AppstoreOutlined, CheckCircleOutlined, RocketOutlined } from '@ant-design/icons';

// ── Facebook Design Tokens ──
type ModulesHeaderProps = {
	categoriesCount: number;
	totalModules: number;
	totalActiveGlobal: number;
	totalActiveForOrg: number;
	orgName?: string;
	// Actions / contrôles
	searchValue: string;
	onSearchChange: (v: string) => void;
	orderFilterValue: string;
	onOrderFilterChange: (v: string) => void;
	onAddCategory: () => void;
	onAddModule: () => void;
	onRefresh: () => void;
	organizationSelector?: React.ReactNode;
};

export default function ModulesHeader(props: ModulesHeaderProps) {
	const {
		categoriesCount,
		totalModules,
		totalActiveGlobal,
		totalActiveForOrg,
		orgName,
		searchValue,
		onSearchChange,
		orderFilterValue,
		onOrderFilterChange,
		onAddCategory,
		onAddModule,
		onRefresh,
		organizationSelector
	} = props;

	const statCardStyle: React.CSSProperties = {
		background: FB.white, borderRadius: FB.radius, padding: 16,
		boxShadow: FB.shadow, flex: '1 1 180px', minWidth: 180,
	};

	return (
		<div style={{ marginBottom: 20 }}>
			{/* Header */}
			<div style={{
				background: FB.white, borderRadius: FB.radius, padding: '18px 24px',
				boxShadow: FB.shadow, marginBottom: 16, textAlign: 'center',
			}}>
				<div style={{ fontSize: 24, fontWeight: 700, color: FB.text }}>Administration des Modules</div>
				<div style={{ color: FB.textSecondary, fontSize: 14, marginTop: 4 }}>Gérez les modules et leurs catégories pour votre organisation</div>
			</div>

			{/* Stats */}
			<div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
				<div style={statCardStyle}>
					<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
						<div>
							<div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: FB.textSecondary }}>Total Catégories</div>
							<div style={{ fontSize: 22, fontWeight: 700, color: FB.text }}>{categoriesCount}</div>
						</div>
						<AppstoreOutlined style={{ fontSize: 26, color: '#2C5967' }} />
					</div>
				</div>
				<div style={statCardStyle}>
					<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
						<div>
							<div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: FB.textSecondary }}>Modules (total)</div>
							<div style={{ fontSize: 22, fontWeight: 700, color: FB.text }}>{totalModules}</div>
						</div>
						<RocketOutlined style={{ fontSize: 26, color: FB.blue }} />
					</div>
				</div>
				<div style={statCardStyle}>
					<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
						<div>
							<div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: FB.textSecondary }}>Modules Actifs (global)</div>
							<div style={{ fontSize: 22, fontWeight: 700, color: FB.text }}>{totalActiveGlobal}</div>
						</div>
						<CheckCircleOutlined style={{ fontSize: 26, color: FB.green }} />
					</div>
				</div>
				<div style={statCardStyle}>
					<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
						<div>
							<div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: FB.textSecondary }}>Actifs ({orgName || 'Orga'})</div>
							<div style={{ fontSize: 22, fontWeight: 700, color: FB.text }}>{totalActiveForOrg}</div>
						</div>
						<CheckCircleOutlined style={{ fontSize: 26, color: SF.emerald }} />
					</div>
				</div>
			</div>

			{/* Barre de filtres et actions */}
			<div style={{
				background: FB.white, borderRadius: FB.radius, padding: '12px 16px',
				boxShadow: FB.shadow,
			}}>
				<div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
					<div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 12 }}>
						<Input
							placeholder="Rechercher un module…"
							value={searchValue}
							onChange={(e) => onSearchChange(e.target.value)}
							style={{ maxWidth: 320 }}
						/>
						<Input
							placeholder="Filtrer par ordre…"
							value={orderFilterValue}
							onChange={(e) => onOrderFilterChange(e.target.value)}
							style={{ maxWidth: 200 }}
						/>
						<button onClick={onRefresh} title="Actualiser" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: 'none', background: FB.btnGray, color: FB.text, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
							<span>🔄</span><span>Actualiser</span>
						</button>
					</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
						{organizationSelector}
						<Badge color="#2C5967" count={categoriesCount} offset={[8, -4]}>
							<button onClick={onAddCategory} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: 'none', background: FB.blue, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
								<span>➕</span><span>Catégorie</span>
							</button>
						</Badge>
						<button onClick={onAddModule} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: 'none', background: FB.btnGray, color: FB.text, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
							<span>📦</span><span>Module</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

