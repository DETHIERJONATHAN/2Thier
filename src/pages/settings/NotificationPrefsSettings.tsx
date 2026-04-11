/**
 * NotificationPrefsSettings — Per-user notification preferences
 * Uses: GET/PUT /api/notification-preferences
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Card, Switch, Typography, Spin, message, Select, TimePicker, Divider, Alert } from 'antd';
import { BellOutlined, MailOutlined, MobileOutlined, AppstoreOutlined, StopOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

function useScreenSize() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return { width: w, isMobile: w < 768 };
}

interface NotificationPrefs {
  pushNewPost: boolean; pushComment: boolean; pushReaction: boolean;
  pushNewFollower: boolean; pushFriendRequest: boolean; pushMention: boolean;
  pushWhisper: boolean; pushWaxAlert: boolean; pushBusinessEvent: boolean;
  pushCalendarReminder: boolean;
  emailNewPost: boolean; emailComment: boolean; emailReaction: boolean;
  emailNewFollower: boolean; emailFriendRequest: boolean; emailMention: boolean;
  emailWhisper: boolean; emailWaxAlert: boolean; emailBusinessEvent: boolean;
  emailCalendarReminder: boolean;
  emailDigestFrequency: string;
  inAppNewPost: boolean; inAppComment: boolean; inAppReaction: boolean;
  inAppNewFollower: boolean; inAppFriendRequest: boolean; inAppMention: boolean;
  inAppWhisper: boolean; inAppWaxAlert: boolean; inAppBusinessEvent: boolean;
  inAppCalendarReminder: boolean;
  doNotDisturb: boolean;
  doNotDisturbStart: string | null;
  doNotDisturbEnd: string | null;
}

const EVENT_TYPES = [
  { key: 'NewPost', icon: '📝' },
  { key: 'Comment', icon: '💬' },
  { key: 'Reaction', icon: '👍' },
  { key: 'NewFollower', icon: '👤' },
  { key: 'FriendRequest', icon: '🤝' },
  { key: 'Mention', icon: '@' },
  { key: 'Whisper', icon: '🤫' },
  { key: 'WaxAlert', icon: '📍' },
  { key: 'BusinessEvent', icon: '💼' },
  { key: 'CalendarReminder', icon: '📅' },
] as const;

const NotificationPrefsSettings: React.FC = () => {
  const { t } = useTranslation();
  const { isMobile } = useScreenSize();
  const apiHook = useAuthenticatedApi();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const api = useMemo(() => apiHook, []);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.api.get('/api/notification-preferences');
        setPrefs(data);
      } catch {
        message.error(t('common.error'));
      } finally {
        setLoading(false);
      }
    })();
  }, [api, t]);

  const updatePref = async (key: string, value: boolean | string | null) => {
    if (!prefs) return;
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    setSaving(true);
    try {
      await api.api.put('/api/notification-preferences', { [key]: value });
    } catch {
      message.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spin style={{ display: 'block', textAlign: 'center', padding: 40 }} />;
  if (!prefs) return <Alert type="error" message={t('common.error')} />;

  const channels = [
    { prefix: 'push', label: t('notifications.push'), icon: <MobileOutlined /> },
    { prefix: 'email', label: t('notifications.email'), icon: <MailOutlined /> },
    { prefix: 'inApp', label: t('notifications.inApp'), icon: <AppstoreOutlined /> },
  ];

  return (
    <div style={{ maxWidth: 700, padding: isMobile ? '12px 0' : '16px 0', width: '100%' }}>
      <Title level={4}><BellOutlined /> {t('notifications.prefsTitle')}</Title>

      {/* DND */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text strong><StopOutlined /> {t('notifications.dnd')}</Text>
          <Switch checked={prefs.doNotDisturb} onChange={v => updatePref('doNotDisturb', v)} loading={saving} />
        </div>
        {prefs.doNotDisturb && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <Text type="secondary">{t('notifications.dndFrom')}</Text>
            <TimePicker
              format="HH:mm"
              value={prefs.doNotDisturbStart ? dayjs(prefs.doNotDisturbStart, 'HH:mm') : null}
              onChange={(_, str) => updatePref('doNotDisturbStart', str as string || null)}
            />
            <Text type="secondary">{t('notifications.dndTo')}</Text>
            <TimePicker
              format="HH:mm"
              value={prefs.doNotDisturbEnd ? dayjs(prefs.doNotDisturbEnd, 'HH:mm') : null}
              onChange={(_, str) => updatePref('doNotDisturbEnd', str as string || null)}
            />
          </div>
        )}
      </Card>

      {/* Email digest */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text strong><MailOutlined /> {t('notifications.digestFrequency')}</Text>
          <Select
            value={prefs.emailDigestFrequency}
            style={{ width: 160 }}
            onChange={v => updatePref('emailDigestFrequency', v)}
            options={[
              { value: 'none', label: t('notifications.digestNone') },
              { value: 'instant', label: t('notifications.digestInstant') },
              { value: 'daily', label: t('notifications.digestDaily') },
              { value: 'weekly', label: t('notifications.digestWeekly') },
            ]}
          />
        </div>
      </Card>

      <Divider />

      {/* Matrix: events x channels */}
      <Card size="small" style={{ overflowX: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr repeat(3, 56px)' : '1fr repeat(3, 80px)', gap: 8, marginBottom: 12, textAlign: 'center', minWidth: isMobile ? 280 : 'auto' }}>
          <div />
          {channels.map(ch => (
            <Text key={ch.prefix} type="secondary" style={{ fontSize: isMobile ? 10 : 12 }}>{ch.icon} {isMobile ? '' : ch.label}</Text>
          ))}
        </div>

        {/* Rows */}
        {EVENT_TYPES.map(evt => (
          <div key={evt.key} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr repeat(3, 56px)' : '1fr repeat(3, 80px)', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f0f0f0', minWidth: isMobile ? 280 : 'auto' }}>
            <Text>{evt.icon} {t(`notifications.event_${evt.key}`)}</Text>
            {channels.map(ch => {
              const prefKey = `${ch.prefix}${evt.key}` as keyof NotificationPrefs;
              return (
                <div key={ch.prefix} style={{ textAlign: 'center' }}>
                  <Switch
                    size="small"
                    checked={prefs[prefKey] as boolean}
                    onChange={v => updatePref(prefKey, v)}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </Card>
    </div>
  );
};

export default NotificationPrefsSettings;
