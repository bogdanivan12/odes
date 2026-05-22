export class AuthToken {
  accessToken: string;
  refreshToken: string;
  tokenType: string;

  constructor({ accessToken, refreshToken, tokenType }: { accessToken: string; refreshToken: string; tokenType: string }) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.tokenType = tokenType;
  }

  // Factory that accepts API responses in snake_case or camelCase.
  static fromApi(obj: any) {
    if (!obj) throw new Error("Invalid token response");
    const accessToken  = obj.access_token  ?? obj.accessToken  ?? obj.token ?? null;
    const refreshToken = obj.refresh_token ?? obj.refreshToken ?? null;
    const tokenType    = obj.token_type    ?? obj.tokenType    ?? obj.type  ?? "Bearer";
    if (!accessToken)  throw new Error("Token response missing access token");
    if (!refreshToken) throw new Error("Token response missing refresh token");
    return new AuthToken({ accessToken, refreshToken, tokenType });
  }
}
