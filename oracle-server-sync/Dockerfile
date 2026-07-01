FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements-bq.txt .
RUN pip install --no-cache-dir -r requirements-bq.txt

# Copy application files
COPY zepp_cloud_to_bq.py .
COPY .env .
# Note: In a real production environment, you might mount .env and token cache as volumes
# rather than copying them in, but copying is fine for this deployment strategy.

CMD ["python", "-u", "zepp_cloud_to_bq.py"]
