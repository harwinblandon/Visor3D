ALTER TABLE measurements DROP CONSTRAINT measurements_type_check;
ALTER TABLE measurements ADD CONSTRAINT measurements_type_check CHECK (type IN ('distance', 'area', 'polyline'));
