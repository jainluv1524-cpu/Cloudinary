FROM python:3.11-slim AS base

WORKDIR /app

# Install system deps for OpenCV (headless)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY apps/ml-service/pyproject.toml ./
RUN pip install --no-cache-dir -e ".[ml]"

COPY apps/ml-service/ ./

EXPOSE 8000
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
