import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeIranPhone, toSmsIrMobile } from "../phone.ts";

test("normalizes common Iranian mobile formats to E.164", () => {
  assert.equal(normalizeIranPhone("0912 345 6789"), "+989123456789");
  assert.equal(normalizeIranPhone("9123456789"), "+989123456789");
  assert.equal(normalizeIranPhone("989123456789"), "+989123456789");
  assert.equal(normalizeIranPhone("+98 (912) 345-6789"), "+989123456789");
});

test("rejects malformed or non-Iranian numbers for SMS.ir", () => {
  assert.equal(normalizeIranPhone("12345"), null);
  assert.equal(normalizeIranPhone("+12025550123"), null);
  assert.equal(normalizeIranPhone("0912345678"), null);
});

test("formats E.164 Iranian numbers for SMS.ir", () => {
  assert.equal(toSmsIrMobile("+989123456789"), "09123456789");
  assert.throws(() => toSmsIrMobile("+12025550123"), /invalid_iranian_mobile/);
});
