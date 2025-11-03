import { HttpException, HttpStatus } from '@nestjs/common';

export class OAuthConnectionError extends HttpException {
  constructor(
    public readonly provider: string,
    public readonly originalError: Error,
    public readonly isRetryable: boolean = false,
  ) {
    super(
      {
        statusCode: HttpStatus.BAD_GATEWAY,
        message: `Failed to connect to ${provider}`,
        error: originalError.message,
        provider,
        isRetryable,
      },
      HttpStatus.BAD_GATEWAY,
    );
  }
}

export class OAuthTokenRefreshError extends HttpException {
  constructor(
    public readonly provider: string,
    public readonly reason: string,
  ) {
    super(
      {
        statusCode: HttpStatus.UNAUTHORIZED,
        message: `Token refresh failed for ${provider}`,
        error: reason,
        provider,
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class OAuthProviderNotConnectedError extends HttpException {
  constructor(public readonly provider: string) {
    super(
      {
        statusCode: HttpStatus.PRECONDITION_FAILED,
        message: `${provider} is not connected. Please connect your account in settings.`,
        error: 'Provider not connected',
        provider,
      },
      HttpStatus.PRECONDITION_FAILED,
    );
  }
}
