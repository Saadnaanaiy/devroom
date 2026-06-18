FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ backend/

WORKDIR /app/backend

EXPOSE $PORT

CMD gunicorn --worker-class eventlet --workers 1 --bind 0.0.0.0:$PORT wsgi:app
