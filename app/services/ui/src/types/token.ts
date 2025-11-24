export class AuthToken {
  accessToken: string;
  tokenType: string;

  constructor({ accessToken, tokenType }: { accessToken: string; tokenType: string }) {
    this.accessToken = accessToken;
    this.tokenType = tokenType;
  }

  // factory that accepts API responses in snake_case or camelCase
  static fromApi(obj: any) {
    if (!obj) throw new Error("Invalid token response");
    const accessToken = obj.access_token ?? obj.accessToken ?? obj.token ?? null;
    const tokenType = obj.token_type ?? obj.tokenType ?? obj.type ?? "Bearer";
    if (!accessToken) throw new Error("Token response missing access token");
    return new AuthToken({ accessToken, tokenType });
  }

  // method to get the full token string
  getTokenString(): string {
    // Use standard 'Type value' format (e.g. 'Bearer abc...') — no colon
    return `${this.tokenType} ${this.accessToken}`;
  }
}
