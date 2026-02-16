-- Add 'deceased' to the animal_health_status enum
ALTER TYPE animal_health_status ADD VALUE IF NOT EXISTS 'deceased';