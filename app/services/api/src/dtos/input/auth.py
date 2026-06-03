from pydantic import BaseModel


class GoogleSignIn(BaseModel):
    """The ID-token credential returned by Google Identity Services."""
    credential: str
