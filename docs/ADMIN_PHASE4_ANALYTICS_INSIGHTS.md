# Nini Chat — Phase 4: Analytics & Insights

## Delivered
- Analytics overview supports validated 7-, 30-, and 90-day ranges.
- KPI cards show signups, engaged users, messages, and stories for the selected period.
- Each KPI includes a comparison with the immediately preceding period of equal length. A percentage is shown only when the previous period has a non-zero baseline; otherwise it displays an em dash.
- Daily trend chart plots messages, engaged users, and signups; a separate 24-hour chart shows message distribution and peak hour.
- Existing all-time totals, 30-day active/inactive snapshot, messages-per-user metric, and per-user analytics remain available.
- Persian and English labels, localized number formatting, loading/error states, and accessible chart descriptions are included.
- Analytics endpoint validates range input and requires the server-side `audit.read` permission through `requireAuditReader`.
- No new database schema or migration is needed; metrics are calculated from existing `profiles`, `messages`, and `statuses` tables.

## Metric definitions
- **Engaged users:** distinct users who sent at least one non-deleted message during the selected period. This is not a proxy for all app opens or online presence.
- **Daily active users in the trend:** distinct message senders per calendar day.
- **Signups:** profiles created on each day / during the selected period.
- **Messages and stories:** non-deleted messages and published status rows created during the period.
- **Period comparison:** selected period versus the immediately preceding period of the same duration.
- **Peak hour:** hour of day with the highest count of non-deleted messages in the selected period; timestamps use the database session timezone.
- Existing `active_30d` and `inactive_30d` remain based on `profiles.last_seen_at` and are retained as a separate 30-day snapshot.

## Privacy and performance
- No private message bodies, credentials, IP addresses, or authentication secrets are returned by the analytics endpoints.
- User-level analytics remains behind the existing admin audit-reader authorization.
- Range is capped at 90 days to bound query work; daily aggregations are computed from indexed timestamp columns where available.
- Bulk direct-message functionality was preserved and is not part of the analytics aggregation path.

## Validation
- Focused regression tests cover input bounds, server-side permission checks, comparison fields, daily engagement, and UI range controls.
- Run `npm test`, `npm run typecheck`, and the production build in GitHub Actions.
- Manual Preview review remains outstanding because no Preview URL is available.
