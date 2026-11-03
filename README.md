# @hypercarrier/rarebit-durable

Rarebit on [pi-durable](https://www.npmjs.com/package/@earendil-works/pi-durable):
sparse conversational evidence, Summary and Title receipts, and recall over the
full durable transcript. Selection reuses
[`@hypercarrier/rarebit`](https://www.npmjs.com/package/@hypercarrier/rarebit)
unchanged.

## Install

```sh
npm install @hypercarrier/rarebit-durable
```

The package needs a pi-durable host. Install these peers at exactly `1.5.0`:
`@earendil-works/pi-durable`, `@earendil-works/pi-ai`,
`@earendil-works/pi-schema`, and `@earendil-works/chord`. It depends on `@hypercarrier/rarebit` `0.5.2`. Node
22.19 or later.

## API

- `toPiBranch(entries)`, `select(entries)`: map durable entries (user and
  assistant only; `team.notice` and other extension entries excluded) onto the
  canonical Rarebit selection. The input is the full durable history, so
  compaction never hides evidence.
- `RarebitDoc` (`rarebit.state`, conversation scope, fork `initial`): the latest
  Summary receipt, the last attempt (summarized, ineligible, or error), the
  in-flight run (with the node boot id), the trigger, and the Title.
- `deriveSummary`, `deriveTitle`: pure derivations over an injected `complete()`
  model call. `agent_settled` applies the eligibility policy; `manual` skips it.
  `freshness` says whether a Summary covers the latest evidence.
- `rarebitExtension(source)`: the `rarebit_recall` tool (query, role, limit;
  replay-safe) and the `rarebit` prompt section.

## Status

Version 0.1.0 is the first release. The API follows HyperCarrier's AmPi host
and may change in minor versions until 1.0.

- 0.1.0 was published by hand and has no npm provenance. Later versions publish
  from CI with provenance.
- Standalone CI proves: the TypeScript typecheck, a smoke test over synthetic
  durable history (selection, Summary and Title receipts, recall), and the
  packed file list, a plain Node import of the built `dist`, and a TypeScript
  consumer compile, on Node 22 and 24.
- CI does not prove behavior inside a running pi-durable node. The end-to-end
  tests need the AmPi daemon and stay in HyperCarrier (private):
  `apps/ampi/test/rarebit.test.ts`, `rarebit-close-jobs.test.ts`,
  `node-close-dispatch.test.ts`, `node-close-owners.test.ts`, `crash-g.test.ts`,
  and `durable-l3/node.ts`.
- The handwritten `src/rarebit-core.d.ts` declares three exports that the pinned
  `@hypercarrier/rarebit` 0.5.2 types omit. Remove it when upstream types catch
  up.
