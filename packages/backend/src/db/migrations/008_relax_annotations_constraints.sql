ALTER TABLE annotations DROP CONSTRAINT annotations_damage_type_check;
ALTER TABLE annotations ALTER COLUMN severity DROP NOT NULL;
