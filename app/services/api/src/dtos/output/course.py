from typing import List

from pydantic import BaseModel

from app.libs.db import models


class GetAllCourses(BaseModel):
    """
    DTO for retrieving all courses
    """
    courses: List[models.Course]


class GetCourse(BaseModel):
    """
    DTO for retrieving a course
    """
    course: models.Course
