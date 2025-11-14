-- Run this in Supabase SQL Editor to fix cookie categories
-- This will delete all existing categories and create 4 Swedish ones

-- Delete all existing categories
DELETE FROM cookie_categories;

-- Insert the correct 4 Swedish categories (using gen_random_uuid() for IDs)
INSERT INTO cookie_categories (id, name, description, is_essential, sort_order, is_active, created_at, updated_at) VALUES
  (gen_random_uuid(), 'Nödvändiga', 'Nödvändiga cookies för grundläggande webbplatsfunktionalitet. Dessa kan inte stängas av.', true, 1, true, NOW(), NOW()),
  (gen_random_uuid(), 'Funktionella', 'Cookies som förbättrar webbplatsfunktionalitet och personalisering.', false, 2, true, NOW(), NOW()),
  (gen_random_uuid(), 'Analys', 'Cookies för webbplatsanalys och prestandaövervakning.', false, 3, true, NOW(), NOW()),
  (gen_random_uuid(), 'Marknadsföring', 'Cookies som används för reklam och marknadsföring.', false, 4, true, NOW(), NOW());

-- Verify the result
SELECT id, name, description, is_essential, sort_order, is_active 
FROM cookie_categories 
ORDER BY sort_order;
