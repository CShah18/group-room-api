# Group Room API

Tech stack:
- Node.js + Express
- Redis (redis npm package)
- PostgreSQL + Sequelize
- Docker + docker-compose
- Swagger docs at /api-docs

## Quick start with Docker
1. Copy `.env.example` to `.env` if you want to edit env.
2. Run:
   docker compose up --build
3. API: http://localhost:3000
   Swagger UI: http://localhost:3000/api-docs

## Run locally (no Docker)
1. Ensure Postgres and Redis are running.
2. Install deps:
   npm install
3. Start:
   npm run dev

## Endpoints
- POST /groups
  body: { "maxParticipants": 3, "expiryMinutes": 30 }  -> creates a group, sets Redis TTL

- POST /groups/:id/join
  body: { "userId": "user-123" } -> attempts to join atomically via Redis Lua + DB transaction

- GET /groups/:id
  -> returns current live participantsCount, maxParticipants, timeLeftSeconds

Notes:
- Redis TTL determines when group becomes inactive.
- If Redis keys disappear (Redis restart), server rehydrates keys from DB if group is still active.
- If DB shows expired, it will mark isExpired lazily on access.
