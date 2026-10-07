# DigitalOneBox — WhatsApp AI Dashboard (Frontend)

The official web dashboard for the Multi-Tenant WhatsApp AI Sales Agent platform.

Powered by **[DigitalOneBox](https://digitalonebox.com/)**.

---

## 🚀 Features

- **Branded Dual-Column Login:** Modern showcase layout featuring DigitalOneBox visual identity and 1-click evaluation demo buttons.
- **Tenant Scoped Leads List:** Real-time search, lead preview, and time-ago indicator.
- **Interactive Chat Console:** Customer messages (left) and AI responses (right) with latency tags (`replied in X.Xs`) and sender badges (`AI`, `Fallback`, `Human`).
- **Human Takeover Switch (AI ON/OFF):** Instant takeover toggle with alert banner.
- **Customer Simulator Test Panel:** Docked bottom bar sending Meta-format customer payloads directly through the webhook pipeline.
- **Live 3-Second Polling:** Silent background polling without page reloads.
- **httpOnly JWT Authentication:** Secure session persistence checking `GET /api/auth/me` on startup.

---

## 🛠️ Getting Started

```bash
# 1. Install Dependencies
npm install

# 2. Run Development Server (Port 5173)
npm run dev

# 3. Build for Production
npm run build
```

---

## 🔑 Demo Credentials

- **Sunrise Realty:** `owner@sunrise.test` / `Sunrise@123`
- **FitZone Gym:** `owner@fitzone.test` / `FitZone@123`
