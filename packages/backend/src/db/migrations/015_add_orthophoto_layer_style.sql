ALTER TABLE orthophoto_layers ADD COLUMN color VARCHAR(7);
ALTER TABLE orthophoto_layers ADD COLUMN line_width REAL NOT NULL DEFAULT 2;
ALTER TABLE orthophoto_layers ADD COLUMN fill_opacity REAL NOT NULL DEFAULT 0.2;
ALTER TABLE orthophoto_layers ADD COLUMN label_field VARCHAR(255);
