# BidZo API

Local base URL: `http://127.0.0.1:8000`

Protected endpoints use a Django REST Framework Simple JWT access token:

```http
Authorization: Bearer <access_token>
```

## Authentication

### Register

`POST /api/register/`

```json
{
  "username": "sam",
  "email": "sam@example.com",
  "phone_number": "+919876543210",
  "phone_verification_token": "<token returned by OTP verification>",
  "password": "a-strong-password",
  "role": "buyer"
}
```

`phone_number` is a verified, unique E.164 number. New members can both bid and list; the legacy `role` value is retained for existing data compatibility. Admin accounts must be created through Django admin or `createsuperuser`.

### Login

`POST /api/login/`

Accepts `username` or `email`, plus `password`. A successful response includes `access`, `refresh`, and the user profile.

### OTP login

Request an email login code with `POST /api/auth/otp/request/`:

```json
{ "identifier": "sam@example.com", "channel": "email" }
```

For SMS login, send the registered E.164 number and use `"channel": "sms"`. Verify with `POST /api/auth/otp/verify/` and `{ "identifier": "sam@example.com", "channel": "email", "code": "123456" }`. Codes expire after five minutes and are limited to five attempts.

To register a mobile number safely, request and verify an SMS code with `"purpose": "phone_registration"`; the verify endpoint returns a short-lived `phone_verification_token`. Include that token in the registration request. During local development, email and SMS codes are printed in the Django terminal. Configure email and a real SMS gateway before production; the development SMS console is not a delivery service.

### Google login

`POST /api/auth/google/`

Accepts a verified Google ID token as `{ "token": "..." }`.

### Change role

`POST /api/users/role/`

Requires authentication. Accepts `buyer` or `seller`.

## Auctions

### List auctions

`GET /api/auctions/` is public.

### Create auction

`POST /api/auctions/` requires any authenticated user. The server assigns the seller and auction status.

```json
{
  "title": "Vintage Mechanical Keyboard",
  "description": "Custom keyboard in excellent condition",
  "category": "Electronics",
  "image_url": "https://example.com/keyboard.jpg",
  "starting_price": "100.00",
  "end_time": "2026-10-20T18:00:00Z"
}
```

### Auction details

`GET /api/auctions/{auction_id}/` is public.

## Bids

### List bids

`GET /api/auctions/{auction_id}/bids/` is public.

### Place a bid

`POST /api/auctions/{auction_id}/bids/` requires an authenticated user and a positive decimal `amount`.

```json
{
  "amount": "150.00"
}
```

The server rejects bids when the auction is not active, its end time has passed, the bidder owns it, or the amount is not greater than the starting/current price. The auction row is locked while the bid is validated and saved.

## Live updates

WebSocket clients can connect to:

- `ws://127.0.0.1:8000/ws/auctions/` for auction creation and bid updates across the listing.
- `ws://127.0.0.1:8000/ws/auctions/{auction_id}/` for bid updates to one auction.

Messages are JSON objects with a `type`, such as `AUCTION_CREATED` or `BID_PLACED`. The development server uses an in-memory channel layer; a multi-process deployment needs a shared channel layer such as Redis.

## User bids

`GET /api/users/me/bids/` requires authentication and returns the current user's bids.
