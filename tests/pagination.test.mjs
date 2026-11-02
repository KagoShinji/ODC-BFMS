import test from "node:test";
import assert from "node:assert/strict";
import { paginate } from "../src/lib/pagination.ts";

test("pagination retains all records, covers every page once and reports ranges", () => {
  const records = Array.from({ length: 23 }, (_, i) => ({ id: i + 1 }));
  const pages = [1, 2, 3].map((page) => paginate(records, page, 10));
  assert.deepEqual(
    pages.flatMap((page) => page.items),
    records,
  );
  assert.deepEqual(
    pages.map((page) => [page.start, page.end, page.total, page.pageCount]),
    [
      [1, 10, 23, 3],
      [11, 20, 23, 3],
      [21, 23, 23, 3],
    ],
  );
  assert.equal(records.length, 23);
});
test("empty data and deletions cannot leave a page out of range", () => {
  assert.deepEqual(paginate([], 10, 10), {
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
    pageCount: 1,
    start: 0,
    end: 0,
  });
  assert.equal(paginate(Array(11).fill(1), 3, 10).page, 2);
  assert.equal(paginate([1], -1, 10).page, 1);
  assert.equal(paginate([1], NaN, 10).page, 1);
});
test("page size choices are bounded and preserve partial final pages", () => {
  const records = Array.from({ length: 101 }, (_, i) => i);
  for (const size of [10, 25, 50, 100]) {
    assert.equal(paginate(records, 1, size).items.length, size);
    assert.equal(paginate(records, 999, size).end, 101);
  }
  assert.equal(paginate(records, 1, 0).pageSize, 10);
});
