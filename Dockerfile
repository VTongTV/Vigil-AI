FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
COPY run.sh .

COPY . .

RUN mkdir -p outputs/evidence

ENV OMP_NUM_THREADS=4
ENV ONNX_NUM_THREADS=4
ENV RAILWAY_ENVIRONMENT=1
ENV VIGILAI_DEMO_MODE=false

EXPOSE 7860

CMD ["bash", "run.sh"]
