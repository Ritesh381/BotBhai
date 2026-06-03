import { NextResponse } from "next/server";
import type { Result } from "@core/usecases/shared/result";
import type { DomainError } from "@core/domain/errors";

export function respond<T>(result: Result<T, DomainError>): NextResponse {
  if (result.ok) return NextResponse.json(result.value);
  return NextResponse.json(
    { error: { code: result.error.code, message: result.error.message } },
    { status: result.error.httpStatus }
  );
}

export function unauthorized() {
  return NextResponse.json(
    { error: { code: "unauthorized", message: "Unauthorized" } },
    { status: 401 }
  );
}

export function badRequest(message: string) {
  return NextResponse.json(
    { error: { code: "validation", message } },
    { status: 400 }
  );
}
