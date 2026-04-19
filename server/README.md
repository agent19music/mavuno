# server

Django backend for the mavuno app.

## Setup

```bash
cd server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver 8000
```

The API will be at `http://localhost:8000/mavuno/api/`.

## Health check

```
GET /mavuno/api/health/ -> { "status": "ok" }
```

## Project structure

- `core/` — Django project (settings, urls, wsgi/asgi)
- `api/` — First app; add models, views, serializers, urls here
- `.env` — Local environment variables (not committed)
- `requirements.txt` — Python dependencies

## Useful commands

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py startapp <name>
```
