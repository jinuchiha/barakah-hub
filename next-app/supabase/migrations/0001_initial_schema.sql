-- ════════════════════════════════════════════════════════════════════
-- BalochSath — initial schema + Row Level Security policies
-- Apply via:  supabase db push   (or via dashboard SQL editor)
-- ════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────
-- ENUMS
-- ──────────────────────────────────────────────────────────────────
CREATE TYPE role AS ENUM ('admin', 'member');
CREATE TYPE member_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE fund_pool AS ENUM ('sadaqah', 'zakat', 'qarz');
CREATE TYPE case_status AS ENUM ('voting', 'approved', 'rejected', 'disbursed');
CREATE TYPE case_type AS ENUM ('gift', 'qarz');

-- ──────────────────────────────────────────────────────────────────
-- TABLES (mirror lib/db/schema.ts)
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE members (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id        UUID UNIQUE,                                -- references auth.users(id)
  username       TEXT NOT NULL UNIQUE,
  name_ur        TEXT NOT NULL,
  name_en        TEXT NOT NULL,
  father_name    TEXT NOT NULL,
  clan           TEXT,
  relation       TEXT,
  parent_id      UUID REFERENCES members(id) ON DELETE SET NULL,
  role           role NOT NULL DEFAULT 'member',
  status         member_status NOT NULL DEFAULT 'pending',
  phone          TEXT,
  city           TEXT,
  province       TEXT,
  monthly_pledge INTEGER NOT NULL DEFAULT 1000,
  color          TEXT NOT NULL DEFAULT '#c9a84c',
  photo_url      TEXT,
  deceased       BOOLEAN NOT NULL DEFAULT FALSE,
  needs_setup    BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at      DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX members_parent_idx   ON members(parent_id);
CREATE INDEX members_father_idx   ON members(father_name);
CREATE INDEX members_city_idx     ON members(city);
CREATE INDEX members_province_idx ON members(province);
CREATE INDEX members_auth_idx     ON members(auth_id);

CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount          INTEGER NOT NULL CHECK (amount > 0),
  pool            fund_pool NOT NULL DEFAULT 'sadaqah',
  month_label     TEXT NOT NULL,
  paid_on         DATE NOT NULL DEFAULT CURRENT_DATE,
  note            TEXT,
  pending_verify  BOOLEAN NOT NULL DEFAULT FALSE,
  verified_by_id  UUID REFERENCES members(id),
  verified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX payments_member_idx  ON payments(member_id);
CREATE INDEX payments_month_idx   ON payments(month_label);
CREATE INDEX payments_pending_idx ON payments(pending_verify);

CREATE TABLE cases (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id      UUID NOT NULL REFERENCES members(id),
  case_type         case_type NOT NULL,
  pool              fund_pool NOT NULL,
  category          TEXT NOT NULL,
  beneficiary_name  TEXT NOT NULL,
  relation          TEXT,
  city              TEXT,
  amount            INTEGER NOT NULL CHECK (amount > 0),
  reason_ur         TEXT NOT NULL,
  reason_en         TEXT NOT NULL,
  emergency         BOOLEAN NOT NULL DEFAULT FALSE,
  doc               TEXT,
  return_date       DATE,
  status            case_status NOT NULL DEFAULT 'voting',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at       TIMESTAMPTZ
);

CREATE TABLE votes (
  case_id    UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  member_id  UUID NOT NULL REFERENCES members(id),
  vote       BOOLEAN NOT NULL,
  voted_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (case_id, member_id)
);

CREATE TABLE loans (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id        UUID NOT NULL REFERENCES members(id),
  amount           INTEGER NOT NULL CHECK (amount > 0),
  paid             INTEGER NOT NULL DEFAULT 0 CHECK (paid >= 0),
  purpose          TEXT NOT NULL,
  pool             fund_pool NOT NULL DEFAULT 'qarz',
  city             TEXT,
  issued_on        DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_return  DATE,
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  case_id          UUID REFERENCES cases(id),
  CHECK (paid <= amount)
);

CREATE TABLE repayments (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id   UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  amount    INTEGER NOT NULL CHECK (amount > 0),
  paid_on   DATE NOT NULL DEFAULT CURRENT_DATE,
  note      TEXT
);

CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id  UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  ur            TEXT NOT NULL,
  en            TEXT NOT NULL,
  type          TEXT NOT NULL,
  read          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_recipient_idx ON notifications(recipient_id);
CREATE INDEX notifications_unread_idx    ON notifications(recipient_id, read);

CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id     UUID NOT NULL REFERENCES members(id),
  to_id       UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  subject     TEXT NOT NULL,
  body        TEXT NOT NULL,
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES members(id),
  target_id   UUID REFERENCES members(id),
  action      TEXT NOT NULL,
  detail      TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_actor_idx   ON audit_log(actor_id);
CREATE INDEX audit_action_idx  ON audit_log(action);
CREATE INDEX audit_created_idx ON audit_log(created_at DESC);

CREATE TABLE config (
  id                    INTEGER PRIMARY KEY DEFAULT 1,
  vote_threshold_pct    INTEGER NOT NULL DEFAULT 50 CHECK (vote_threshold_pct BETWEEN 30 AND 75),
  default_monthly_pledge INTEGER NOT NULL DEFAULT 1000,
  goal_amount           INTEGER NOT NULL DEFAULT 0,
  goal_label_ur         TEXT,
  goal_label_en         TEXT,
  goal_deadline         DATE,
  theme_palette         TEXT NOT NULL DEFAULT 'gold',
  org_name_ur           TEXT NOT NULL DEFAULT 'بیت المال بلوچ ساتھ',
  org_name_en           TEXT NOT NULL DEFAULT 'Bait ul Maal BalochSath',
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (id = 1)
);
INSERT INTO config (id) VALUES (1);

-- ──────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY — sadqa privacy enforced at DB layer
-- ──────────────────────────────────────────────────────────────────
ALTER TABLE members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases          ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans          ENABLE ROW LEVEL SECURITY;
ALTER TABLE repayments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE config         ENABLE ROW LEVEL SECURITY;

-- Helper: am I admin?
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM members
    WHERE auth_id = auth.uid() AND role = 'admin' AND status = 'approved'
  );
