# SentinelFin FastAPI Backend

This directory contains the full **FastAPI (Python)** REST API implementation for SentinelFin AI Threat Intercept & Payment Shield.

## Features
- **FastAPI + Async Python 3.10+**
- **Pydantic v2** Data Schemas
- **JWT / Bearer Token** Authentication
- **CORS** configured for Vite / React integration
- **Endpoints**:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
  - `POST /api/users/me/onboarding`
  - `GET /api/transactions`
  - `GET /api/devices`
  - `GET /api/contacts`

## How to Run Locally

```bash
# 1. Navigate to backend directory
cd fastapi_backend

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run Uvicorn server
uvicorn main:app --reload --port 8000
```

Access automatic Swagger interactive API documentation at:
`http://localhost:8000/docs`
