-- Schwierigkeitsgrad je Bedeutung zum Nachschreiben (1 sehr leicht bis 5 sehr schwer).
-- Wird beim Seed-Import aus der Schreibweise berechnet (src/shared/difficulty.ts), NULL = noch nicht bewertet.
ALTER TABLE meanings ADD COLUMN difficulty INTEGER CHECK (difficulty IS NULL OR difficulty BETWEEN 1 AND 5);
CREATE INDEX meanings_difficulty ON meanings (difficulty);
