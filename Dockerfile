FROM python:3.13-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p uploads

EXPOSE 10000

CMD ["sh", "-c", "gunicorn --workers 1 --threads 2 --timeout 120 --bind 0.0.0.0:${PORT:-10000} app:app"]