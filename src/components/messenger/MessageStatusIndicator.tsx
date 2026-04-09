/**
 * ✅ MessageStatusIndicator — Shows sent/delivered/read status for messages
 * Single check ✓ = sent, double check ✓✓ = delivered, blue double check = read
 */
import React from 'react';

interface MessageStatusProps {
  status: 'sent' | 'delivered' | 'read';
  isOwnMessage: boolean;
}

export const MessageStatusIndicator: React.FC<MessageStatusProps> = ({ status, isOwnMessage }) => {
  if (!isOwnMessage) return null;

  const iconStyle = {
    fontSize: 12,
    marginLeft: 4,
  };

  switch (status) {
    case 'sent':
      return (
        <span title="Envoyé" style={{ ...iconStyle, color: '#8899a6' }}>
          ✓
        </span>
      );
    case 'delivered':
      return (
        <span title="Reçu" style={{ ...iconStyle, color: '#8899a6' }}>
          ✓✓
        </span>
      );
    case 'read':
      return (
        <span title="Lu" style={{ ...iconStyle, color: '#4fc3f7' }}>
          ✓✓
        </span>
      );
    default:
      return null;
  }
};

export default MessageStatusIndicator;
