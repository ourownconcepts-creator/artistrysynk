/**
 * ArtistrySynk Competition Domain
 *
 * Competition is intentionally domain-neutral. The first implementation is
 * creative competitions, while the model leaves room for sports/football,
 * gaming and other competition domains without making them dependencies.
 */
export type CompetitionDomain = "CREATIVE" | "SPORTS" | "GAMING" | "OTHER";
export type CompetitionType =
  "TALENT_HUNT" | "TOURNAMENT" | "TRIAL" | "SHOWCASE" | "LEAGUE" | "CUSTOM";
export type CompetitionStatus =
  | "DRAFT"
  | "REGISTRATION_OPEN"
  | "REGISTRATION_CLOSED"
  | "IN_PROGRESS"
  | "VOTING_OPEN"
  | "COMPLETED"
  | "ARCHIVED";
export type CompetitionParticipantType =
  "USER" | "CREATIVE_PROFILE" | "ATHLETE_PROFILE" | "TEAM" | "ORGANIZATION";

export interface Competition {
  id: string;
  name: string;
  slug: string;
  domain: CompetitionDomain;
  type: CompetitionType;
  status: CompetitionStatus;
  description?: string;
  startsAt?: string;
  endsAt?: string;
}

export interface CompetitionParticipant {
  competitionId: string;
  participantType: CompetitionParticipantType;
  participantId: string;
  profileId?: string;
  categoryId?: string;
  status?: string;
}

/**
 * Domain-specific rules belong above this core model.
 *
 * Creative talent hunt:
 *   participant = CREATIVE_PROFILE
 *   entry = submission/media
 *
 * Future football tournament:
 *   participant = TEAM or ATHLETE_PROFILE
 *   entry = fixture/match
 *
 * The competition engine must not assume that every participant submits
 * creative media or that every competition uses public voting.
 */
export interface CompetitionDomainAdapter {
  domain: CompetitionDomain;
  supportedTypes: CompetitionType[];
  participantTypes: CompetitionParticipantType[];
}
