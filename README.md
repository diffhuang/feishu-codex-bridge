# Feishu Codex Bridge

[中文说明](./README.zh-CN.md)

Feishu Codex Bridge is a local bridge service that lets you drive Codex CLI from Feishu private chats while keeping execution inside a controlled local workspace.

## Why This Exists

Codex CLI works well locally, but it does not give you a practical chat channel for everyday collaboration out of the box. This project turns a Feishu private chat into a Codex task entry point while preserving local execution boundaries instead of exposing broad permissions to an external bot.

The bridge is responsible for three things: injecting Feishu conversation context into Codex tasks, safely sending results and local files back to Feishu, and constraining runtime access through allowlists, a fixed workspace root, and sandbox settings.

## Key Capabilities

- Feishu-aware task context: the bridge tells Codex that the request comes from a Feishu conversation before execution starts.
- File handoff back to Feishu: Codex can reference existing workspace files through the attachment block protocol, and the bridge validates and uploads them.
- Controlled permissions: `ALLOWED_OPEN_IDS`, `CODEX_WORKSPACE_ROOT`, and `CODEX_SANDBOX_MODE` limit who can use the bridge, which files stay in scope, and how much access Codex gets.
- Practical bridge operations: built-in `/help`, `/status`, and `/reset` commands, lightweight progress feedback, local logs, and optional verbose event traces.

## Requirements

- Node.js 20 or later
- npm
- Codex CLI available in `PATH` or configured through `CODEX_COMMAND`
- A Feishu app with long connection enabled

## Preflight Checklist

Before the first run, confirm:

1. `node -v` works.
2. `codex --help` works in the same shell where you will start the bridge.
3. Codex CLI is already authenticated and usable inside your target workspace.
4. You have `FEISHU_APP_ID`, `FEISHU_APP_SECRET`, and the target users' `open_id`.

Recommended quick checks:

```bash
node -v
codex --help
```

If `codex --help` fails, the bridge may start but it will not be able to execute real tasks.

## Workspace Path Requirements

`CODEX_WORKSPACE_ROOT` must:

- point to a real directory
- use an ASCII-only path
- avoid symlinks that resolve back to non-ASCII paths

Use a path such as:

```text
/path/to/codex-workspace
```

## Quick Start

1. Clone the repository and enter the project directory:

```bash
git clone https://github.com/diffhuang/feishu-codex-bridge.git
cd feishu-codex-bridge
```

2. Install dependencies:

```bash
npm install
```

3. Create a local env file:

```bash
cp .env.example .env
```

4. Update `.env` with your Feishu app credentials, allowed open IDs, and Codex workspace path.

5. Start the bridge:

```bash
npm run dev
```

Expected startup log:

```text
[bridge] starting long connection for workspace /path/to/codex-workspace
```

## Feishu Console Setup

Enable long connection mode and subscribe to:

- `im.message.receive_v1`

Open the tenant scopes required by the current code:

- `im:message`
- `im:message.p2p_msg:readonly`
- `im:message:readonly`
- `im:message:send_as_bot`
- `im:message:update`
- `im:message.reactions:write_only`
- `im:resource`

After changing permissions or event subscriptions, publish a new app version so the changes take effect.

## Environment Variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `FEISHU_APP_ID` | Yes | None | Feishu app ID |
| `FEISHU_APP_SECRET` | Yes | None | Feishu app secret |
| `CODEX_WORKSPACE_ROOT` | Yes | None | Fixed workspace root for Codex execution |
| `CODEX_COMMAND` | No | `codex` | Codex CLI command |
| `CODEX_SANDBOX_MODE` | No | `workspace-write` | `read-only`, `workspace-write`, or `danger-full-access` |
| `CODEX_TIMEOUT_MS` | No | `600000` | Per-request timeout in milliseconds |
| `CODEX_VERBOSE_EVENTS` | No | `false` | Enables verbose event mode |
| `CODEX_EXECUTION_TAIL_LINES` | No | `20` | Number of execution tail lines shown in verbose mode |
| `ALLOWED_OPEN_IDS` | Yes | None | Comma-separated Feishu open IDs allowed to use the bridge |
| `REPLY_MAX_CHARS` | No | `3500` | Maximum input length accepted from the user |
| `LOG_LEVEL` | No | `info` | Bridge log level |

Example:

