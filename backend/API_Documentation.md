# BidZo API Documentation

**Base URL (Local):** `http://127.0.0.1:8000`

---

## 🔑 Authentication (JWT)

All protected routes require an `Authorization` header containing the access token:
`Authorization: Bearer <your_access_token>`

### 1. Login / Obtain Tokens
- **Endpoint:** `POST /api/token/`
- **Description:** Authenticates a user and returns JWT access/refresh tokens.
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "username": "username",
    "password": "password"
  }

  >Response (200 OK):

  {
  "refresh": "eyJhbGciOi...",
  "access": "eyJhbGciOi..."
}

2. Refresh Access Token

    Endpoint: POST /api/token/refresh/

    >Description: Obtains a new access token using a valid refresh token.

    >Headers: Content-Type: application/json

    >Request Body:

    {
  "refresh": "your_refresh_token_here"
}

>Response (200 OK):
{
  "access": "eyJhbGciOi..."
}

Auction Endpoints
1. List All Auctions

    Endpoint: GET /api/auctions/

    Auth Required: No

    Response (200 OK):
    JSON

    [
      {
        "id": 1,
        "title": "Custom PCB Mechanical Keyboard",
        "description": "Mint condition with linear switches",
        "starting_price": "150.00",
        "current_highest_bid": "180.00",
        "end_time": "2026-10-15T12:00:00Z",
        "status": "active",
        "seller": 1,
        "seller_username": "rahu",
        "bids": [],
        "created_at": "2026-09-29T10:00:00Z"
      }
    ]

2. Create Auction

    Endpoint: POST /api/auctions/

    Auth Required: Yes (Bearer <access_token>)

    Headers: Content-Type: application/json

    Request Body:
    JSON

    {
      "title": "Vintage Mechanical Keyboard",
      "description": "Studio quality custom board",
      "starting_price": "100.00",
      "end_time": "2026-10-20T18:00:00Z"
    }

    Response (201 Created):
    JSON

    {
      "id": 2,
      "title": "Vintage Mechanical Keyboard",
      "description": "Studio quality custom board",
      "starting_price": "100.00",
      "current_highest_bid": "0.00",
      "end_time": "2026-10-20T18:00:00Z",
      "status": "active",
      "seller": 1,
      "seller_username": "rahu",
      "bids": [],
      "created_at": "2026-09-29T13:00:00Z"
    }

3. Get Single Auction

    Endpoint: GET /api/auctions/{auction_id}/

    Auth Required: No

💰 Bidding Endpoints
1. List Bids for an Auction

    Endpoint: GET /api/auctions/{auction_id}/bids/

    Auth Required: Yes (Bearer <access_token>)

2. Place a Bid

    Endpoint: POST /api/auctions/{auction_id}/bids/

    Auth Required: Yes (Bearer <access_token>)

    Headers: Content-Type: application/json

    Request Body:
    JSON

    {
      "amount": "200.00"
    }

    Response (201 Created):
    JSON

    {
      "success": true,
      "data": {
        "id": 1,
        "auction_item": 1,
        "bidder": 2,
        "bidder_username": "mayank",
        "amount": "200.00",
        "timestamp": "2026-09-29T13:10:00Z"
      }
    }