import {SignInRequest, SignUpRequest} from "../features/auth/types.ts";
import { apiPost } from "../utils/apiClient.ts";
import {FORGOT_PASSWORD_URL, GOOGLE_SIGNIN_URL, MICROSOFT_SIGNIN_URL, RESET_PASSWORD_URL, SIGNIN_URL, SIGNUP_URL} from "../config/constants.ts";

export async function signUp(request: SignUpRequest) {
  return apiPost(SIGNUP_URL, {
    name: request.name,
    email: request.email,
    password: request.password,
  });
}


export async function signIn(request: SignInRequest) {
  const params = new URLSearchParams();
  params.append('username', request.email);
  params.append('password', request.password);

  return apiPost(SIGNIN_URL, params.toString(), {
    'Content-Type': 'application/x-www-form-urlencoded',
  });
}

/** Exchange a Google ID-token credential for the app's access token. */
export async function googleSignIn(credential: string) {
  return apiPost(GOOGLE_SIGNIN_URL, { credential });
}

/** Exchange a Microsoft (Entra ID) ID token for the app's access token. */
export async function microsoftSignIn(credential: string) {
  return apiPost(MICROSOFT_SIGNIN_URL, { credential });
}

/** Request a password-reset email. Always resolves (no account enumeration). */
export async function forgotPassword(email: string) {
  return apiPost(FORGOT_PASSWORD_URL, { email });
}

/** Complete a password reset with the emailed token. */
export async function resetPassword(token: string, newPassword: string) {
  return apiPost(RESET_PASSWORD_URL, { token, new_password: newPassword });
}
