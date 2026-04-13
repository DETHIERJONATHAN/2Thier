import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Avatar, Button, Empty, Spin, Tabs, message, Modal } from 'antd';
import { StopOutlined, UserOutlined, TeamOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

interface BlockedUser {
  friendshipId: string;
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  email: string;
  blockedAt: string;
}

interface BlockedOrg {
  blockId: string;
  id: string;
  name: string;
  avatarUrl: string | null;
  blockedAt: string;
  reason: string | null;
}

const BlockedSettings: React.FC = () => {
  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [blockedOrgs, setBlockedOrgs] = useState<BlockedOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  const fetchBlocked = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, orgsRes]: unknown[] = await Promise.all([
        api.get('/api/friends/blocked'),
        api.get('/api/friends/blocked-orgs'),
      ]);
      setBlockedUsers(usersRes?.blockedUsers || []);
      setBlockedOrgs(orgsRes?.blockedOrgs || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { fetchBlocked(); }, [fetchBlocked]);

  const handleUnblockUser = (user: BlockedUser) => {
    Modal.confirm({
      title: `Débloquer ${user.firstName} ${user.lastName} ?`,
      content: 'Cette personne pourra à nouveau voir vos publications et vous contacter.',
      okText: 'Débloquer',
      cancelText: 'Annuler',
      onOk: async () => {
        setUnblocking(user.id);
        try {
          await api.post('/api/friends/unblock-user', { userId: user.id });
          setBlockedUsers(prev => prev.filter(u => u.id !== user.id));
          message.success(`${user.firstName} ${user.lastName} débloqué(e)`);
        } catch {
          message.error('Erreur lors du déblocage');
        } finally {
          setUnblocking(null);
        }
      },
    });
  };

  const handleUnblockOrg = (org: BlockedOrg) => {
    Modal.confirm({
      title: `Débloquer la Colony « ${org.name} » ?`,
      content: 'Les contenus de cette Colony réapparaîtront dans votre fil.',
      okText: 'Débloquer',
      cancelText: 'Annuler',
      onOk: async () => {
        setUnblocking(org.id);
        try {
          await api.post('/api/friends/unblock-org', { organizationId: org.id });
          setBlockedOrgs(prev => prev.filter(o => o.id !== org.id));
          message.success(`Colony « ${org.name} » débloquée`);
        } catch {
          message.error('Erreur lors du déblocage');
        } finally {
          setUnblocking(null);
        }
      },
    });
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spin size="large" /></div>;
  }

  const renderUserItem = (user: BlockedUser) => (
    <div key={user.id} style={{
      display: 'flex', alignItems: 'center', padding: '12px 16px',
      borderBottom: '1px solid #f0f0f0', gap: 12,
    }}>
      <Avatar src={user.avatarUrl} icon={<UserOutlined />} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{user.firstName} {user.lastName}</div>
        <div style={{ fontSize: 12, color: '#65676B' }}>{user.email}</div>
        <div style={{ fontSize: 11, color: '#8c8c8c' }}>
          Bloqué le {new Date(user.blockedAt).toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>
      <Button
        size="small"
        loading={unblocking === user.id}
        onClick={() => handleUnblockUser(user)}
      >
        Débloquer
      </Button>
    </div>
  );

  const renderOrgItem = (org: BlockedOrg) => (
    <div key={org.id} style={{
      display: 'flex', alignItems: 'center', padding: '12px 16px',
      borderBottom: '1px solid #f0f0f0', gap: 12,
    }}>
      <Avatar src={org.avatarUrl} icon={<TeamOutlined />} size={44} style={{ background: '#722ed1' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{org.name}</div>
        {org.reason && <div style={{ fontSize: 12, color: '#65676B' }}>{org.reason}</div>}
        <div style={{ fontSize: 11, color: '#8c8c8c' }}>
          Bloquée le {new Date(org.blockedAt).toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>
      <Button
        size="small"
        loading={unblocking === org.id}
        onClick={() => handleUnblockOrg(org)}
      >
        Débloquer
      </Button>
    </div>
  );

  return (
    <div style={{ maxWidth: 600 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
        <StopOutlined style={{ marginRight: 8 }} />
        Blocages
      </h2>
      <p style={{ color: '#65676B', fontSize: 13, marginBottom: 16 }}>
        Gérez les personnes et les Colonies que vous avez bloquées.
      </p>

      <Tabs
        defaultActiveKey="users"
        items={[
          {
            key: 'users',
            label: `Personnes (${blockedUsers.length})`,
            children: blockedUsers.length > 0
              ? <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden' }}>{blockedUsers.map(renderUserItem)}</div>
              : <Empty description="Aucune personne bloquée" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
          },
          {
            key: 'orgs',
            label: `Colonies (${blockedOrgs.length})`,
            children: blockedOrgs.length > 0
              ? <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden' }}>{blockedOrgs.map(renderOrgItem)}</div>
              : <Empty description="Aucune Colony bloquée" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
          },
        ]}
      />
    </div>
  );
};

export default BlockedSettings;
