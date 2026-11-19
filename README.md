# pi-zyte

An early MVP Pi extension that fetches known web pages through the Zyte API. It provides a `zyte` tool for the assistant and a `/zyte` command for interactive use. No Zyte CLI is required.

## Requirements

- Pi and Node.js 22.19 or newer (the current Pi development dependency requires this version).
- A [Zyte API](https://docs.zyte.com/zyte-api/get-started.html) account and API key. Requests can incur Zyte charges, especially browser requests.

Set the key in the environment **before starting Pi**:

```sh
export ZYTE_API_KEY='your-api-key'
```

Do not commit your key or paste it into a Pi conversation.

## Install

Install the npm package into Pi:

```sh
pi install npm:pi-zyte
```

This installs it for your user. Add `--local` to install it for the current project instead. To try it for one session without adding it to your Pi settings:

```sh
pi -e npm:pi-zyte
```

You can also install from a local checkout:

```sh
pi install /absolute/path/to/pi-zyte
```

Or install from GitHub:

```sh
pi install git:github.com/zytelabs/pi-zyte
```

Pi loads the TypeScript source directly; no build step or TypeScript installation is needed for users. Pi supplies its own extension API and TypeBox at runtime. Run `/reload` in an existing Pi session after installation.

## Use

```text
/zyte https://example.com
```

The command asks the assistant to use the tool and summarize the page. You can also ask Pi naturally to fetch a URL, request browser rendering for a JavaScript page, or request the full page rather than its main content. The command queues a follow-up when the assistant is busy.

The tool returns Markdown, the resolved URL when provided by Zyte, and the website HTTP status. The default uses Zyte's HTTP-based Markdown extraction; browser rendering is opt-in and may cost more. Output is limited to 50 KB or 2,000 lines and is not saved elsewhere. Responses over 10 MiB are rejected. Requests time out after 120 seconds; cancelling a Pi turn cancels the request. Failed requests are not automatically retried.

This is a page-fetching tool, **not a search engine** or an interactive browser. It cannot discover URLs from a query, log in, click, or take screenshots. Content is untrusted and may contain misleading instructions. URLs and retrieved content are sent to Zyte, and page text enters the Pi conversation and may be sent to the selected model provider. Avoid sensitive URLs and data unless you intend that disclosure.

## Development

```sh
npm install
npm test
npm run typecheck
```

The development dependencies include Pi's types, TypeBox, TypeScript and the `tsx` test loader. Tests use mocked HTTP responses and do not require an API key or make requests.

## License

[MIT](LICENSE).
