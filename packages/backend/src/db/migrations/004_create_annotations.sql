CREATE TABLE annotations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id      UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  position_x    DOUBLE PRECISION NOT NULL,
  position_y    DOUBLE PRECISION NOT NULL,
  position_z    DOUBLE PRECISION NOT NULL,
  normal_x      DOUBLE PRECISION,
  normal_y      DOUBLE PRECISION,
  normal_z      DOUBLE PRECISION,
  damage_type   VARCHAR(50) NOT NULL CHECK (damage_type IN
                  ('grieta','fisura','desprendimiento','humedad','corrosion','otro')),
  severity      VARCHAR(20) NOT NULL CHECK (severity IN ('baja','media','alta')),
  status        VARCHAR(20) NOT NULL DEFAULT 'abierto'
                  CHECK (status IN ('abierto','en_revision','resuelto')),
  description   TEXT,
  author        VARCHAR(255),
  detected_at   DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_annotations_model ON annotations(model_id);
CREATE INDEX idx_annotations_type ON annotations(damage_type);
CREATE INDEX idx_annotations_severity ON annotations(severity);
CREATE INDEX idx_annotations_detected_at ON annotations(detected_at);
