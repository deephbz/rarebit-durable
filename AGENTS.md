# Rarebit Durable agent entry point

`@hypercarrier/rarebit-durable` maps durable conversation history onto
Rarebit selection, receipts, and recall for hosts built on pi-durable. It is a
small library, not a runtime. The host owns storage, scheduling, and models.

## Read order

1. [README.md](README.md): purpose, install, API, status, known issues.
2. [src/index.ts](src/index.ts): the whole implementation, with its design
   comments.
3. [docs/maintainers/releasing.md](docs/maintainers/releasing.md): releases.

## Rules

- Keep the doc kind `rarebit.state` unchanged. Hosts replay old logs.
- Pin `@hypercarrier/rarebit` and the `@earendil-works/*` peers exactly.
- Commits use the GitHub identity `deephbz` with its noreply address. A commit
  message, pull request, tag, or tracked file carries no agent session or
  thread ID.
- Tracked files carry no local path, host name, personal email, or real session
  data. Use synthetic examples.
- This repository is public. Run
  `git-privacy-scan --ref HEAD --base "$(git config privacy.baseline)" range`
  before every push. Never print a detected value.
- A release is a pushed version tag; CI publishes
  ([releasing](docs/maintainers/releasing.md)).
