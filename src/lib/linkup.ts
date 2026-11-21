/** A vibe host cannot approve a guest after every seat has been taken. */
export function canApproveJoinRequest(currentParticipants: number, crewSize: number): boolean {
  return currentParticipants < crewSize;
}

const privateVenueTerms =
  /\b(?:my|our|someone's|friends?'s|private)\s+(?:home|house|place|flat|apartment|bedroom)\b|\bhouse\s+part(?:y|ies)\b|\bhome\s+part(?:y|ies)\b/i;

/**
 * Accept any typed meeting place, as long as it isn't someone's home or a house party.
 * (The database runs the same check, see supabase/05_linkup_fixes.sql.)
 */
export function isPublicVenue(venue: string): boolean {
  const normalizedVenue = venue.trim();
  return normalizedVenue.length > 1 && !privateVenueTerms.test(normalizedVenue);
}
