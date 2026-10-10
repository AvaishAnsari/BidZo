# BidZo

BidZo is an auction and bidding application. The frontend is built with React, TypeScript, and Vite. The backend is Django with PostgreSQL; the backend project and API documentation are in `backend/`.

## Backend setup

1. Create and activate a Python virtual environment.
2. Install dependencies with `pip install -r backend/requirements.txt`.
3. Configure the variables shown in `backend/.env.example` for your PostgreSQL database and Django settings.
4. From the repository root, run database migrations with `python backend/manage.py migrate`.
5. Start Django with `python backend/manage.py runserver`.

See `backend/API_Documentation.md` for the current API endpoints.

## Frontend setup

1. Install Node dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL` to your Django server URL.
3. Start the development server with `npm run dev`.

The frontend expects the Django API and WebSocket endpoints to be available at the configured backend host.
