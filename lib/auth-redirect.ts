export function safeAuthNext(value?: string | null) {
  return value && /^\/(?:invite\/[a-f0-9-]{36}|suppliers(?:\?invite=[a-f0-9-]{36})?)$/i.test(value)
    ? value
    : "/command-center";
}
