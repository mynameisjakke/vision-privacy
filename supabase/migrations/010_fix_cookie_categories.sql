-- Fix cookie categories - Remove duplicates and English categories, add Swedish ones
-- Migration: 010_fix_cookie_categories.sql
-- Date: 2025-11-13

-- First, delete all existing categories
DELETE FROM cookie_categories;

-- Insert the correct 4 Swedish categories with detailed GDPR-compliant descriptions
INSERT INTO cookie_categories (id, name, description, is_essential, sort_order, is_active, created_at, updated_at) VALUES
  (gen_random_uuid(), 'Nödvändiga', 'Nödvändiga cookies är avgörande för webbplatsens grundläggande funktioner såsom säker inloggning, sessionshantering och säkerhetsfunktioner. Dessa cookies lagrar ingen personligt identifierbar information och kan inte stängas av enligt GDPR Artikel 6(1)(f) då de är nödvändiga för att tillhandahålla den tjänst du uttryckligen begärt.', true, 1, true, NOW(), NOW()),
  (gen_random_uuid(), 'Funktionella', 'Funktionella cookies möjliggör förbättrad funktionalitet och personalisering, såsom videospelare, live-chattar och språkval. De kan sättas av oss eller av tredjepartsleverantörer vars tjänster vi använder. Om du inte tillåter dessa cookies kan vissa eller alla dessa funktioner inte fungera korrekt. Behandlingen baseras på ditt samtycke enligt GDPR Artikel 6(1)(a).', false, 2, true, NOW(), NOW()),
  (gen_random_uuid(), 'Analys', 'Analyscookies hjälper oss att förstå hur besökare interagerar med webbplatsen genom att samla in och rapportera information anonymt. Vi använder dessa för att förbättra webbplatsens prestanda och användarupplevelse. Informationen som samlas in inkluderar antal besökare, varifrån de kommer och vilka sidor de besöker. Behandlingen kräver ditt samtycke enligt e-Privacy-direktivet och GDPR Artikel 6(1)(a).', false, 3, true, NOW(), NOW()),
  (gen_random_uuid(), 'Marknadsföring', 'Marknadsföringscookies används för att spåra besökare över webbplatser för att visa relevanta och engagerande annonser. De kan användas av annonspartners för att bygga en profil av dina intressen och visa relevanta annonser på andra webbplatser. Dessa cookies lagrar information om din webbläsaraktivitet. Behandlingen kräver ditt uttryckliga samtycke enligt GDPR Artikel 6(1)(a) och e-Privacy-direktivet.', false, 4, true, NOW(), NOW());

-- Verify the result
SELECT id, name, description, is_essential, sort_order, is_active 
FROM cookie_categories 
ORDER BY sort_order;
