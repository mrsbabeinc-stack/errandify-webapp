-- Seed common Singapore landmarks, schools, and POIs
INSERT INTO landmarks (name, postal_code, address, category, alternate_names) VALUES
  ('Nan Hua Primary School', '128806', '30 Jalan Lempeng, Clementi, Singapore 128806', 'school', ARRAY['nan hua', 'nanhua primary', 'nanhua']),
  ('Marina Bay Sands', '018956', '10 Bayfront Avenue, Marina Bay, Singapore 018956', 'landmark', ARRAY['mbs', 'marina bay']),
  ('National Library Board', '179103', '100 Victoria Street, City Hall, Singapore 179103', 'library', ARRAY['national library', 'nlb']),
  ('Clementi Mall', '129603', '3155 Commonwealth Avenue West, Clementi, Singapore 129603', 'mall', ARRAY['clementi']),
  ('Gardens by the Bay', '018953', '18 Marina Gardens Drive, Marina Bay, Singapore 018953', 'landmark', ARRAY['gardens', 'bay']),
  ('Singapore Zoo', '729826', '80 Mandai Lake Road, Mandai, Singapore 729826', 'landmark', ARRAY['zoo', 'mandai']),
  ('Sentosa Island', '098269', 'Sentosa, Singapore 098269', 'landmark', ARRAY['sentosa']),
  ('Orchard Road', '238801', 'Orchard Road, Orchard, Singapore 238801', 'shopping', ARRAY['orchard']),
  ('Changi Airport', '918141', '65 Airport Boulevard, Changi, Singapore 918141', 'airport', ARRAY['airport', 'changi']),
  ('Pulau Ubin', '508667', 'Pulau Ubin, Singapore 508667', 'landmark', ARRAY['ubin']
) ON CONFLICT (name) DO NOTHING;

-- Note: This is a starter set. More schools and landmarks can be added via data.gov.sg import
