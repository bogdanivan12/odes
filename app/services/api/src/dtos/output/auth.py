from pydantic import BaseModel


class AccessToken(BaseModel):
    """Access token returned by login and refresh endpoints.

    The refresh token is delivered via an HttpOnly cookie - it is never
    included in the JSON response body.
    """
    access_token: str
    token_type: str = "Bearer"