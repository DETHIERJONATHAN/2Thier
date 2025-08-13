import React, { useState, useEffect } from 'react';
import { Card, List, Button, Space, Tag, Avatar, Tooltip, Empty } from 'antd';
import { CalendarOutlined, UserOutlined, PlusOutlined, VideoLinkIcon } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useCalendarIntegration, CalendarEvent } from '../services/CalendarIntegrationService';
import CreateMeetingModal from './CreateMeetingModal';

interface ProjectMeetingsProps {
  projectId: string;
  projectName: string;
  clientEmail?: string;
}

const ProjectMeetings: React.FC<ProjectMeetingsProps> = ({ 
  projectId, 
  projectName, 
  clientEmail 
}) => {
  const [meetings, setMeetings] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { getProjectMeetings } = useCalendarIntegration();

  useEffect(() => {
    loadMeetings();
  }, [projectId]);

  const loadMeetings = async () => {
    try {
      setLoading(true);
      const projectMeetings = await getProjectMeetings(projectId);
      setMeetings(projectMeetings);
    } catch (error) {
      console.error('Erreur chargement RDV:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMeetingCreated = (newMeeting: CalendarEvent) => {
    setMeetings(prev => [newMeeting, ...prev]);
    setShowCreateModal(false);
  };

  const getMeetingTypeColor = (type: CalendarEvent['meetingType']) => {
    const colors = {
      client: 'blue',
      internal: 'green',
      demo: 'purple',
      followup: 'orange'
    };
    return colors[type] || 'default';
  };

  const getMeetingTypeIcon = (type: CalendarEvent['meetingType']) => {
    const icons = {
      client: '🤝',
      internal: '👥',
      demo: '💻',
      followup: '📞'
    };
    return icons[type] || '📅';
  };

  return (
    <Card
      title={
        <Space>
          <CalendarOutlined />
          Rendez-vous - {projectName}
        </Space>
      }
      extra={
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => setShowCreateModal(true)}
        >
          Nouveau RDV
        </Button>
      }
    >
      {meetings.length === 0 ? (
        <Empty 
          description="Aucun rendez-vous planifié"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setShowCreateModal(true)}
          >
            Planifier le premier RDV
          </Button>
        </Empty>
      ) : (
        <List
          loading={loading}
          dataSource={meetings}
          renderItem={(meeting) => (
            <List.Item
              actions={[
                meeting.meetingLink && (
                  <Tooltip title="Rejoindre la réunion">
                    <Button 
                      type="link" 
                      icon={<VideoLinkIcon />}
                      href={meeting.meetingLink}
                      target="_blank"
                    >
                      Meet
                    </Button>
                  </Tooltip>
                ),
                <Button type="link">Modifier</Button>,
                <Button type="link" danger>Supprimer</Button>
              ].filter(Boolean)}
            >
              <List.Item.Meta
                avatar={
                  <Avatar style={{ backgroundColor: getMeetingTypeColor(meeting.meetingType) }}>
                    {getMeetingTypeIcon(meeting.meetingType)}
                  </Avatar>
                }
                title={
                  <Space>
                    <span>{meeting.title}</span>
                    <Tag color={getMeetingTypeColor(meeting.meetingType)}>
                      {meeting.meetingType}
                    </Tag>
                  </Space>
                }
                description={
                  <div>
                    <div>
                      📅 {dayjs(meeting.start).format('DD/MM/YYYY à HH:mm')} - {dayjs(meeting.end).format('HH:mm')}
                    </div>
                    {meeting.location && (
                      <div>📍 {meeting.location}</div>
                    )}
                    {meeting.attendees.length > 0 && (
                      <div>
                        👥 {meeting.attendees.length} participant(s): {meeting.attendees.join(', ')}
                      </div>
                    )}
                    {meeting.description && (
                      <div className="mt-2 text-gray-600">
                        {meeting.description}
                      </div>
                    )}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}

      <CreateMeetingModal
        visible={showCreateModal}
        onCancel={() => setShowCreateModal(false)}
        onSuccess={handleMeetingCreated}
        projectId={projectId}
        prefilledData={{
          title: `Rendez-vous ${projectName}`,
          attendees: clientEmail ? [clientEmail] : [],
          meetingType: 'client'
        }}
      />
    </Card>
  );
};

export default ProjectMeetings;
