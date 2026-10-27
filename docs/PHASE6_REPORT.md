# Phase 6 — Groups, Channels, and Membership History

## Implemented on `phase6/groups-channels`
- Migration `0008_phase6_groups_channels.sql`: group visibility/join policy/archive metadata, expiring direct invitations, membership-history records, and separate channel, channel-member, channel-post, and channel-history tables.
- Group APIs: owner/admin policy control, owner-only archive/unarchive and ownership transfer, invitations accepted only by the invited account, and permission-limited membership-history reads.
- Channel APIs: create/list own channels, public+open join flow, role-restricted publishing, membership-only post reads, owner-only role changes and ownership transfer, and role-limited history reads.
- Existing group/chat UI is preserved; these new channel APIs are a backend foundation and are not yet exposed as a complete dedicated channel UI.

## Security notes
- All endpoints use the existing authentication middleware and account suspension gate.
- Membership and channel reads require membership; subscriber publishing and non-owner role changes are rejected server-side.
- Invitations are bound to the authenticated invitee and expire after seven days.
- This pass does not claim full acceptance: legacy group mutations need further transaction-level auditing, and not every legacy join/leave path is yet recorded by the new history tables.

## Verification status
- Repository changes are committed on the phase-specific branch only.
- Full test suite, TypeScript typecheck, production build, and migration application against PostgreSQL/PGlite were not executed in this remote GitHub-only editing pass.
- No production database was changed; `main` was not modified or merged.
