# BidZo Backend (Django + PostgreSQL)

Backend REST API for the BidZo real-time bidding platform, built with Django REST Framework, PostgreSQL, and JWT Authentication.

---
1.
## Prerequisites
- Python 3.10+
- PostgreSQL server installed and running locally

---

##  Setup Instructions

### 1. Navigate to the project directory:
```bash
cd bidzo

2. Create and activate a virtual environment:

.Linux/macOS:

python3 -m venv venv
source venv/bin/activate

.Windows:

python -m venv venv
venv\Scripts\activate

3. Install dependencies:

pip install -r requirements.txt

4. Configure Environment Variables:

cp backend/.env.example backend/.env

5. Run Database Migrations:
python manage.py makemigrations
python manage.py migrate

6. Create Superuser (Admin Access):
python manage.py createsuperuser

7. Start the Development Server:
python manage.py runserver


The server will be available at: http://127.0.0.1:8000/

API Base URL: http://127.0.0.1:8000/api/

Django Admin Panel: http://127.0.0.1:8000/admin/

---

### Step-by-Step Commands to Create and Save it in VS Code:

1. In VS Code terminal, create the file:
   ```bash
   touch README.md