# Phase 6 — Groups, Channels, and Membership History

## Implemented on `phase6/groups-channels`
- Migration `0008_phase6_groups_channels.sql`: group visibility/join policy/archive metadata, expiring direct invitations, membership-history records, and separate channel, channel-member, channel-post, and channel-history tables.
- Group APIs: owner/admin policy control, owner-only archive/unarchive and ownership transfer, invitations accepted only by the invited account, and permission-limited membership-history reads.
- Channel APIs: create/list own channels, public+open join flow, role-restricted publishing, membership-only post reads, owner-only role changes and ownership transfer, and role-limited history reads.
- Added a dedicated Channels panel to the messenger menu with channel creation, browsing public channels, joining/leaving, reading posts, publishing for owner/admin/editor, and owner archive controls.
- Added public channel discovery, channel leave/archive endpoints. Existing group/chat UI remains integrated.

## Security notes
- All endpoints use the existing authentication middleware and account suspension gate.
- Membership and channel reads require membership; subscriber publishing and non-owner role changes are rejected server-side.
- Invitations are bound to the authenticated invitee and expire after seven days.
- Existing group creation/add/remove/leave paths write membership-history rows where applicable. Full transaction-level auditing of all legacy membership flows and formal acceptance tests remain important.

## Verification status
- Repository changes are committed on the phase-specific branch only.
- Typecheck, full test suite, production build, and applying the migration against PostgreSQL/PGlite must still be confirmed by repository CI. No production database was changed in this editing pass.
- No production database was changed; `main` was not modified or merged.
