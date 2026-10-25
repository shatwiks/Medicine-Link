-- Default Settings
INSERT OR IGNORE INTO settings (key, value, description) VALUES
  ('min_shelf_life_months', '6', 'Minimum months before expiry'),
  ('match_expiry_hours', '48', 'How long a suggested match stays open'),
  ('max_distance_km', '25', 'Farthest distance for matching'),
  ('max_upload_mb', '5', 'Photo size limit'),
  ('ocr_low_confidence', '0.6', 'Below this, flag the item'),
  ('quantity_unusual_limit', '100', 'Above this, flag the item'),
  ('photo_retention_days', '90', 'When the cleanup job deletes photos'),
  ('review_reminder_hours', '48', 'When to remind pharmacists');

-- Blocked Medicines
INSERT OR IGNORE INTO blocked_medicines (id, keyword, category, reason) VALUES
  ('blk-01', 'insulin', 'cold_chain', 'Needs refrigeration'),
  ('blk-02', 'vaccine', 'cold_chain', 'Needs refrigeration'),
  ('blk-03', 'injection', 'injectable', 'Injectables not accepted'),
  ('blk-04', 'ceftriaxone', 'injectable', 'Injectables not accepted'),
  ('blk-05', 'tramadol', 'controlled', 'Controlled substance'),
  ('blk-06', 'morphine', 'controlled', 'Controlled substance'),
  ('blk-07', 'codeine', 'controlled', 'Controlled substance'),
  ('blk-08', 'alprazolam', 'controlled', 'Controlled substance'),
  ('blk-09', 'diazepam', 'controlled', 'Controlled substance');

-- Medicine Aliases (20 rows)
INSERT OR IGNORE INTO medicine_aliases (id, alias, generic_name) VALUES
  ('als-01', 'crocin', 'paracetamol'),
  ('als-02', 'dolo', 'paracetamol'),
  ('als-03', 'dolo 650', 'paracetamol'),
  ('als-04', 'calpol', 'paracetamol'),
  ('als-05', 'paracetamol', 'paracetamol'),
  ('als-06', 'brufen', 'ibuprofen'),
  ('als-07', 'advil', 'ibuprofen'),
  ('als-08', 'ibuprofen', 'ibuprofen'),
  ('als-09', 'glycomet', 'metformin'),
  ('als-10', 'metformin', 'metformin'),
  ('als-11', 'zyrtec', 'cetirizine'),
  ('als-12', 'cetirizine', 'cetirizine'),
  ('als-13', 'azithral', 'azithromycin'),
  ('als-14', 'azithromycin', 'azithromycin'),
  ('als-15', 'mox', 'amoxicillin'),
  ('als-16', 'amoxicillin', 'amoxicillin'),
  ('als-17', 'pan', 'pantoprazole'),
  ('als-18', 'pantocid', 'pantoprazole'),
  ('als-19', 'pantoprazole', 'pantoprazole'),
  ('als-20', 'omez', 'omeprazole'),
  ('als-21', 'omeprazole', 'omeprazole'),
  ('als-22', 'limcee', 'vitamin c'),
  ('als-23', 'vitamin c', 'vitamin c');
