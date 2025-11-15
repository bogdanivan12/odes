import uvicorn
from fastapi import FastAPI
from fastapi.responses import RedirectResponse

from app.services.api.src.routes.institutions import router as institutions_router
from app.services.api.src.routes.courses import router as courses_router
from app.services.api.src.routes.rooms import router as rooms_router
from app.services.api.src.routes.groups import router as groups_router
from app.services.api.src.routes.users import router as users_router
from app.services.api.src.routes.activities import router as activities_router
from app.services.api.src.routes.schedules import router as schedules_router
from app.services.api.src.routes.scheduled_activities import router as scheduled_activities_router

app = FastAPI(
    title="ODES API",
    version="1.0.0"
)

app.include_router(institutions_router)
app.include_router(courses_router)
app.include_router(rooms_router)
app.include_router(groups_router)
app.include_router(users_router)
app.include_router(activities_router)
app.include_router(schedules_router)
app.include_router(scheduled_activities_router)


@app.get("/", include_in_schema=False)
def redirect_to_docs():
    return RedirectResponse("/docs")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
