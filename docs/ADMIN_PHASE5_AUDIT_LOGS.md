# Nini Chat — Phase 5: Audit Logs

## Delivered
- Retained the existing append-only `admin_audit_events` ledger and database mutation guard; no schema migration was required.
- Expanded `adminListAuditEvents` with exact action filtering, inclusive `fromDate` / `toDate` calendar filters, bounded page size (1–100), and stable keyset pagination using `(created_at, id)`.
- Validated date syntax and ordering, and validated opaque cursor payloads before they reach SQL.
- Kept audit reads behind the server-side `audit.read` permission check. UI visibility is not used as authorization.
- Added recursive metadata redaction for sensitive key names (passwords, passphrases, tokens, secrets, OTPs, API keys, credentials, authorization, cookies, sessions, and private keys), including nested objects and arrays. Metadata depth, key count, array length, and string length are bounded.
- Updated the admin audit screen with action/date filters, infinite keyset pages, loading/error/retry states, and a load-more control.
- Added regression coverage for the existing security contract and the new filtering, pagination, redaction, and UI behavior.

## Query and pagination behavior
- Search continues to match action, actor display name, target display name, and target user ID.
- `fromDate` includes the selected day; `toDate` includes the selected day by using an exclusive next-day boundary.
- Ordering is deterministic: newest `created_at`, then highest event ID.
- The API fetches one extra row to determine `hasMore`; `nextCursor` is emitted only when another page exists.
- Page size is capped at 100. The admin screen requests 50 events per page.

## Security and operations
- Every read requires `audit.read` on the server.
- The existing database trigger continues to reject UPDATE and DELETE against `admin_audit_events`.
- Sensitive metadata is recursively redacted both before persistence and again before returning historical records, protecting older rows written before this enhancement.
- No new migration was introduced and no migration was run on the VPS.
- Manual Preview validation remains pending because a Preview URL is not available in this workflow.

## Validation
- `scripts/admin-security-phase5.test.mjs`: 11 tests passed in the isolated test harness.
- GitHub Actions typecheck, full test suite, migration checks, and production build are the authoritative repository-level validation and are checked after commit.
