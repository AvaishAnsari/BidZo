# BidZo Development Notes

## Project overview

BidZo is an auction and bidding application. The frontend uses React, TypeScript, and Vite. The backend uses Django REST Framework and Django Channels with PostgreSQL.

## Repository layout

- `src/components/` — reusable frontend components
- `src/pages/` — frontend pages
- `src/hooks/` — custom React hooks
- `src/services/` — HTTP and WebSocket client services for the Django backend
- `src/types/` — shared frontend types
- `backend/` — Django project, auction app, migrations, and API documentation

## Development setup

- Frontend: `npm install`, configure `VITE_API_BASE_URL`, then run `npm run dev`.
- Backend: install `backend/requirements.txt`, configure `backend/.env.example` values, run `python backend/manage.py migrate`, then `python backend/manage.py runserver`.
- See `backend/API_Documentation.md` for the API endpoints.

## Development guidelines

- Keep business rules, permissions, and input validation enforced on the Django backend.
- Use the frontend service modules for Django API requests and WebSocket connections.
- Keep React components in `src/components/`, pages in `src/pages/`, hooks in `src/hooks/`, and shared types in `src/types/`.
- Store secrets in environment variables; do not commit real credentials.
