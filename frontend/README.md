# AlgoTrade Platform — Phase 4 Frontend (Complete)

## What is new in Phase 4

### User portal — 6 new screens
| File | Screen |
|------|--------|
| pages/user/UserLayout.jsx | User layout — sidebar + realtime toast watcher |
| pages/user/UserDashboard.jsx | Dashboard — P&L, positions, strategies, brokers |
| pages/user/ChartsPage.jsx | Live charts — area chart, timeframes, watchlist |
| pages/user/OrderPage.jsx | Manual trading — instrument search, BUY/SELL, order book |
| pages/user/StrategiesPage.jsx | My strategies — assigned list, paper/live toggle |
| pages/user/TradeHistoryPage.jsx | Trade history — ALGO/MANUAL labels, filters, CSV |
| pages/user/UserBrokersPage.jsx | Broker connect — Angel One manual, Zerodha OAuth |

### New shared components
| File | What it does |
|------|-------------|
| components/common/UserSidebar.jsx | User sidebar with plan badge and trading mode |
| services/userApi.js | All user-facing API calls |

### Backend additions
| File | Routes |
|------|--------|
| routes/user/dashboard.js | GET /api/user/dashboard, /positions, /holdings |
| routes/user/orders.js | GET + POST + DELETE /api/user/orders |
| routes/user/trades.js | GET /api/user/trades |
| routes/user/strategies.js | GET + PUT /api/user/strategies |
| routes/user/brokers.js | GET + POST + DELETE /api/user/brokers |
| routes/user/candles.js | GET /api/user/candles |

---

## Complete project setup

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env
# fill in all values

node src/scripts/seedAdmin.js
node src/scripts/seedStrategies.js

npm run dev
# runs on http://localhost:5000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
# runs on http://localhost:3000
```

### 3. Login
- Admin:    admin@algotrade.com / Admin@1234 (change after first login)
- SubAdmin: create from admin panel
- User:     create from admin panel

---

## Complete route map

### Admin portal (/admin/...)
| Path | Screen |
|------|--------|
| /admin | Dashboard |
| /admin/users | User management |
| /admin/subadmins | SubAdmin management (admin only) |
| /admin/strategies | Strategy assignment |
| /admin/trade | Place trade on behalf of user |
| /admin/brokers | Broker key management |
| /admin/pnl | Global P&L monitor |
| /admin/audit | Audit log |

### User portal (/dashboard/...)
| Path | Screen |
|------|--------|
| /dashboard | My dashboard |
| /dashboard/charts | Live charts |
| /dashboard/order | Place order |
| /dashboard/strategies | My strategies |
| /dashboard/history | Trade history |
| /dashboard/brokers | Broker connections |

---

## Key design decisions from our planning

1. Trade labels — users ALWAYS see only ALGO or MANUAL. Admin/subadmin trades show as ALGO.
2. Data isolation — every user API route filters by req.actor._id. Users never see each other's data.
3. SubAdmin access control — sidebar hides items based on permissions returned at login.
4. Socket.io — UserLayout watches lastOrder and lastSignal and shows toasts automatically.
5. Live charts — use admin's Angel One token (market data account), not user's token.
6. Paper mode — shown in sidebar badge and on order form. All orders tagged isPaper: true.
7. CSV download — client-side, no extra API needed.

---

## Phase 5 (next)
- Production security hardening (rate limiting, helmet, input sanitisation)
- Docker + deployment config
- Error monitoring
- Load testing
