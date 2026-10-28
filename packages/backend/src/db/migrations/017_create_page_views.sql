CREATE TABLE page_views (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type  VARCHAR(20) NOT NULL CHECK (subject_type IN ('model', 'orthophoto')),
  subject_id    UUID NOT NULL,
  ip_address    VARCHAR(64),
  user_agent    TEXT,
  viewed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_page_views_viewed_at ON page_views (viewed_at);
CREATE INDEX idx_page_views_subject ON page_views (subject_type, subject_id);
