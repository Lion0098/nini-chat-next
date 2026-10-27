# Phase 7 release gate

Do not mark Phase 7 complete until each item has evidence recorded.

## Application verification
- [ ] Authenticated users can submit an appeal and view only their own appeal history and moderator response.
- [ ] Admin/moderator appeal decisions require a review note.
- [ ] Email and phone verification settings are enforced by the actual authentication flow, not only stored in settings.
- [ ] Signup/OTP limits are tested behind the production reverse proxy.

## Operational verification
- [ ] Database and required Phase 7 tables are healthy.
- [ ] Email provider health is checked using a non-delivering/provider-supported health check.
- [ ] SMS provider health is checked without sending an unsolicited OTP.
- [ ] Upload storage can write/read a temporary object and remove it.
- [ ] A backup is restored successfully in a disposable environment.
- [ ] GitHub Actions passes typecheck, tests, migration contract checks, and production build.

Record date, environment, procedure, and result for each item. Never report unconfigured integrations as healthy. Never restore a backup over production as part of this checklist.
