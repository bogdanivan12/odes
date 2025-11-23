import { SignUpRequest } from "./types";
import { SIGNUP_URL } from "./constants";
import { apiPost } from "../../utils/apiClient.ts";

export async function signUp(request: SignUpRequest) {
  return apiPost(SIGNUP_URL, {
    name: request.name,
    email: request.email,
    password: request.password,
  });
}
