CREATE TABLE measurements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id      UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  type          VARCHAR(20) NOT NULL CHECK (type IN ('distance', 'area')),
  points        JSONB NOT NULL,
  value         DOUBLE PRECISION NOT NULL,
  unit          VARCHAR(10) NOT NULL DEFAULT 'm',
  label         VARCHAR(255),
  author        VARCHAR(255),
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_measurements_model ON measurements(model_id);
