import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, Typography, Row, Col, Statistic, message, Segmented } from 'antd';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';
import { RocketOutlined, BarChartOutlined, UserOutlined, EyeOutlined } from '@ant-design/icons';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';

const { Title, Paragraph } = Typography;

export default function Devis1minuteAdminDashboard() {
  const { api } = useAuthenticatedApi();
  const [stats, setStats] = useState<{ totalCampaigns: number; activeCampaigns: number; totalLeads: number; thisMonthLeads: number } | null>(null);
  const [landingStats, setLandingStats] = useState<{ totalPages: number; publishedPages: number; draftPages: number; totalViews: number; totalConversions: number; avgConversionRate: number } | null>(null);
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [leadSeries, setLeadSeries] = useState<Array<{ date: string; created: number; completed: number }>>([]);
  const [landingSeries, setLandingSeries] = useState<Array<{ date: string; views: number; conversions: number }>>([]);

  const load = useCallback(async () => {
    try {
      const [leadGen, landing] = await Promise.all([
        api.get<{ success: boolean; data: { totalCampaigns: number; activeCampaigns: number; totalLeads: number; thisMonthLeads: number } }>(
          '/api/lead-generation/stats'
        ),
        api.get<{ success: boolean; data: { totalPages: number; publishedPages: number; draftPages: number; totalViews: number; totalConversions: number; avgConversionRate: number } }>(
          '/api/landing-pages/stats'
        )
      ]);
      setStats(leadGen?.data || null);
      setLandingStats(landing?.data || null);
    } catch (e) {
      console.error(e);
      message.error('Impossible de charger les statistiques');
    }
  }, [api]);

  const loadSeries = useCallback(async (days: number) => {
    try {
      const [leadTs, landingTs] = await Promise.all([
        api.get<{ success: boolean; data: { series: Array<{ date: string; created: number; completed: number }> } }>(
          '/api/lead-generation/stats/timeseries',
          { params: { days } }
        ),
        api.get<{ success: boolean; data: { series: Array<{ date: string; views: number; conversions: number }> } }>(
          '/api/landing-pages/stats/timeseries',
          { params: { days } }
        )
      ]);
      setLeadSeries(leadTs?.data?.series || []);
      setLandingSeries(landingTs?.data?.series || []);
    } catch (e) {
      console.error(e);
      message.error('Impossible de charger les séries temporelles');
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await loadSeries(range);
    };
    run();
    const iv = setInterval(run, 10_000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [range, loadSeries]);

  const xTickFormatter = useCallback((v: string) => v.slice(5), []);
  const yFormatter = useCallback((v: number) => (v ?? 0).toLocaleString('fr-BE'), []);
  const segmentedOptions = useMemo(() => ([
    { label: '7j', value: 7 },
    { label: '30j', value: 30 },
    { label: '90j', value: 90 }
  ] as const), []);

  return (
    <div className="p-6">
      <Typography>
        <Title level={3}>Devis1Minute - Admin Dashboard</Title>
        <Paragraph type="secondary">Vue d'ensemble: campagnes, leads, et performance des landings.</Paragraph>
      </Typography>
      <div className="mb-4 flex items-center gap-3">
        <Segmented
          options={segmentedOptions as unknown as string[]}
          value={range}
          onChange={(v) => setRange(Number(v) as 7 | 30 | 90)}
        />
      </div>
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic title="Campagnes totales" value={stats?.totalCampaigns ?? 0} prefix={<RocketOutlined />} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Campagnes actives" value={stats?.activeCampaigns ?? 0} prefix={<BarChartOutlined />} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Leads (total)" value={stats?.totalLeads ?? 0} prefix={<UserOutlined />} valueStyle={{ color: '#722ed1' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Vues landings" value={landingStats?.totalViews ?? 0} prefix={<EyeOutlined />} valueStyle={{ color: '#13c2c2' }} />
          </Card>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic title="Pages landing" value={landingStats?.totalPages ?? 0} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Pages publiées" value={landingStats?.publishedPages ?? 0} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Conversions" value={landingStats?.totalConversions ?? 0} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Taux conv. moyen" value={landingStats?.avgConversionRate ?? 0} suffix="%" />
          </Card>
        </Col>
      </Row>
      <Row gutter={16} className="mt-4">
        <Col span={12}>
          <Card title="Leads par jour">
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <AreaChart data={leadSeries} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1890ff" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#1890ff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#52c41a" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#52c41a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={xTickFormatter} />
                  <YAxis tickFormatter={yFormatter} allowDecimals={false} />
                  <Tooltip formatter={(v) => (v as number).toLocaleString('fr-BE')} labelFormatter={(lbl) => `Date: ${lbl}`} />
                  <Legend />
                  <Area type="monotone" dataKey="created" name="Créés" stroke="#1890ff" fillOpacity={1} fill="url(#colorCreated)" />
                  <Area type="monotone" dataKey="completed" name="Complétés" stroke="#52c41a" fillOpacity={1} fill="url(#colorCompleted)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Vues et conversions (Landings)">
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <AreaChart data={landingSeries} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#13c2c2" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#13c2c2" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#722ed1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#722ed1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={xTickFormatter} />
                  <YAxis tickFormatter={yFormatter} allowDecimals={false} />
                  <Tooltip formatter={(v) => (v as number).toLocaleString('fr-BE')} labelFormatter={(lbl) => `Date: ${lbl}`} />
                  <Legend />
                  <Area type="monotone" dataKey="views" name="Vues" stroke="#13c2c2" fillOpacity={1} fill="url(#colorViews)" />
                  <Area type="monotone" dataKey="conversions" name="Conversions" stroke="#722ed1" fillOpacity={1} fill="url(#colorConversions)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
