// Single source of truth for how IDs are displayed across the app.
// The backend generates and stores these; the frontend should ONLY display them,
// never fabricate its own format.
//
// Errand ID:  ER<year><categoryCode>-<4char>  e.g. ER26HM-1O6O   (errand.formatted_id)
// User ID:    formatted_user_id from the backend e.g. SG376-002A
// Offer ID:   the offer's own formatted id, else the errand id it belongs to

/** Standard errand ID, e.g. "ER26HM-1O6O". Empty string if the backend hasn't provided one. */
export function formatErrandId(errand: any): string {
  if (!errand) return '';
  return errand.formatted_id || errand.formattedId || errand.errandId || '';
}

/** Standard user ID, e.g. "SG376-002A". */
export function formatUserId(user: any): string {
  if (!user) return '';
  return user.formatted_user_id || user.formattedUserId || user.userId || '';
}

/** Standard offer/bid ID. Falls back to the errand ID it belongs to. */
export function formatOfferId(bid: any): string {
  if (!bid) return '';
  return bid.formatted_id || bid.formattedId || formatErrandId(bid.errand) || '';
}
