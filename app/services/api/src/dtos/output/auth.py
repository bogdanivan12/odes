from pydantic import BaseModel


class Token(BaseModel):
    """DTO returned on successful login — contains both tokens."""
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"


class AccessToken(BaseModel):
    """DTO returned by the refresh endpoint — new access token only."""
    access_token: str
    token_type: str = "Bearer"