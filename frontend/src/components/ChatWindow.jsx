import { useEffect, useRef } from 'react';
import TakeoverToggle from './TakeoverToggle';
import MessageBubble from './MessageBubble';

export default function ChatWindow({ lead, messages, loading, onTakeoverUpdated }) {
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (!lead) {
    return (
      <div className="chat-container">
        <div className="empty-state">
          <div className="empty-state-icon">💬</div>
          <h3>No Conversation Selected</h3>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
            Choose a lead from the sidebar or send a message using the test panel below.
          </p>
        </div>
      </div>
    );
  }

  const isTakeoverActive = Boolean(lead.humanTakeover);

  return (
    <div className="chat-container">
      {/* CHAT HEADER */}
      <div className="chat-header">
        <div className="chat-lead-meta">
          <div className="lead-avatar" style={{ width: 36, height: 36, fontSize: '0.85rem' }}>
            {(lead.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="chat-lead-name">{lead.name || 'Unknown Lead'}</div>
            <div className="chat-lead-phone">{lead.phone}</div>
          </div>
        </div>

        <TakeoverToggle lead={lead} onToggleSuccess={onTakeoverUpdated} />
      </div>

      {/* HUMAN TAKEOVER BANNER */}
      {isTakeoverActive && (
        <div className="takeover-banner">
          <span>⚠️ AI paused: human is handling this chat</span>
          <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>Incoming messages will NOT trigger AI replies</span>
        </div>
      )}

      {/* MESSAGES LIST */}
      <div className="messages-viewport">
        {loading && messages.length === 0 ? (
          <div className="empty-state">
            <span className="spinner" style={{ width: 24, height: 24 }}></span>
            <p style={{ marginTop: '0.75rem' }}>Loading conversation history...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <h4>No messages in this chat yet</h4>
            <p style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>
              Send a test message below to start the conversation with the AI.
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble
                key={msg._id || msg.waMessageId}
                message={msg}
                leadName={lead.name}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
    </div>
  );
}
