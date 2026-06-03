from pydantic import BaseModel


class GoogleSignIn(BaseModel):
    """The ID-token credential returned by Google Identity Services."""
    credential: str


class MicrosoftSignIn(BaseModel):
    """The ID token returned by MSAL (Microsoft Entra ID)."""
    credential: str
