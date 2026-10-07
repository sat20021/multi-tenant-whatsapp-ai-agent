import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api/client';
import Header from './Header';
import LeadList from './LeadList';
import ChatWindow from './ChatWindow';
import TestMessagePanel from './TestMessagePanel';

const POLL_INTERVAL_MS = 3000;

export default function Dashboard({ user, tenant, onLogout }) {
  const [leads, setLeads] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Keep a ref of selectedLeadId so interval callback doesn't have stale closure
  const selectedLeadIdRef = useRef(selectedLeadId);
  useEffect(() => {
    selectedLeadIdRef.current = selectedLeadId;
  }, [selectedLeadId]);

  // Fetch all leads for this tenant
  const fetchLeads = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoadingLeads(true);
      const data = await api.getLeads();
      setLeads(data || []);

      // If no lead selected yet and we have leads, auto-select the first one
      if (isInitial && data && data.length > 0 && !selectedLeadIdRef.current) {
        setSelectedLeadId(data[0]._id);
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      if (isInitial) setLoadingLeads(false);
    }
  }, []);

  // Fetch messages for active lead
  const fetchMessages = useCallback(async (leadId, isInitial = false) => {
    if (!leadId) {
      setMessages([]);
      return;
    }
    try {
      if (isInitial) setLoadingMessages(true);
      const data = await api.getLeadMessages(leadId);
      setMessages(data.messages || []);
    } catch (err) {
      console.error(`Error fetching messages for lead ${leadId}:`, err);
    } finally {
      if (isInitial) setLoadingMessages(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchLeads(true);
  }, [fetchLeads]);

  // When selected lead changes, fetch messages with loading state
  useEffect(() => {
    if (selectedLeadId) {
      fetchMessages(selectedLeadId, true);
    } else {
      setMessages([]);
    }
  }, [selectedLeadId, fetchMessages]);

  // Set up 3-second live polling without page reload
  useEffect(() => {
    const timer = setInterval(() => {
      fetchLeads(false);
      const currentLeadId = selectedLeadIdRef.current;
      if (currentLeadId) {
        fetchMessages(currentLeadId, false);
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [fetchLeads, fetchMessages]);

  const handleSelectLead = (lead) => {
    setSelectedLeadId(lead._id);
  };

  const handleTakeoverUpdated = (updatedLead) => {
    // Update active lead in state
    setLeads((prev) =>
      prev.map((l) => (l._id === updatedLead._id ? { ...l, humanTakeover: updatedLead.humanTakeover } : l))
    );
  };

  const handleMessageSent = () => {
    // Immediately poll leads & messages after sending
    fetchLeads(false);
    if (selectedLeadIdRef.current) {
      fetchMessages(selectedLeadIdRef.current, false);
    }
  };

  const selectedLead = leads.find((l) => l._id === selectedLeadId) || null;

  return (
    <div className="dashboard-root">
      <Header user={user} tenant={tenant} onLogout={onLogout} />

      <main className="dashboard-main">
        <LeadList
          leads={leads}
          selectedLeadId={selectedLeadId}
          onSelectLead={handleSelectLead}
          loading={loadingLeads}
        />

        <ChatWindow
          lead={selectedLead}
          messages={messages}
          loading={loadingMessages}
          onTakeoverUpdated={handleTakeoverUpdated}
        />
      </main>

      <TestMessagePanel
        selectedLead={selectedLead}
        onMessageSent={handleMessageSent}
      />
    </div>
  );
}
