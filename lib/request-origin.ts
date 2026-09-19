/** Use the request Host, since Next may normalize req.url to its internal server name. */
export function sameOrigin(req: Request, development = false) {
  const value = req.headers.get("origin");
  if (!value) return false;
  try {
    const origin = new URL(value);
    return (
      origin.origin === value &&
      origin.host === req.headers.get("host") &&
      (origin.protocol === "https:" ||
        (development &&
          origin.protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(origin.hostname)))
    );
  } catch {
    return false;
  }
}
