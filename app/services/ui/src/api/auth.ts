import {SignInRequest, SignUpRequest} from "../features/auth/types.ts";
import { apiPost } from "../utils/apiClient.ts";
import {SIGNIN_URL, SIGNUP_URL} from "../config/constants.ts";

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
