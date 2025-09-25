import React from 'react';
import { Card, Row, Col, Input, Button, Tooltip, Badge } from 'antd';
import { ReloadOutlined, AppstoreOutlined, CheckCircleOutlined, RocketOutlined } from '@ant-design/icons';

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

	return (
		<div className="mb-6">
			<div className="mb-6 text-center">
				<h1 className="text-3xl font-extrabold text-gray-800">Administration des Modules</h1>
				<p className="text-gray-600 mt-2">Gérez les modules et leurs catégories pour votre organisation</p>
			</div>

			{/* Cartes de statistiques */}
			<Row gutter={[16, 16]} className="mb-4">
				<Col xs={24} sm={12} md={6}>
					<Card className="shadow-sm hover:shadow-md transition-shadow">
						<div className="flex items-center justify-between">
							<div>
								<div className="text-sm text-gray-500">Total Catégories</div>
								<div className="text-2xl font-bold">{categoriesCount}</div>
							</div>
							<AppstoreOutlined className="text-[#2C5967]" style={{ fontSize: 26 }} />
						</div>
					</Card>
				</Col>
				<Col xs={24} sm={12} md={6}>
					<Card className="shadow-sm hover:shadow-md transition-shadow">
						<div className="flex items-center justify-between">
							<div>
								<div className="text-sm text-gray-500">Modules (total)</div>
								<div className="text-2xl font-bold">{totalModules}</div>
							</div>
							<RocketOutlined className="text-blue-600" style={{ fontSize: 26 }} />
						</div>
					</Card>
				</Col>
				<Col xs={24} sm={12} md={6}>
					<Card className="shadow-sm hover:shadow-md transition-shadow">
						<div className="flex items-center justify-between">
							<div>
								<div className="text-sm text-gray-500">Modules Actifs (global)</div>
								<div className="text-2xl font-bold">{totalActiveGlobal}</div>
							</div>
							<CheckCircleOutlined className="text-green-600" style={{ fontSize: 26 }} />
						</div>
					</Card>
				</Col>
				<Col xs={24} sm={12} md={6}>
					<Card className="shadow-sm hover:shadow-md transition-shadow">
						<div className="flex items-center justify-between">
							<div>
								<div className="text-sm text-gray-500">Actifs ({orgName || 'Orga'})</div>
								<div className="text-2xl font-bold">{totalActiveForOrg}</div>
							</div>
							<CheckCircleOutlined className="text-emerald-600" style={{ fontSize: 26 }} />
						</div>
					</Card>
				</Col>
			</Row>

			{/* Barre de filtres et actions */}
			<div className="bg-white border rounded px-4 py-3 shadow-sm">
				<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
					<div className="flex flex-1 items-center gap-3">
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
						<Tooltip title="Actualiser">
							<Button icon={<ReloadOutlined />} onClick={onRefresh} />
						</Tooltip>
					</div>
					<div className="flex items-center gap-2">
						{organizationSelector}
						<Badge color="#2C5967" count={categoriesCount} offset={[8, -4]}>
							<Button type="primary" onClick={onAddCategory}>Ajouter une catégorie</Button>
						</Badge>
						<Button onClick={onAddModule}>Ajouter un module</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

