import requests

# The absolute target URL for your newly configured JWT view endpoint
URL = "http://127.0.0.1:8000/api/token/"  # <-- Update this URL if your Django server is running on a different host or port

# Target account credentials (using your master admin superuser details)
payload = {
    "username": "rahu",
    "password": "@Rahu900"  # <-- Type your actual master terminal admin password string here!
}

print("📡 Sending authentication credentials to Django...")
try:
    response = requests.post(URL, json=payload)
    if response.status_code == 200:
        data = response.json()
        print("\n✅ JWT Authentication Successful!")
        print(f"🔑 Access Token: {data['access'][:50]}...")
        print(f"🔄 Refresh Token: {data['refresh'][:50]}...")
    else:
        print(f"\n❌ Server rejected login details: Status {response.status_code}")
        print(response.json())
except Exception as e:
    print(f"\n❌ Connection failed: {str(e)}")
