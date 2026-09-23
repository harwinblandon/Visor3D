CREATE TABLE orthophoto_layers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orthophoto_id  UUID NOT NULL REFERENCES orthophotos(id) ON DELETE CASCADE,
  name           VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255),
  geojson        JSONB NOT NULL,
  uploaded_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orthophoto_layers_orthophoto ON orthophoto_layers(orthophoto_id);
