-- Seed: default screen profile (ported from scraper/config.json) + first source

insert into scrape_sources (id, name, url, adapter, enabled, tier, notes) values
  ('bizbuysell', 'BizBuySell', 'https://www.bizbuysell.com', 'bizbuysell', true,
   'aggregator', 'Puppeteer adapter; detail pages blocked — search results only');

insert into screen_profiles (
  name, is_default,
  industry_keywords_include,
  industry_keywords_exclude,
  include_states, exclude_states, priority_states,
  min_asking_price, max_asking_price,
  min_cash_flow, max_cash_flow,
  unknown_cash_flow_min_asking_price,
  keep_when_unknown, max_multiple_flag
) values (
  'Green Industry Default', true,
  array[
    'pool service','pool services','pool cleaning','pool maintenance','pool route',
    'pest control','exterminating','extermination',
    'lawn care','lawn maintenance','lawn treatment','fertilization','weed control',
    'lake management','pond management','water management','aquatic',
    'tree care','tree service','tree trimming','arborist',
    'landscaping','landscape','hardscape',
    'hvac','heating and cooling','heating and air','heating & air','air conditioning','furnace','mechanical contractor',
    'plumbing','plumber','drain cleaning',
    'electrician','electrical contractor','electrical services','electrical service',
    'roofing','roof repair',
    'windows and doors','window and door','window installation','window replacement','door installation','garage door',
    'gutter','siding','chimney','septic','irrigation','sprinkler','fencing','fence',
    'pressure washing','power washing','window cleaning',
    'janitorial','commercial cleaning','cleaning service','cleaning services','maid service','house cleaning','carpet cleaning',
    'restoration','remediation','mold','water damage','fire damage',
    'property maintenance','facility services','facilities maintenance','building maintenance',
    'junk removal','waste','sanitation','portable toilet',
    'home services','handyman','appliance repair','locksmith'
  ],
  '{}',
  '{}', '{}', array['AZ','NV','TX','UT','CO','NM','GA','NC','SC','TN'],
  null, null,
  300000, 10000000,
  750000,
  true, 5.0
);
