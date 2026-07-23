# Unmounted dispute screens — archived 23 July 2026

Neither was referenced by `App.tsx` or any component, so no route reached them.

## `AdminDisputePanel.tsx`

Called `GET /api/errands/disputes/list/all` and
`POST /api/errands/:id/resolve-dispute`. **Both routes were removed on 23 July**
— they were a shadow dispute system that wrote `errands.status = 'disputed'` and
`payment_released_to` straight onto the errand and created no `disputes` row at
all, and `resolve-dispute` was guarded by `authMiddleware` plus the comment
`// TODO: Check if user is admin` and nothing else. So this screen is now broken
as well as unreachable.

## `DisputeManagementDashboard.tsx`

The only caller anywhere of `POST /api/disputes/:id/verdict`. That route still
exists but no longer behaves as this screen assumed: it used to write
`status = 'VERDICT_ISSUED'` and stop, producing a dispute that could be neither
appealed nor paid. It now translates onto the one decision path.

## The live screen

`frontend/src/pages/admin/Disputes.tsx`, routed at `/admin/dashboard/disputes`.
It covers the decision, and `components/admin/DisputeSettlementPanel.tsx` covers
everything after it — appeal review, settlement readiness, the release button.
Parties see `components/disputes/DisputeOutcomeAndAppeal.tsx`.
