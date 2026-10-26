# Phase 4 — Core Messaging

## Implemented in this branch
- Per-recipient delivery/read receipt storage via additive migration `0005_message_receipts.sql`.
- Message send creates receipt rows for current chat members other than the sender.
- Loading a chat marks eligible incoming messages delivered; opening a chat marks receipts read only when the recipient has enabled read receipts.
- Message payloads expose `receiptStatus` (`sent`, `delivered`, `read`, or `null` for received messages). Group status is `read` when all tracked recipients have read, `delivered` when at least one has received it, otherwise `sent`.
- Edit/delete lookups require current chat membership in addition to original-author checks.
- Added static invariant tests for migration, receipts, preference handling, response typing, and membership checks.

## Compatibility notes
- Migration is additive and preserves existing messages. Existing historical messages without receipt rows report `sent` for their sender until receipt rows exist for newly sent messages.
- Receipt state is exposed in the API; this phase does not claim that the client UI has been updated to draw double-check icons.

## Verification
- The test file is included under the existing `scripts/**/*.test.mjs` test pattern.
- CI, typecheck, and the full test suite must still run against the committed branch before merging.
