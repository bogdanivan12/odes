import uvicorn
from fastapi import FastAPI
from fastapi.responses import RedirectResponse

from app.services.api.src.institutions.routes import router as institutions_router

app = FastAPI(
    title="ODES API",
    version="1.0.0"
)

app.include_router(institutions_router)


@app.get("/", include_in_schema=False)
def redirect_to_docs():
    return RedirectResponse("/docs")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
