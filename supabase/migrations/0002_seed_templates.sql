-- Seed the 5 starter submission targets.
-- `rules` entries reference ruleIds registered in the compliance engine
-- (src/features/compliance/rules). Adding a check = add a rule there + list
-- its id here. Params are per-template (e.g. abstract word limits differ).

insert into public.templates (id, name, publisher, citation_style, layout_spec, rules, is_active) values
(
  'tpl-ieee', 'IEEE Conference', 'IEEE', 'ieee',
  '{"columns": 2, "paperSize": "letter"}'::jsonb,
  '[
     {"ruleId": "abstract-word-limit", "severity": "warning", "params": {"maxWords": 250}},
     {"ruleId": "figure-cited-in-text", "severity": "error"}
   ]'::jsonb,
  true
),
(
  'tpl-springer', 'Springer Nature', 'Springer', 'springer',
  '{"columns": 1, "paperSize": "a4"}'::jsonb,
  '[
     {"ruleId": "abstract-word-limit", "severity": "warning", "params": {"maxWords": 250}},
     {"ruleId": "figure-cited-in-text", "severity": "error"}
   ]'::jsonb,
  true
),
(
  'tpl-elsevier', 'Elsevier', 'Elsevier', 'elsevier',
  '{"columns": 1, "paperSize": "a4"}'::jsonb,
  '[
     {"ruleId": "abstract-word-limit", "severity": "warning", "params": {"maxWords": 300}},
     {"ruleId": "figure-cited-in-text", "severity": "error"}
   ]'::jsonb,
  true
),
(
  'tpl-apa7', 'APA 7', 'APA', 'apa-7',
  '{"columns": 1, "paperSize": "letter"}'::jsonb,
  '[
     {"ruleId": "figure-cited-in-text", "severity": "warning"}
   ]'::jsonb,
  true
),
(
  'tpl-thesis', 'Generic Thesis', 'University', 'apa-7',
  '{"columns": 1, "paperSize": "a4"}'::jsonb,
  '[
     {"ruleId": "figure-cited-in-text", "severity": "warning"}
   ]'::jsonb,
  true
);
