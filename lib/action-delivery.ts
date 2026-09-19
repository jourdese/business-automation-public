export type ActionLease = { id: string; leaseToken: string; kind: string };
type Worker = (op: string, p?: Record<string, unknown>) => Promise<ActionLease | null>;
/** No retry here: a timeout after handing a request to a provider is ambiguous. */
export async function deliverQueuedActions(
  worker: Worker,
  url: string,
  secret: string,
  transport: typeof fetch = fetch,
) {
  const endpoint = new URL(url);
  if (
    endpoint.protocol !== "https:" ||
    endpoint.username ||
    endpoint.password ||
    secret.length < 32
  )
    throw new Error("Action endpoint is not configured securely");
  for (let i = 0; i < 3; i++) {
    const job = await worker("claim");
    if (!job) return;
    let status = "uncertain";
    let providerReceipt: string | undefined;
    let errorCode = "action_response_uncertain";
    try {
      const response = await transport(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", "x-jourvis-action-key": secret },
        body: JSON.stringify({ id: job.id, leaseToken: job.leaseToken }),
        redirect: "error",
        signal: AbortSignal.timeout(15000),
      });
      if (response.ok) {
        const text = await response.text();
        if (text.length < 4096) {
          const result = JSON.parse(text);
          if (
            result.id === job.id &&
            result.status === "succeeded" &&
            typeof result.providerReceipt === "string" &&
            result.providerReceipt.length > 0 &&
            result.providerReceipt.length <= 300
          ) {
            status = "succeeded";
            providerReceipt = result.providerReceipt;
            errorCode = "";
          } else if (
            result.id === job.id &&
            result.status === "failed" &&
            result.notSent === true
          ) {
            status = "failed";
            errorCode = "action_rejected_before_send";
          }
        }
      } else if (response.status === 401 || response.status === 403) {
        status = "failed";
        errorCode = "gateway_auth_rejected";
      }
    } catch {
      /* Never log the request, provider body, token or recipient. */
    }
    await worker("finish", {
      id: job.id,
      leaseToken: job.leaseToken,
      status,
      providerReceipt,
      errorCode,
    });
    if (status !== "succeeded") return;
  }
}
