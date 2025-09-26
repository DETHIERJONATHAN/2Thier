import React, { useMemo } from 'react';
import {
  AppstoreOutlined,
  CheckCircleOutlined,
  DeploymentUnitOutlined,
  RiseOutlined,
  SlidersOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Progress, Tag } from 'antd';
import { useAuth } from '@/auth/useAuth';

interface DashboardStat {
  id: string;
  label: string;
  value: string;
  helper?: string;
  icon: React.ReactNode;
  gradient: string;
}

interface HighlightedModule {
  id: string;
  title: string;
  description: string;
  active: boolean;
  permissionCount: number;
}

const OracleNewDashboard: React.FC = () => {
  const { modules = [], currentOrganization, user } = useAuth();

  const activeModules = useMemo(
    () => modules.filter(m => m.enabled !== false && m.active !== false && m.isActiveForOrg !== false),
    [modules]
  );

  const totalModules = modules.length;
  const disabledCount = totalModules - activeModules.length;
  const activationRate = totalModules > 0 ? Math.round((activeModules.length / totalModules) * 100) : 0;

  const highlightedModules = useMemo<HighlightedModule[]>(() => {
    return modules
      .map<HighlightedModule>((module, index) => ({
        id: module.key || module.name || module.feature || `module-${index}`,
        title: module.label || module.name || 'Module sans nom',
        description: module.feature ? `Feature: ${module.feature}` : 'Module disponible dans la plateforme',
        active: module.enabled !== false && module.active !== false && module.isActiveForOrg !== false,
        permissionCount: module.permissions?.length ?? 0,
      }))
      .sort((a, b) => {
        if (a.active === b.active) {
          return a.title.localeCompare(b.title);
        }
        return a.active ? -1 : 1;
      })
      .slice(0, 8);
  }, [modules]);

  const stats = useMemo<DashboardStat[]>(() => {
    return [
      {
        id: 'active-modules',
        label: 'Modules actifs',
        value: `${activeModules.length}`,
        helper: totalModules > 0 ? `sur ${totalModules} disponibles` : undefined,
        icon: <CheckCircleOutlined className="text-2xl" />,
        gradient: 'from-emerald-400/80 via-emerald-500 to-emerald-700',
      },
      {
        id: 'activation-rate',
        label: 'Taux d\'activation',
        value: `${activationRate}%`,
        helper: disabledCount > 0 ? `${disabledCount} module${disabledCount > 1 ? 's' : ''} à activer` : 'Tous les modules sont actifs',
        icon: <RiseOutlined className="text-2xl" />,
        gradient: 'from-sky-400/80 via-cyan-500 to-blue-700',
      },
      {
        id: 'current-organization',
        label: 'Organisation courante',
        value: currentOrganization?.name ?? 'Aucune',
        helper: currentOrganization ? 'Contexte CRM synchronisé' : 'Sélectionnez une organisation',
        icon: <DeploymentUnitOutlined className="text-2xl" />,
        gradient: 'from-amber-400/80 via-orange-500 to-rose-600',
      },
      {
        id: 'team-access',
        label: 'Utilisateurs connectés',
        value: user?.email ? user.email.split('@')[0] : 'Session active',
        helper: user?.role ? `Rôle: ${user.role}` : 'Profil connecté',
        icon: <TeamOutlined className="text-2xl" />,
        gradient: 'from-purple-400/80 via-fuchsia-500 to-indigo-700',
      },
    ];
  }, [activeModules.length, activationRate, currentOrganization, disabledCount, totalModules, user]);

  return (
    <div className="space-y-8 text-white">
      <section className="space-y-2">
        <p className="text-xs uppercase tracking-[0.45em] text-white/50">
          Vue d'ensemble
        </p>
        <h2 className="text-2xl font-semibold text-white md:text-3xl">
          Pilotage intelligent des modules Oracle
        </h2>
        <p className="max-w-3xl text-sm text-white/60">
          Visualisez en temps réel l'activation de vos modules CRM, repérez les fonctionnalités à activer
          et maintenez l'alignement avec votre organisation.
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {stats.map(stat => (
          <article
            key={stat.id}
            className="
              relative overflow-hidden rounded-3xl
              border border-white/5
              bg-white/10
              p-6
              shadow-[0_18px_40px_rgba(12,29,43,0.45)]
              transition-transform duration-200 hover:-translate-y-1
              backdrop-blur-lg
            "
          >
            <div className="
              absolute inset-0 opacity-20
              bg-gradient-to-br
              pointer-events-none
            "
            style={{ backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.45) 100%)' }}
            />

            <div className={`
              mb-6 inline-flex items-center justify-center
              rounded-2xl border border-white/10
              bg-gradient-to-br ${stat.gradient}
              p-3
              text-white
              shadow-[0_12px_30px_rgba(255,255,255,0.2)]
            `}>
              {stat.icon}
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-white/70">{stat.label}</p>
              <p className="text-3xl font-semibold tracking-tight text-white">{stat.value}</p>
              {stat.helper && (
                <p className="text-xs text-white/50">{stat.helper}</p>
              )}
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_minmax(280px,0.8fr)]">
        <div className="
          space-y-5 rounded-3xl border border-white/5 bg-white/10 p-6
          shadow-[0_24px_60px_rgba(10,24,38,0.45)] backdrop-blur-lg
        ">
          <header className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">Modules priorisés</h3>
              <p className="text-sm text-white/60">
                Focus sur les modules les plus utilisés et ceux à activer en priorité
              </p>
            </div>
            <Tag color="geekblue" className="rounded-full border-0 bg-white/20 text-white">
              {highlightedModules.length} modules
            </Tag>
          </header>

          <div className="space-y-3">
            {highlightedModules.length === 0 && (
              <div className="
                rounded-2xl border border-dashed border-white/20 bg-white/5
                p-6 text-center text-white/60
              ">
                Aucun module n'est disponible pour le moment.
              </div>
            )}

            {highlightedModules.map(module => (
              <div
                key={module.id}
                className="
                  flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4
                  transition-colors duration-200 hover:border-white/30
                  sm:flex-row sm:items-center sm:justify-between
                "
              >
                <div className="space-y-1">
                  <p className="text-base font-medium text-white">{module.title}</p>
                  <p className="text-sm text-white/50">{module.description}</p>
                </div>

                <div className="flex items-center gap-3">
                  <Tag
                    color={module.active ? 'success' : 'default'}
                    className={`rounded-full border-0 ${module.active ? 'bg-emerald-500/20 text-emerald-200' : 'bg-white/10 text-white/70'}`}
                  >
                    {module.active ? 'Actif' : 'À activer'}
                  </Tag>
                  <div className="
                    flex items-center gap-2 rounded-full border border-white/10
                    bg-white/5 px-3 py-1 text-xs text-white/70
                  ">
                    <SlidersOutlined />
                    {module.permissionCount} droit{module.permissionCount > 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="
          space-y-5 rounded-3xl border border-white/5 bg-white/10 p-6
          shadow-[0_24px_60px_rgba(8,22,36,0.45)] backdrop-blur-lg
        ">
          <header className="space-y-2">
            <h3 className="text-xl font-semibold text-white">Taux d'adoption</h3>
            <p className="text-sm text-white/60">
              Mesurez l'implication des équipes et la couverture fonctionnelle.
            </p>
          </header>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
              <Progress
                type="circle"
                percent={activationRate}
                strokeColor={{ from: '#38ef7d', to: '#11998e' }}
                trailColor="rgba(255,255,255,0.1)"
              />
              <p className="mt-3 text-sm text-white/60">
                {activationRate >= 80
                  ? 'Excellent niveau d\'activation des modules.'
                  : activationRate >= 50
                  ? 'Activation en progression, continuez vos efforts.'
                  : 'Activez davantage de modules pour profiter pleinement de la plateforme.'}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <AppstoreOutlined className="text-xl text-white/70" />
                <div className="text-sm">
                  <p className="font-medium text-white">Modules disponibles</p>
                  <p className="text-white/60">{totalModules} fonctionnalités détectées</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <CheckCircleOutlined className="text-xl text-white/70" />
                <div className="text-sm">
                  <p className="font-medium text-white">Modules actifs</p>
                  <p className="text-white/60">{activeModules.length} modules prêts à l'emploi</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <DeploymentUnitOutlined className="text-xl text-white/70" />
                <div className="text-sm">
                  <p className="font-medium text-white">Organisation</p>
                  <p className="text-white/60">{currentOrganization?.name ?? 'À définir'}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
};

export default OracleNewDashboard;
