import test from "node:test";
import assert from "node:assert/strict";
import {
  auditEventFromRow,
  auditMatches,
  auditActorKey,
  auditDate,
  filterAudit,
  groupAuditByDate,
} from "../src/lib/audit.ts";

const row = {
  id: "event-1",
  actor_id: "user-42",
  actor_name: "Maria Santos",
  actor_email: "maria@example.test",
  action: "voucher_approved",
  subject_type: "voucher",
  detail: { version: 2 },
  created_at: "2026-11-02T08:00:00Z",
};
test("audit identity remains independent of the target of an action", () => {
  const event = auditEventFromRow({ ...row, detail: { staff_name: "New Staff" } });
  assert.equal(event.actor, "Maria Santos");
  assert.equal(event.actorEmail, "maria@example.test");
  assert.equal(event.actorId, "user-42");
  assert.match(event.detail, /New Staff/);
});
test("unresolved profiles keep their real account identity instead of a generic staff label", () => {
  assert.equal(auditEventFromRow({ ...row, actor_name: null }).actor, "maria@example.test");
  const missing = auditEventFromRow({ ...row, actor_name: null, actor_email: null });
  assert.equal(missing.actor, "Account user-42");
  assert.equal(missing.actorEmail, undefined);
  assert.equal(missing.actorId, "user-42");
});
test("audit search includes name, account email, ID, action and details and accepts old events", () => {
  const event = auditEventFromRow(row);
  for (const query of ["MARIA", "maria@example.test", "user-42", "voucher approved", "version: 2"])
    assert.equal(auditMatches(event, query), true);
  assert.equal(auditMatches(event, "someone else"), false);
  assert.equal(
    auditMatches(
      {
        id: "old",
        actor: "Demo user",
        action: "Added",
        subject: "Old",
        detail: "",
        at: row.created_at,
      },
      "demo",
    ),
    true,
  );
});

const noFilters = { query: "", action: "", account: "", from: "", to: "", order: "newest" };
const history = [
  { ...auditEventFromRow(row), id: "earlier", at: "2026-11-01T15:59:00Z" },
  { ...auditEventFromRow(row), id: "midnight", at: "2026-11-01T16:00:00Z" },
  {
    ...auditEventFromRow(row),
    id: "later",
    actorId: "another-user",
    actorEmail: "other@example.test",
    action: "Payment recorded",
    at: "2026-11-02T03:00:00Z",
  },
];
test("Manila date labels are explicit and stable at midnight and noon", () => {
  assert.deepEqual(auditDate("2026-11-01T16:00:00Z"), {
    key: "2026-11-02",
    day: "2 Nov 2026",
    time: "12:00 AM",
    full: "2 Nov 2026, 12:00 AM",
  });
  assert.equal(auditDate("2026-11-02T04:00:00Z").time, "12:00 PM");
  assert.equal(auditDate("invalid").key, "");
});
test("account, action, search and inclusive Manila date range combine without changing history", () => {
  const filtered = filterAudit(history, {
    ...noFilters,
    query: "MARIA",
    action: "Voucher approved",
    account: auditActorKey(history[0]),
    from: "2026-11-02",
    to: "2026-11-02",
  });
  assert.deepEqual(
    filtered.map((event) => event.id),
    ["midnight"],
  );
  assert.equal(history[0].id, "earlier");
  assert.deepEqual(
    filterAudit(history, { ...noFilters, from: "2026-11-03", to: "2026-11-01" }),
    [],
  );
});
test("sorting and date groups follow the chosen direction and keep invalid dates last", () => {
  const newest = filterAudit(history, noFilters);
  assert.deepEqual(
    newest.map((event) => event.id),
    ["later", "midnight", "earlier"],
  );
  assert.deepEqual(
    groupAuditByDate(newest).map((group) => [group.key, group.events.length]),
    [
      ["2026-11-02", 2],
      ["2026-11-01", 1],
    ],
  );
  assert.deepEqual(
    filterAudit(history, { ...noFilters, order: "oldest" }).map((event) => event.id),
    ["earlier", "midnight", "later"],
  );
  assert.equal(
    filterAudit([...history, { ...history[0], id: "invalid", at: "bad-date" }], {
      ...noFilters,
      order: "oldest",
    }).at(-1).id,
    "invalid",
  );
});
test("identical names do not merge accounts with distinct IDs", () => {
  assert.notEqual(auditActorKey(history[0]), auditActorKey(history[2]));
  assert.equal(
    auditActorKey({ ...history[0], actorId: undefined, actorEmail: "MARIA@example.test" }),
    "email:maria@example.test",
  );
});
