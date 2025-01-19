export default class UserInfoError extends Error {
  code: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'UserInfoError';
    this.code = code || 'unknown_error';
  }
}
