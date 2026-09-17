CREATE TABLE annotation_photos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annotation_id   UUID NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,
  filename        VARCHAR(255) NOT NULL,
  file_path       VARCHAR(500) NOT NULL,
  file_size_bytes BIGINT,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_photos_annotation ON annotation_photos(annotation_id);
