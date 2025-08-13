import React, { useState } from 'react';
import { Card, Input, Button, List, Avatar } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface LeadNotesProps {
  leadId?: string;
}

export const LeadNotes: React.FC<LeadNotesProps> = ({ leadId }) => {
  const [newNote, setNewNote] = useState('');
  const [notes, setNotes] = useState([
    {
      id: 1,
      content: 'Client très intéressé par nos services. Demande un devis détaillé.',
      author: 'Jonathan',
      date: '2024-01-15 10:35',
      type: 'call'
    },
    {
      id: 2,
      content: 'Email de suivi envoyé avec documentation complète.',
      author: 'Jonathan',
      date: '2024-01-14 16:50',
      type: 'email'
    }
  ]);

  const handleAddNote = () => {
    if (newNote.trim()) {
      const note = {
        id: Date.now(),
        content: newNote,
        author: 'Jonathan', // À récupérer du contexte utilisateur
        date: new Date().toLocaleString(),
        type: 'manual'
      };
      setNotes([note, ...notes]);
      setNewNote('');
    }
  };

  return (
    <Card title="Notes internes">
      <div className="space-y-4">
        {/* Ajouter une nouvelle note */}
        <div className="space-y-2">
          <TextArea
            placeholder="Ajouter une note (obligatoire après appel)..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={3}
          />
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleAddNote}
            disabled={!newNote.trim()}
          >
            Ajouter la note
          </Button>
        </div>

        {/* Liste des notes */}
        <List
          itemLayout="horizontal"
          dataSource={notes}
          renderItem={(note) => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar size="small">{note.author[0]}</Avatar>}
                title={
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{note.author}</span>
                    <span className="text-xs text-gray-400">{note.date}</span>
                  </div>
                }
                description={note.content}
              />
            </List.Item>
          )}
        />
      </div>
    </Card>
  );
};
