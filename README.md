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

## One-command local development

After installing dependencies and configuring `.env.local`, start PostgreSQL (if stopped), Django, and Vite together from the repository root:

```bash
./dev.sh start
```

The script writes server output and PID files under the ignored `.run/` directory. Use `./dev.sh status` to check the services and `./dev.sh stop` to stop the Django and Vite processes started by the script. PostgreSQL starts automatically when it is stopped; the script may ask for your system password through `sudo`.

## Before a public launch

- Set `DEBUG=False`, a unique private `SECRET_KEY`, and explicit `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, and `CSRF_TRUSTED_ORIGINS` values. The backend now refuses to start in production mode without `SECRET_KEY`.
- Serve the site over HTTPS. Production cookie, redirect, and HSTS protections are enabled when `DEBUG=False`; set `SECURE_SSL_REDIRECT=False` only when HTTPS is handled correctly in front of Django.
- Configure SMTP for email verification and connect a real SMS provider before offering SMS OTP. The development console email and terminal SMS codes are not delivery services.
- Configure Razorpay test credentials and test end-to-end before live credentials. The backend checks Razorpay's payment record, captured status, order, currency, and amount before marking an order paid.
- Use a shared Redis channel layer when running multiple Django workers so auction WebSocket updates reach every connected client. The default in-memory layer is for local development.
- Test bidding with multiple authenticated accounts, including bids submitted at nearly the same time, and remove development listings before launch.
