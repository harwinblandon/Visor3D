ALTER TABLE measurements ALTER COLUMN model_id DROP NOT NULL;
ALTER TABLE measurements ADD COLUMN orthophoto_id UUID REFERENCES orthophotos(id) ON DELETE CASCADE;
ALTER TABLE measurements ADD CONSTRAINT measurements_subject_check
  CHECK ((model_id IS NOT NULL) <> (orthophoto_id IS NOT NULL));
CREATE INDEX idx_measurements_orthophoto ON measurements(orthophoto_id);

ALTER TABLE annotations ALTER COLUMN model_id DROP NOT NULL;
ALTER TABLE annotations ADD COLUMN orthophoto_id UUID REFERENCES orthophotos(id) ON DELETE CASCADE;
ALTER TABLE annotations ADD CONSTRAINT annotations_subject_check
  CHECK ((model_id IS NOT NULL) <> (orthophoto_id IS NOT NULL));
CREATE INDEX idx_annotations_orthophoto ON annotations(orthophoto_id);
