FROM --platform=linux/amd64 python:3.13.0-slim

ENV PYTHONPATH="${PYTHONPATH}:/."

COPY app/libs /app/libs
COPY app/services/worker /app/services/worker
RUN pip install --upgrade pip
RUN pip install -r app/services/worker/requirements.txt

EXPOSE 8081

CMD ["celery", "-A", "app.services.worker.src.main", "worker", "--loglevel=info", "-Q", "schedule_generator_queue", "--concurrency=1"]