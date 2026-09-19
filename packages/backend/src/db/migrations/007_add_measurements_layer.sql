ALTER TABLE measurements ADD COLUMN layer VARCHAR(100);
CREATE INDEX idx_measurements_layer ON measurements(layer);
