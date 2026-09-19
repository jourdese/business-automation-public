"use client";
export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
export async function send<T>(op: string, p: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch("/api/command-center", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ op, p }),
  });
  const result = await response.json();
  if (!response.ok)
    throw new ApiClientError(
      result.error || "The request could not be completed.",
      response.status,
    );
  return result.data as T;
}
