CREATE TABLE orthophotos (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               VARCHAR(255) NOT NULL,
  filename           VARCHAR(255) NOT NULL,
  original_filename  VARCHAR(255),
  file_path          VARCHAR(500) NOT NULL,
  file_size_bytes    BIGINT,
  crs_description    VARCHAR(255),
  bounds_west        DOUBLE PRECISION NOT NULL,
  bounds_south       DOUBLE PRECISION NOT NULL,
  bounds_east        DOUBLE PRECISION NOT NULL,
  bounds_north       DOUBLE PRECISION NOT NULL,
  min_zoom           INTEGER NOT NULL,
  max_zoom           INTEGER NOT NULL,
  is_published       BOOLEAN NOT NULL DEFAULT true,
  notes              TEXT,
  uploaded_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
