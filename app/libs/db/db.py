import os
from typing import Annotated, TypeAlias

import certifi
from fastapi import Depends
from dotenv import load_dotenv
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from pymongo.synchronous.database import Database


ENV_PATH = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
load_dotenv(ENV_PATH)

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "odes")


def get_db():
    client = MongoClient(
        MONGODB_URI,
        server_api=ServerApi("1"),
        tlsCAFile=certifi.where()
    )
    db = client.get_database("odes")
    try:
        yield db
    finally:
        client.close()

DB: TypeAlias = Annotated[Database, Depends(get_db)]
