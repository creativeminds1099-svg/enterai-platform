FROM python:3.11-slim
WORKDIR /app
COPY services/collectors/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY services/collectors /app/services/collectors
COPY agents /app/agents
ENV PYTHONUNBUFFERED=1
ENTRYPOINT ["python", "services/collectors/agent_registry_collector/main.py"]
