import os
from typing import Annotated, TypeAlias

import certifi
from fastapi import Depends
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from pymongo.synchronous.database import Database


MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "odes")

# A single MongoClient is shared across all requests in the process.
# MongoClient is thread-safe and manages its own internal connection pool,
# so this is the recommended pattern.  Creating a new client per request
# (the previous approach) caused a fresh pool to be allocated for every HTTP
# request, which under polling-heavy workloads (e.g., schedule generation)
# quickly exhausted MongoDB Atlas's connection limit.
_client: MongoClient | None = None


def _get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(
            MONGODB_URI,
            server_api=ServerApi("1"),
            tlsCAFile=certifi.where(),
        )
    return _client


def get_db():
    """Dependency that provides a MongoDB database handle from the shared client."""
    yield _get_client().get_database(DB_NAME)


DB: TypeAlias = Annotated[Database, Depends(get_db)]
