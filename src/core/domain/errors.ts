export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends DomainError {
  readonly code = "not_found";
  readonly httpStatus = 404;
  constructor(resource: string, id: string) {
    super(`${resource} '${id}' not found`);
  }
}

export class ForbiddenError extends DomainError {
  readonly code = "forbidden";
  readonly httpStatus = 403;
  constructor(resource: string, id: string) {
    super(`Access to ${resource} '${id}' is forbidden`);
  }
}

export class ValidationError extends DomainError {
  readonly code = "validation";
  readonly httpStatus = 400;
  constructor(message: string) {
    super(message);
  }
}

export class IngestionError extends DomainError {
  readonly code = "ingestion";
  readonly httpStatus = 422;
  constructor(message: string) {
    super(message);
  }
}

export class CapExceededError extends DomainError {
  readonly code = "cap_exceeded";
  readonly httpStatus = 429;
  constructor(message: string) {
    super(message);
  }
}

export class UnauthorizedError extends DomainError {
  readonly code = "unauthorized";
  readonly httpStatus = 401;
  constructor() {
    super("Unauthorized");
  }
}