$$;

-- Helper: my member id
CREATE OR REPLACE FUNCTION my_member_id() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM members WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- members: everyone (logged-in) can read approved members; admin can read all + write
CREATE POLICY members_select_approved ON members FOR SELECT TO authenticated
  USING (status = 'approved' OR is_admin() OR auth_id = auth.uid());
CREATE POLICY members_insert_admin ON members FOR INSERT TO authenticated
  WITH CHECK (is_admin());
CREATE POLICY members_self_update ON members FOR UPDATE TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid() AND role = (SELECT role FROM members WHERE id = members.id));
CREATE POLICY members_admin_update ON members FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY members_admin_delete ON members FOR DELETE TO authenticated USING (is_admin());

-- payments: ★ SADQA PRIVACY — members see ONLY their own; admin sees all
CREATE POLICY payments_self_or_admin_read ON payments FOR SELECT TO authenticated
  USING (member_id = my_member_id() OR is_admin());
CREATE POLICY payments_self_insert ON payments FOR INSERT TO authenticated
  WITH CHECK (member_id = my_member_id() OR is_admin());
CREATE POLICY payments_admin_update ON payments FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY payments_admin_delete ON payments FOR DELETE TO authenticated USING (is_admin());

-- cases: visible to all approved members; create by self; update only by admin
CREATE POLICY cases_read_all ON cases FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY cases_self_insert ON cases FOR INSERT TO authenticated
  WITH CHECK (applicant_id = my_member_id());
CREATE POLICY cases_admin_update ON cases FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY cases_admin_delete ON cases FOR DELETE TO authenticated USING (is_admin());

-- votes: read all (transparency), insert your own only (one vote per case via PK)
CREATE POLICY votes_read_all ON votes FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY votes_self_insert ON votes FOR INSERT TO authenticated
  WITH CHECK (member_id = my_member_id());

-- loans + repayments: visible to involved member + admin
CREATE POLICY loans_self_or_admin_read ON loans FOR SELECT TO authenticated
  USING (member_id = my_member_id() OR is_admin());
CREATE POLICY loans_admin_write ON loans FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY repayments_via_loan ON repayments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM loans WHERE loans.id = repayments.loan_id AND (loans.member_id = my_member_id() OR is_admin())));
CREATE POLICY repayments_admin_write ON repayments FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- notifications: only your own
CREATE POLICY notifications_own ON notifications FOR ALL TO authenticated
  USING (recipient_id = my_member_id())
  WITH CHECK (recipient_id = my_member_id() OR is_admin());

-- messages: from-or-to me
CREATE POLICY messages_own ON messages FOR ALL TO authenticated
  USING (from_id = my_member_id() OR to_id = my_member_id())
  WITH CHECK (from_id = my_member_id() OR is_admin());

-- audit_log: APPEND-ONLY for app, full read for admin
CREATE POLICY audit_admin_read ON audit_log FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY audit_self_insert ON audit_log FOR INSERT TO authenticated
  WITH CHECK (actor_id = my_member_id() OR actor_id IS NULL);
-- No UPDATE/DELETE policy → tampering blocked even for admin (only service_role can)

-- config: read by all, write by admin
CREATE POLICY config_read_all ON config FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY config_admin_write ON config FOR UPDATE TO authenticated USING (is_admin());

-- ──────────────────────────────────────────────────────────────────
-- TRIGGERS
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER members_updated_at BEFORE UPDATE ON members FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER config_updated_at BEFORE UPDATE ON config FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-populate name_ur from name_en if not provided (cheap fallback)
-- More sophisticated transliteration happens in the app layer.
