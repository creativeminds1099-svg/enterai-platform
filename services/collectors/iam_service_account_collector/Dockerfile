FROM python:3.11-slim
WORKDIR /app
COPY services/collectors/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt google-api-python-client>=2.140.0
COPY services/collectors /app/services/collectors
COPY agents /app/agents
ENV PYTHONUNBUFFERED=1
ENTRYPOINT ["python", "services/collectors/iam_service_account_collector/main.py"]
