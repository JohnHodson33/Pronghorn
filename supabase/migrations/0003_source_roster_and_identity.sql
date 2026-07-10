-- 0003: full broker-source roster (candidates seeded disabled) + cross-prong
-- identity resolution support.

-- Listings join the canonical company graph the same way leads already do:
-- when a broker listing and a Google-scraped lead turn out to be the same
-- business, both rows point at ONE companies row — outreach reads companies,
-- so nothing gets contacted twice.
alter table listings add column company_id uuid references companies(id);
create index listings_company_idx on listings (company_id);

-- Match keys for identity resolution (normalized at write time by the pipeline):
alter table listings add column website_domain text;   -- from detail page when available
alter table leads    add column website_domain text;   -- normalized from website
create index listings_domain_idx on listings (website_domain);
create index leads_domain_idx on leads (website_domain);

-- Source roster: one row per target site; adapters flip enabled=true as built.
insert into scrape_sources (id, name, url, adapter, enabled, tier, notes) values
  -- Tier 1: aggregators
  ('bizquest',            'BizQuest',                          'https://www.bizquest.com',           null, false, 'aggregator', 'Same parent as BizBuySell'),
  ('businessbroker_net',  'BusinessBroker.net',                'https://www.businessbroker.net',     null, false, 'aggregator', null),
  ('dealstream',          'DealStream',                        'https://www.dealstream.com',         null, false, 'aggregator', 'Formerly MergerNetwork'),
  ('businessesforsale',   'BusinessesForSale.com',             'https://www.businessesforsale.com',  null, false, 'aggregator', null),
  ('businessmart',        'BusinessMart',                      'https://www.businessmart.com',       null, false, 'aggregator', null),
  ('bizben',              'BizBen',                            'https://www.bizben.com',             null, false, 'aggregator', 'California-focused'),
  ('globalbx',            'GlobalBX',                          'https://www.globalbx.com',           null, false, 'aggregator', null),
  ('loopnet',             'LoopNet Businesses',                'https://www.loopnet.com',            null, false, 'aggregator', 'CoStar anti-bot — expect hard'),
  ('biznexus',            'BizNexus',                          'https://www.biznexus.com',           null, false, 'aggregator', 'Aggregates other sources'),
  ('axial',               'Axial',                             'https://www.axial.net',              null, false, 'aggregator', 'BLOCKED for scraping — email-teaser ingest only'),
  -- Tier 2: national networks
  ('sunbelt',             'Sunbelt Business Brokers',          'https://www.sunbeltnetwork.com',     null, false, 'network', null),
  ('transworld',          'Transworld Business Advisors',      'https://www.tworld.com',             null, false, 'network', null),
  ('murphy',              'Murphy Business',                   'https://murphybusiness.com',         null, false, 'network', 'Existing relationship: Luis Zavala'),
  ('vr_brokers',          'VR Business Brokers',               'https://www.vrbusinessbrokers.com',  null, false, 'network', 'Existing relationship: Ramzi Daklouche'),
  ('fcbb',                'First Choice Business Brokers',     'https://www.fcbb.com',               null, false, 'network', null),
  ('link_business',       'Link Business',                     'https://linkbusiness.com',           null, false, 'network', null),
  ('calhoun',             'Calhoun Companies',                 'https://calhouncompanies.com',       null, false, 'network', 'Upper Midwest'),
  ('peterson',            'Peterson Acquisitions',             'https://petersonacquisitions.com',   null, false, 'network', null),
  ('raincatcher',         'Raincatcher',                       'https://raincatcher.com',            null, false, 'network', null),
  ('viking',              'Viking Mergers & Acquisitions',     'https://vikingmergers.com',          null, false, 'network', 'Southeast priority-state coverage'),
  ('synergy',             'Synergy Business Brokers',          'https://www.synergybb.com',          null, false, 'network', null),
  ('woodbridge',          'Woodbridge International',          'https://woodbridgegrp.com',          null, false, 'network', null),
  ('benchmark',           'Benchmark International',           'https://www.benchmarkintl.com',      null, false, 'network', null),
  ('sun_acquisitions',    'Sun Acquisitions',                  'https://sunacquisitions.com',        null, false, 'network', 'Chicago/Midwest'),
  ('hedgestone',          'Hedgestone Business Advisors',      'https://hedgestone.com',             null, false, 'network', null),
  ('websiteclosers',      'Website Closers',                   'https://websiteclosers.com',         null, false, 'network', 'Low priority'),
  -- Tier 3: state association MLS portals
  ('bbf_florida',         'Business Brokers of Florida MLS',   'https://www.bbfmls.com',             null, false, 'association', 'True MLS — high value per adapter'),
  ('tabb_texas',          'TABB (Texas)',                      'https://www.tabb.org',               null, false, 'association', 'Priority state'),
  ('gabb_georgia',        'GABB (Georgia)',                    'https://gabb.org',                   null, false, 'association', 'Priority state'),
  ('cabb_california',     'CABB (California)',                 'https://cabb.org',                   null, false, 'association', null),
  ('cvbba_carolinas',     'CVBBA (Carolinas-Virginia)',        'https://cvbba.com',                  null, false, 'association', 'Priority states NC/SC'),
  ('mbbi_midwest',        'MBBI (Midwest)',                    'https://www.mbbi.org',               null, false, 'association', null),
  ('azbba_arizona',       'AZBBA (Arizona)',                   'https://azbba.org',                  null, false, 'association', 'Home priority state'),
  ('masource',            'M&A Source',                        'https://masource.org',               null, false, 'association', 'Lower middle market'),
  -- Tier 4: specialists
  ('principium',          'Principium Group',                  'https://principiumgroup.com',        null, false, 'specialist', 'Ron Edmonds — green industry M&A'),
  -- Tier 5: franchise resale
  ('franchise_resales',   'Franchise Resales',                 'https://franchiseresales.com',       null, false, 'franchise', 'Lawn/pest franchise resales');
