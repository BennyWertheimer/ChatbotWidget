/**
 * Test script for SealX policy and lead validation.
 * Run: pnpm run test:sealx (or tsx scripts/test-sealx-policy.ts) with backend running.
 * Requires BACKEND_URL env or defaults to http://localhost:3001.
 */
const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";

async function chat(messages: { role: string; content: string }[]): Promise<string> {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error(`chat ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { reply: string };
  return data.reply;
}

async function lead(body: Record<string, string>): Promise<{ ok: boolean; status: number; error?: string }> {
  const res = await fetch(`${BASE}/lead`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, error: (data as { error?: string }).error };
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function main() {
  console.log("Backend URL:", BASE);
  let passed = 0;
  let failed = 0;

  // 1) Off-topic: should refuse and redirect (no SealX answer, offer handoff)
  try {
    const reply = await chat([{ role: "user", content: "Who won the Super Bowl?" }]);
    const refuses = /only help with|can only help|SealX|connect you with the team/i.test(reply);
    const noExternalCite = !/https?:\/\/(?!sealx\.com)[a-z0-9.-]+\//i.test(reply);
    assert(refuses, "Expected refuse/redirect for off-topic, got: " + reply.slice(0, 120));
    assert(noExternalCite, "Reply must not cite non-sealx.com URLs");
    console.log("  [PASS] Off-topic question refused/redirected");
    passed++;
  } catch (e) {
    console.log("  [FAIL] Off-topic:", (e as Error).message);
    failed++;
  }

  // 2) SealX FAQ: if RAG has content, should answer from chunks (or refuse if no chunks)
  try {
    const reply = await chat([{ role: "user", content: "What services does SealX offer?" }]);
    const hasSealXOrRefuse = /SealX|services|connect you with the team|only help/i.test(reply);
    const noNonSealxUrl = (reply.match(/https?:\/\/[a-z0-9.-]+\//gi) || []).every((u) => /sealx\.com/i.test(u));
    assert(hasSealXOrRefuse, "Expected SealX-related answer or refuse, got: " + reply.slice(0, 120));
    assert(noNonSealxUrl, "Reply must not cite non-sealx.com sources");
    console.log("  [PASS] SealX FAQ answered or refused without external cites");
    passed++;
  } catch (e) {
    console.log("  [FAIL] SealX FAQ:", (e as Error).message);
    failed++;
  }

  // 3) Reply must never cite non-sealx.com (already checked above; one more)
  try {
    const reply = await chat([{ role: "user", content: "Tell me about your company." }]);
    const urls = reply.match(/https?:\/\/[a-z0-9.-]+\//gi) || [];
    const allSealx = urls.every((u) => /sealx\.com/i.test(u));
    assert(allSealx, "All URLs in reply must be sealx.com; got: " + urls.join(", "));
    console.log("  [PASS] No non-sealx.com citations");
    passed++;
  } catch (e) {
    console.log("  [FAIL] Citations:", (e as Error).message);
    failed++;
  }

  // 4) Lead validation: invalid email
  try {
    const r = await lead({ name: "Test", email: "invalid", phone: "5551234567" });
    assert(!r.ok && r.status === 400, "Expected 400 for invalid email, got " + r.status);
    console.log("  [PASS] Invalid email rejected");
    passed++;
  } catch (e) {
    console.log("  [FAIL] Invalid email:", (e as Error).message);
    failed++;
  }

  // 5) Lead validation: invalid phone (not 10 digits)
  try {
    const r = await lead({ name: "Test", email: "a@b.co", phone: "123" });
    assert(!r.ok && r.status === 400, "Expected 400 for invalid phone, got " + r.status);
    console.log("  [PASS] Invalid phone rejected");
    passed++;
  } catch (e) {
    console.log("  [FAIL] Invalid phone:", (e as Error).message);
    failed++;
  }

  // 6) Lead validation: valid (may fail if DB rejects duplicate or schema)
  try {
    const r = await lead({
      name: "Test User",
      email: "test@example.com",
      phone: "5551234567",
    });
    assert(r.ok && r.status === 200, "Expected 200 for valid lead, got " + r.status + (r.error ? " " + r.error : ""));
    console.log("  [PASS] Valid lead accepted");
    passed++;
  } catch (e) {
    console.log("  [FAIL] Valid lead:", (e as Error).message);
    failed++;
  }

  console.log("\nResult:", passed, "passed,", failed, "failed");
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
