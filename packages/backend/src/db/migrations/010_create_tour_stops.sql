CREATE TABLE tour_stops (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id      UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  order_index   INTEGER NOT NULL,
  position_x    DOUBLE PRECISION NOT NULL,
  position_y    DOUBLE PRECISION NOT NULL,
  position_z    DOUBLE PRECISION NOT NULL,
  target_x      DOUBLE PRECISION NOT NULL,
  target_y      DOUBLE PRECISION NOT NULL,
  target_z      DOUBLE PRECISION NOT NULL,
  label         VARCHAR(255),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tour_stops_model ON tour_stops(model_id, order_index);
