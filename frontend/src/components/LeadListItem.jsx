function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function LeadListItem({ lead, isSelected, onSelect }) {
  const initial = (lead.name || 'U').charAt(0).toUpperCase();
  const timeAgo = formatRelativeTime(lead.lastMessageAt || lead.updatedAt);
  const preview = lead.lastMessageText || 'No messages yet';

  return (
    <div
      className={`lead-item ${isSelected ? 'active' : ''}`}
      onClick={() => onSelect(lead)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect(lead);
      }}
    >
      <div className="lead-avatar">{initial}</div>

      <div className="lead-info">
        <div className="lead-row-top">
          <span className="lead-name">{lead.name || 'Unknown Lead'}</span>
          <span className="lead-time">{timeAgo}</span>
        </div>

        <div className="lead-row-bottom">
          <span className="lead-preview">{preview}</span>
          {lead.humanTakeover && (
            <span className="lead-takeover-tag" title="AI is paused for this lead">
              Human
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
