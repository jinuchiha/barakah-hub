-- ════════════════════════════════════════════════════════════════════
-- Barakah Hub — missing query-path indexes
-- Identified in RE_AUDIT.md Phase 2.
-- ════════════════════════════════════════════════════════════════════

-- castVote() reads cases by id (covered by PK), but we also filter
-- on applicant_id elsewhere ("am I the applicant?"). Index it.
CREATE INDEX IF NOT EXISTS cases_applicant_idx ON cases(applicant_id);

-- The /messages inbox queries by to_id frequently. members.id is
-- already indexed, but messages.to_id wasn't.
CREATE INDEX IF NOT EXISTS messages_to_idx ON messages(to_id);