```env
FEISHU_APP_ID=
FEISHU_APP_SECRET=
CODEX_WORKSPACE_ROOT=/path/to/codex-workspace
CODEX_COMMAND=codex
CODEX_SANDBOX_MODE=workspace-write
CODEX_TIMEOUT_MS=600000
CODEX_VERBOSE_EVENTS=false
CODEX_EXECUTION_TAIL_LINES=20
ALLOWED_OPEN_IDS=ou_xxx,ou_yyy
REPLY_MAX_CHARS=3500
LOG_LEVEL=info
```

Important notes:

- `CODEX_WORKSPACE_ROOT` must be a real ASCII-only directory.
- Do not commit `.env`.
- `ALLOWED_OPEN_IDS` must be comma-separated.

## How to Get `ALLOWED_OPEN_IDS`

This project does not auto-discover allowed users. You need to collect each target user's `open_id` in advance.

Common ways:

- inspect the Feishu event debug payload and read `sender.sender_id.open_id`
- inspect existing application logs if you already receive message events elsewhere

## Recommended Sandbox Setting

Use:

```env
CODEX_SANDBOX_MODE=workspace-write
```

This is the practical default for reading files, editing files inside the workspace, and sending existing local files back to Feishu.

## Scripts

```bash
npm run dev
npm test
npm run typecheck
```

## Bridge Commands

- `/help` shows built-in bridge commands
- `/status` shows the current Codex session for the chat
- `/reset` clears the saved session for the current chat

## Task Feedback

For normal Codex tasks, the bridge:

- prefers a reaction acknowledgement on the original user message
- falls back to a short acknowledgement text when reactions are unavailable
- sends one delayed reminder when a task is still running
- tries to update the delayed reminder with the final result instead of sending duplicate result bubbles

## Reply Protocol And Attachments

To send files, Codex appends a hidden block to the final reply:

```text
Finished the report and attached it.

<FEISHU_ATTACHMENTS>
{"attachments":[{"path":"docs/plans/latest-plan.md"}]}
</FEISHU_ATTACHMENTS>
```

The bridge strips the block, validates the paths, uploads the files, and sends them back to Feishu.

Attachment rules:

- files must already exist inside `CODEX_WORKSPACE_ROOT`
- paths must be workspace-relative
- up to 3 attachments per reply
- files larger than 30 MB are rejected

## Logs

- terminal logs keep timestamped output
- the bridge also writes `logs/bridge-YYYY-MM-DD.log`
- when `CODEX_VERBOSE_EVENTS=true`, raw event traces are written to `logs/requests/<requestId>.codex-events.jsonl`

## Verbose Event Mode

Enable:

```env
CODEX_VERBOSE_EVENTS=true
CODEX_EXECUTION_TAIL_LINES=20
```

Verbose mode is useful for debugging real request flows. It keeps more execution detail locally and sends more intermediate information back to Feishu.

## Manual Verification

Validate the local bridge flow from a Feishu private chat:

1. Send `ping` and confirm the bridge returns a normal reply.
2. Send a normal task and confirm the bridge keeps working after `/reset`.
3. Ask Codex to send existing attachments from the workspace.
4. Send a message from a non-allowlisted account and confirm it is rejected.
5. Trigger a timeout case with a deliberately long-running task.

## Troubleshooting

### Missing environment variables

Check:

- `.env` exists
- `FEISHU_APP_ID`, `FEISHU_APP_SECRET`, `CODEX_WORKSPACE_ROOT`, and `ALLOWED_OPEN_IDS` are not empty

### `codex` command not found

Run:

```bash
codex --help
```

If you use a custom command path, update `CODEX_COMMAND`.

### Message receive works poorly or not at all

Check:

- the app version has been published after permission changes
- the chat is a private chat
- the message type is text
- the sender is listed in `ALLOWED_OPEN_IDS`

### Attachment delivery fails

Check:

- the path is relative to the workspace root
- the file exists
- the file is smaller than 30 MB
- the file stays inside `CODEX_WORKSPACE_ROOT`

## Limitations

- Private chat text messages only
- One active task at a time
- Single fixed workspace root
- Attachment delivery only supports existing local files inside the configured workspace

## Security Notes

- Keep `.env` local
- Limit `ALLOWED_OPEN_IDS` to trusted users only
- Prefer `workspace-write` unless you fully understand the impact of broader sandbox permissions

## License

Licensed under GNU GPL v3.0 only. Copyright (C) 2026 diffhuang.
