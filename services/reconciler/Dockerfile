FROM python:3.11-slim
WORKDIR /app
COPY services/reconciler/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY services/reconciler /app/services/reconciler
COPY agents /app/agents
ENV PYTHONUNBUFFERED=1
ENTRYPOINT ["python", "services/reconciler/main.py"]
