// Smoke tests over synthetic durable history: the package maps durable entries onto the Rarebit core and derives
// receipts through an injected model call. No pi-durable runtime or network is involved.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { EntryRecord } from "@earendil-works/pi-durable";
import { deriveSummary, deriveTitle, freshness, rarebitExtension, select } from "../src/index.ts";

const T0 = Date.UTC(2026, 0, 1);
const user = (id: number, text: string) =>
	({ id, kind: "pi.user", model: [{ role: "user", content: [{ type: "text", text }], timestamp: T0 + id }] }) as unknown as EntryRecord;
const assistant = (id: number, text: string, stopReason: "stop" | "toolUse") =>
	({ id, kind: "pi.assistant", model: [{ role: "assistant", content: [{ type: "text", text }], stopReason, timestamp: T0 + id }] }) as unknown as EntryRecord;
const other = (id: number, kind: string, text: string) =>
	({ id, kind, model: [{ role: "user", content: [{ type: "text", text }], timestamp: T0 + id }] }) as unknown as EntryRecord;

const history = [
	user(1, "Add a retry to the uploader"),
	assistant(2, "Reading the uploader first.", "toolUse"),
	other(3, "pi.tool-result", "file contents that are not evidence"),
	other(4, "team.notice", "Worker delivered a Task"),
	assistant(5, "Retry added with backoff.", "stop"),
];

test("select keeps user, continuation, and stop prose with durable entry IDs and drops machine traffic", () => {
	const { occurrences } = select(history);
	assert.deepEqual(
		occurrences.map((o) => [o.sourceEntryId, o.outcome]),
		[["1", "user"], ["2", "continuation"], ["5", "stop"]],
	);
	assert.equal(occurrences[0]!.timestamp, new Date(T0 + 1).toISOString());
});

const reply = (sessionStatus: string, statusReason: string, summary = "Retry added.") =>
	JSON.stringify({ summary, sessionStatus, statusReason });

test("manual Summary skips eligibility, strips a Markdown fence, and covers the last occurrence", async () => {
	const receipt = await deriveSummary({
		entries: history,
		boundary: "manual",
		complete: async () => ({ text: `\`\`\`json\n${reply("finished", "all_requests_accomplished")}\n\`\`\``, model: "test/model" }),
		now: () => 7,
	});
	assert.ok(receipt && receipt.status === "summarized");
	assert.equal(receipt.sessionStatus, "finished");
	assert.equal(receipt.coveredEntryId, "5");
	assert.equal(receipt.at, 7);
	assert.equal(freshness({ summary: receipt }, "5"), true);
	assert.equal(freshness({ summary: receipt }, "9"), false);
});

test("a short settled Session is ineligible and spends no model call", async () => {
	let calls = 0;
	const receipt = await deriveSummary({
		entries: history,
		boundary: "agent_settled",
		complete: async () => (calls++, { text: "", model: "test/model" }),
	});
	assert.equal(receipt?.status, "ineligible");
	assert.equal(calls, 0);
});

test("a malformed model answer becomes an error receipt instead of throwing", async () => {
	const receipt = await deriveSummary({
		entries: history,
		boundary: "manual",
		complete: async () => ({ text: "not json", model: "test/model" }),
	});
	assert.equal(receipt?.status, "error");
	assert.equal(await deriveSummary({ entries: [], boundary: "manual", complete: async () => assert.fail("no evidence") }), undefined);
});

test("deriveTitle names the Title after the first user message", async () => {
	const title = await deriveTitle({ entries: history, complete: async () => ({ text: "Title: Uploader retry", model: "test/model" }), now: () => 3 });
	assert.deepEqual(title, { title: "Uploader retry", sourceEntryId: "1", model: "test/model", at: 3 });
});

test("rarebit_recall rereads matching evidence from the host-supplied history", async () => {
	const extension = rarebitExtension(async () => history);
	const recall = (extension as any).tools.find((t: any) => t.name === "rarebit_recall");
	const result = await recall.execute({ query: "retry", role: "user" }, {}, {});
	assert.deepEqual(result.details, { total: 3, matches: 1, shown: ["1"] });
	assert.match(result.output[0].text, /1 of 3 Rarebits match/);
});
