from pydantic import BaseModel


class CreateSchedule(BaseModel):
    """
    DTO for creating a schedule
    """
    institution_id: str
