/**
 * The verify callback for KeycloakStrategy.
 * It is called after successful OAuth2 token exchange and optional profile retrieval.
 */
export type KeycloakVerifyCallback = (
  req: Request,
  accessToken: string,
  refreshToken: string,
  profile: any,
  done: (error: any, user?: any, info?: any) => void
) => void;
