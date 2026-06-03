from pydantic import BaseModel, EmailStr


class ForgotPassword(BaseModel):
    """Request a password-reset link for an email address."""
    email: EmailStr


class ResetPassword(BaseModel):
    """Complete a password reset using the emailed token."""
    token: str
    new_password: str


class GoogleSignIn(BaseModel):
    """The ID-token credential returned by Google Identity Services."""
    credential: str


class MicrosoftSignIn(BaseModel):
    """The ID token returned by MSAL (Microsoft Entra ID)."""
    credential: str
