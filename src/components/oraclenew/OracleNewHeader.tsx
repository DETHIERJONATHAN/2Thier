import React, { useMemo } from 'react';
import { Badge, Avatar, Tooltip } from 'antd';
import {
  BellOutlined,
  SearchOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/auth/useAuth';

const OracleNewHeader: React.FC = () => {
  const { user, currentOrganization } = useAuth();

  const userName = useMemo(() => {
    if (!user) {
      return 'Utilisateur';
    }

    const displayName = [user.firstName, user.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    return displayName || user.email || 'Utilisateur';
  }, [user]);

  const organizationLabel = currentOrganization?.name ?? 'Organisation active';

  const initials = useMemo(() => {
    const source = userName || '';
    const segments = source.split(' ').filter(Boolean);

    if (segments.length === 0) {
      return '??';
    }

    if (segments.length === 1) {
      return segments[0].slice(0, 2).toUpperCase();
    }

    return `${segments[0][0] ?? ''}${segments[1][0] ?? ''}`.toUpperCase();
  }, [userName]);

  return (
    <header className="
      flex flex-col
      gap-4
      md:flex-row md:items-center
      rounded-3xl
      border border-white/5
      bg-white/10
      px-6 py-5
      backdrop-blur-lg
      text-white
      shadow-[0_20px_60px_rgba(8,26,40,0.35)]
    ">
      <div className="flex items-center gap-4">
        <div className="
          flex h-12 w-12 items-center justify-center
          rounded-2xl
          bg-gradient-to-br from-[#F37335] via-[#FDC830] to-[#C06C84]
          shadow-[0_8px_20px_rgba(243,115,53,0.45)]
        ">
          <ThunderboltOutlined className="text-2xl text-white" />
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">
            Oracle Workspace
          </p>
          <h1 className="text-lg font-semibold text-white sm:text-xl">
            {organizationLabel}
          </h1>
          <p className="text-sm text-white/60">
            Pilotage intelligent des modules et expériences utilisateurs
          </p>
        </div>
      </div>

      <div className="
        flex-1
        md:ml-8
        flex flex-col gap-3
        sm:flex-row sm:items-center
      ">
        <div className="
          group flex flex-1 items-center
          rounded-2xl border border-white/10
          bg-white/5
          transition-all duration-200
          focus-within:border-white/40 focus-within:bg-white/10
        ">
          <SearchOutlined className="ml-4 text-lg text-white/50 transition-colors duration-200 group-focus-within:text-white/80" />
          <input
            type="search"
            placeholder="Rechercher une ressource, un module ou un membre"
            className="
              flex-1
              border-0 bg-transparent
              px-4 py-2.5
              text-sm text-white placeholder-white/50
              outline-none
            "
          />
        </div>

        <div className="flex items-center gap-3 sm:justify-end">
          <Tooltip title="Notifications">
            <Badge dot offset={[-2, 4]} className="text-white/70">
              <button
                type="button"
                className="
                  flex h-11 w-11 items-center justify-center
                  rounded-2xl border border-white/10 bg-white/5
                  text-white/70 transition-all duration-200
                  hover:border-white/40 hover:bg-white/10 hover:text-white
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/60 focus-visible:ring-offset-[#2B3E49]
                "
              >
                <BellOutlined className="text-lg" />
              </button>
            </Badge>
          </Tooltip>

          <Tooltip title={userName}>
            <Avatar
              size={44}
              style={{
                background: 'linear-gradient(135deg, #F37335 0%, #FDC830 50%, #C06C84 100%)',
                color: '#fff',
                fontWeight: 600,
              }}
            >
              {initials}
            </Avatar>
          </Tooltip>
        </div>
      </div>
    </header>
  );
};

export default OracleNewHeader;
