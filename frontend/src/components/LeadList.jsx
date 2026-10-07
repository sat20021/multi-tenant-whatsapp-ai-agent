import { useState, useMemo } from 'react';
import LeadListItem from './LeadListItem';

export default function LeadList({ leads, selectedLeadId, onSelectLead, loading }) {
  const [filterQuery, setFilterQuery] = useState('');

  const filteredLeads = useMemo(() => {
    if (!filterQuery.trim()) return leads;
    const q = filterQuery.toLowerCase().trim();
    return leads.filter(
      (l) =>
        (l.name && l.name.toLowerCase().includes(q)) ||
        (l.phone && l.phone.toLowerCase().includes(q)) ||
        (l.lastMessageText && l.lastMessageText.toLowerCase().includes(q))
    );
  }, [leads, filterQuery]);

  return (
    <aside className="leads-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">
          <span>Leads</span>
          <span className="leads-count-badge">{leads.length}</span>
        </div>
      </div>

      <div style={{ padding: '0 1.25rem 0.75rem' }}>
        <input
          type="text"
          className="leads-filter-input"
          placeholder="Search by name, phone..."
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
        />
      </div>

      <div className="leads-list">
        {loading && leads.length === 0 ? (
          <div className="empty-state" style={{ padding: '3rem 1rem' }}>
            <span className="spinner" style={{ width: 20, height: 20 }}></span>
            <p style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>Fetching leads...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="empty-state" style={{ padding: '3rem 1rem' }}>
            <div className="empty-state-icon">👥</div>
            <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>
              {leads.length === 0 ? 'No leads yet' : 'No matching leads'}
            </p>
            <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
              {leads.length === 0
                ? 'Send a message via the test panel below to create your first lead.'
                : 'Try adjusting your search query.'}
            </p>
          </div>
        ) : (
          filteredLeads.map((lead) => (
            <LeadListItem
              key={lead._id}
              lead={lead}
              isSelected={lead._id === selectedLeadId}
              onSelect={onSelectLead}
            />
          ))
        )}
      </div>
    </aside>
  );
}
