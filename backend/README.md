# AlgoTrade Platform — Phase 2 Backend

Phase 2 adds the live trading engine on top of Phase 1's foundation.
The server now connects to Angel One WebSocket, builds candles, runs
strategies, executes orders, and pushes real-time updates to the frontend.

---

## What is new in Phase 2

| File | What it does |
|------|--------------|
| src/marketdata/marketData.js | Connects to Angel One WebSocket, receives live ticks |
| src/marketdata/candleBuilder.js | Assembles ticks into 1min/5min/15min/1D OHLCV candles |
| src/automation/strategyRunner.js | Feeds closed candles to all 6 strategies, collects signals |
| src/paper/paperEngine.js | Simulates order fills for paper trading mode |
| src/socket/socketManager.js | Socket.io — pushes live prices and order updates to browser |
| src/cron/squareOff.js | Auto squares off all MIS positions at 3:10 PM IST |
| src/strategies/ | All 6 strategy files — EMA, RSI, MACD, Supertrend, Bollinger, ORB |
| src/app.js | Updated — wires Socket.io, marketData, strategyRunner together |
| package.json | Updated — adds socket.io and ws dependencies |

---

## Setup

```bash
cd backend
npm install
cp .env.example .env
node src/scripts/seedAdmin.js
node src/scripts/seedStrategies.js
npm run dev
```

---

## How the live data flow works

```
Angel One WebSocket
      |  (raw ticks)
marketData.js  ->  candleBuilder + Socket.io (live prices)
      |
candleBuilder.js  ->  fires onCandleClose every 1/5/15/60 min
      |
strategyRunner.js  ->  feeds candle to each loaded strategy
      |
Strategy returns signal
      |
orderExecutor.js  ->  5 risk checks
      |
      |-- Paper mode  ->  paperEngine.js  ->  simulated fill in MongoDB
      |-- Live mode   ->  brokerFactory  ->  real API call to broker
      |
socketManager.js  ->  emits order_update to that user's browser
```

---

## Socket.io Events

Connect from frontend:
```js
import { io } from 'socket.io-client'
const socket = io('http://localhost:5000', { auth: { token: 'your_jwt' } })
```

| Event | Who receives | Payload |
|-------|-------------|---------|
| live_price | All users | symbol, ltp, ohlc, volume |
| order_update | That user only | orderId, symbol, action, fillPrice, status, userLabel |
| strategy_signal | That user only | strategyName, symbol, action, price |
| risk_block | That user only | reason, symbol, action |
| token_expiry | That user only | broker, expiresAt |

---

## TradingView Webhook JSON

```json
{
  "secret":      "your_webhook_secret",
  "userId":      "user_mongodb_id",
  "symbol":      "{{ticker}}",
  "exchange":    "NSE",
  "action":      "{{strategy.order.action}}",
  "qty":         1,
  "orderType":   "MARKET",
  "productType": "MIS",
  "strategy":    "My Strategy"
}
```

Webhook URL: POST https://your-domain.com/api/webhook/alert

---

## Cron Schedule

| Job | Time IST | Days |
|-----|----------|------|
| Token refresh | 8:00 AM | Mon-Fri |
| Instrument download | 8:05 AM | Mon-Fri |
| Auto square-off MIS | 3:10 PM | Mon-Fri |
