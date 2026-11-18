import test from "node:test";
import assert from "node:assert/strict";
import { fetchPage, validateUrl } from "../src/api.ts";

const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });

test("requests Markdown with Basic authentication and returns website status", async () => {
  let request;
  const result = await fetchPage({ url: "https://example.com/page", apiKey: "key", fetchImpl: async (url, options) => {
    request = { url, options }; return json({ url: "https://example.com/final", statusCode: 200, markdown: "# Hello" });
  }});
  assert.equal(request.url, "https://api.zyte.com/v1/extract");
  assert.equal(request.options.headers.Authorization, `Basic ${Buffer.from("key:").toString("base64")}`);
  assert.equal(request.options.redirect, "error");
  assert.deepEqual(JSON.parse(request.options.body), { url: "https://example.com/page", markdown: true });
  assert.deepEqual(result, { url: "https://example.com/final", statusCode: 200, markdown: "# Hello" });
});

test("browser and full page set Markdown options", async () => {
  await fetchPage({ url: "https://example.com", browser: true, fullPage: true, apiKey: "key", fetchImpl: async (_, options) => {
    assert.deepEqual(JSON.parse(options.body).markdownOptions, { extractFrom: "browserHtmlOnly", scope: "fullPage" });
    return json({ markdown: "ok", statusCode: 200 });
  }});
});

test("rejects invalid URLs, embedded credentials and missing key", async () => {
  for (const url of ["not-a-url", "file:///etc/passwd", "https://name:pass@example.com"]) assert.throws(() => validateUrl(url));
  await assert.rejects(fetchPage({ url: "https://example.com", apiKey: "" }), /ZYTE_API_KEY/);
});

test("reports API errors without echoing server response or secrets", async () => {
  await assert.rejects(fetchPage({ url: "https://example.com", apiKey: "secret", fetchImpl: async () => json({ detail: "secret" }, 401) }), (error) => error.message.includes("401") && !error.message.includes("secret"));
  await assert.rejects(fetchPage({ url: "https://example.com", apiKey: "x", fetchImpl: async () => json({}) }), /no Markdown/);
});

test("propagates cancellation", async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(fetchPage({ url: "https://example.com", apiKey: "x", signal: controller.signal, fetchImpl: async (_, options) => { options.signal.throwIfAborted(); } }), /cancelled/);
});
