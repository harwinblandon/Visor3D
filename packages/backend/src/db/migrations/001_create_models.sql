CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE models (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               VARCHAR(255) NOT NULL,
  filename           VARCHAR(255) NOT NULL,
  original_filename  VARCHAR(255),
  file_path          VARCHAR(500) NOT NULL,
  file_size_bytes    BIGINT,
  crs_description    VARCHAR(255),
  latitude           DOUBLE PRECISION,
  longitude          DOUBLE PRECISION,
  is_active          BOOLEAN NOT NULL DEFAULT true,
  notes              TEXT,
  uploaded_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
