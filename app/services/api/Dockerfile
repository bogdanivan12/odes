FROM --platform=linux/amd64 python:3.13.0-slim

ENV PYTHONPATH="${PYTHONPATH}:/."

COPY app/libs /app/libs
COPY app/services/api /app/services/api
RUN pip install --upgrade pip
RUN pip install -r app/services/api/requirements.txt

EXPOSE 8080

CMD ["python3", "app/services/api/src/main.py"]