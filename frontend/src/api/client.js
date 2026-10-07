/**
 * API client for WhatsApp Multi-Tenant AI Dashboard.
 *
 * All requests include credentials: 'include' for httpOnly cookie authentication.
 * Never supplies or allows input of accountId: tenant scoping is enforced exclusively
 * by the backend JWT session.
 */

const BASE_URL = import.meta.env.VITE_API_URL || '';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, config);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.error?.message || data?.message || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.code = data?.error?.code || 'UNKNOWN_ERROR';
    throw error;
  }

  return data;
}

export const api = {
  // Authentication
  async login(email, password) {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    return res.data;
  },

  async getMe() {
    const res = await request('/api/auth/me', {
      method: 'GET',
    });
    return res.data;
  },

  async logout() {
    const res = await request('/api/auth/logout', {
      method: 'POST',
    });
    return res.data;
  },

  // Leads
  async getLeads() {
    const res = await request('/api/leads', {
      method: 'GET',
    });
    return res.data || [];
  },

  async getLeadMessages(leadId) {
    const res = await request(`/api/leads/${leadId}/messages`, {
      method: 'GET',
    });
    return res.data || { lead: null, messages: [] };
  },

  async updateTakeover(leadId, enabled) {
    const res = await request(`/api/leads/${leadId}/takeover`, {
      method: 'PATCH',
      body: { enabled },
    });
    return res.data;
  },

  // Dev simulation message
  async simulateCustomerMessage({ leadPhone, leadName, text }) {
    const res = await request('/api/dev/simulate-message', {
      method: 'POST',
      body: { leadPhone, leadName, text },
    });
    return res.data;
  },
};
