const ENDPOINT = "https://api.zyte.com/v1/extract";
const MAX_RESPONSE_BYTES = 10 * 1024 * 1024;

export function validateUrl(value: string) {
  let url;
  try { url = new URL(value); } catch { throw new Error("Provide an absolute HTTP or HTTPS URL."); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Provide an HTTP or HTTPS URL without embedded credentials.");
  }
  return url.href;
}

async function readLimited(response: Response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error("Zyte API response exceeded the 10 MiB limit.");
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks).toString("utf8");
}

interface FetchPageOptions {
  url: string;
  browser?: boolean;
  fullPage?: boolean;
  signal?: AbortSignal;
  apiKey?: string;
  fetchImpl?: typeof fetch;
}

export async function fetchPage({ url, browser = false, fullPage = false, signal, apiKey = process.env.ZYTE_API_KEY, fetchImpl = fetch }: FetchPageOptions) {
  const target = validateUrl(url);
  if (!apiKey) throw new Error("ZYTE_API_KEY is not set. Set it in the environment before starting Pi.");
  const body: { url: string; markdown: boolean; markdownOptions?: { extractFrom?: string; scope?: string } } = { url: target, markdown: true };
  const options: { extractFrom?: string; scope?: string } = {};
  if (browser) options.extractFrom = "browserHtmlOnly";
  if (fullPage) options.scope = "fullPage";
  if (Object.keys(options).length) body.markdownOptions = options;
  const timeout = AbortSignal.timeout(120_000);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  let response;
  try {
    response = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json", "Authorization": `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}` },
      body: JSON.stringify(body), signal: combined, redirect: "error",
    });
    const raw = await readLimited(response);
    let data;
    try { data = JSON.parse(raw); } catch { throw new Error(`Zyte API returned invalid JSON (HTTP ${response.status}).`); }
    if (!response.ok) {
      // Avoid reflecting server-provided text or credentials into the session.
      throw new Error(`Zyte API request failed (HTTP ${response.status}). Check your API key, request and account limits.`);
    }
    if (typeof data.markdown !== "string") throw new Error("Zyte API returned no Markdown for this page.");
    return { url: typeof data.url === "string" ? data.url : target, statusCode: data.statusCode, markdown: data.markdown };
  } catch (error) {
    if (signal?.aborted) throw new Error("Zyte request cancelled.");
    if (timeout.aborted) throw new Error("Zyte request timed out after 120 seconds.");
    throw error;
  }
}
