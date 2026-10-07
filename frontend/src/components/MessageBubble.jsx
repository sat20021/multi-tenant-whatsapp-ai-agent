export default function MessageBubble({ message, leadName }) {
  const isIncoming = message.direction === 'in';
  const sender = message.sender || (isIncoming ? 'lead' : 'ai');
  const latencySec =
    typeof message.latencyMs === 'number' && message.latencyMs > 0
      ? (message.latencyMs / 1000).toFixed(1)
      : null;

  const formattedTime = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '';

  return (
    <div
      className={`message-group ${isIncoming ? 'incoming' : 'outgoing'} ${
        sender === 'fallback' ? 'fallback' : ''
      }`}
    >
      <div className="message-bubble">
        {message.text}
      </div>

      <div className="message-meta">
        {isIncoming ? (
          <>
            <span>{leadName || 'Customer'}</span>
            <span>·</span>
            <span>{formattedTime}</span>
          </>
        ) : (
          <>
            <span>{formattedTime}</span>
            <span>·</span>
            <span className={`badge-sender ${sender}`}>
              {sender === 'ai' && '🤖 AI'}
              {sender === 'fallback' && '⚠️ Fallback'}
              {sender === 'human' && '👤 Human'}
            </span>
            {latencySec && (
              <>
                <span>·</span>
                <span className="latency-tag">replied in {latencySec}s</span>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
