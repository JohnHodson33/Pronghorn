// Static US geography suggestions for the list-build typeahead — Sun Belt
// priority metros first, then other majors, then all states. No API needed.
export const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA",
  "ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK",
  "OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
] as const;

const METROS = [
  // Sun Belt priority (thesis states first)
  "Phoenix, AZ", "Tucson, AZ", "Mesa, AZ", "Scottsdale, AZ", "Las Vegas, NV", "Reno, NV",
  "Dallas, TX", "Fort Worth, TX", "Houston, TX", "Austin, TX", "San Antonio, TX", "El Paso, TX",
  "Salt Lake City, UT", "Provo, UT", "Denver, CO", "Colorado Springs, CO", "Fort Collins, CO",
  "Albuquerque, NM", "Santa Fe, NM", "Atlanta, GA", "Savannah, GA", "Augusta, GA",
  "Charlotte, NC", "Raleigh, NC", "Durham, NC", "Greensboro, NC", "Asheville, NC",
  "Charleston, SC", "Columbia, SC", "Greenville, SC", "Nashville, TN", "Memphis, TN",
  "Knoxville, TN", "Chattanooga, TN",
  // Other majors
  "Tampa, FL", "Orlando, FL", "Miami, FL", "Jacksonville, FL", "Fort Myers, FL", "Sarasota, FL",
  "Oklahoma City, OK", "Tulsa, OK", "Kansas City, MO", "St. Louis, MO", "Little Rock, AR",
  "Birmingham, AL", "Huntsville, AL", "New Orleans, LA", "Baton Rouge, LA", "Jackson, MS",
  "Chicago, IL", "Indianapolis, IN", "Columbus, OH", "Cincinnati, OH", "Cleveland, OH",
  "Louisville, KY", "Lexington, KY", "Richmond, VA", "Virginia Beach, VA", "Boise, ID",
  "Portland, OR", "Seattle, WA", "Spokane, WA", "Sacramento, CA", "San Diego, CA",
  "Los Angeles, CA", "San Jose, CA", "Fresno, CA", "Minneapolis, MN", "Milwaukee, WI",
  "Des Moines, IA", "Omaha, NE", "Wichita, KS", "Pittsburgh, PA", "Philadelphia, PA",
  "Baltimore, MD", "Detroit, MI", "Grand Rapids, MI",
];

export function suggestGeo(q: string): string[] {
  const t = q.trim().toLowerCase();
  if (t.length < 2) return [];
  const metroHits = METROS.filter((m) => m.toLowerCase().includes(t));
  const stateHits = US_STATES.filter((s) => s.toLowerCase().startsWith(t)).map((s) => s as string);
  return [...metroHits, ...stateHits].slice(0, 8);
}

// Fallback industry suggestions until /api/taxonomy responds (Lane C).
export const FALLBACK_INDUSTRIES = [
  "Landscaping / Landscape Maintenance", "Lawn Care", "Tree Care / Tree Service",
  "Pest Control", "Wildlife/Animal Control", "Pool Services / Maintenance",
  "Irrigation", "Fencing", "Lake/Pond Management", "Property Maintenance",
  "HVAC", "Plumbing", "Electrical", "Roofing", "Windows & Doors",
  "Restoration", "Cleaning/Janitorial", "Pressure Washing", "Gutter Services",
  "Snow Removal", "Paving / Sealcoating", "Septic Services", "Well Drilling",
  "Garage Doors", "Chimney Services", "Holiday Lighting",
];

export function suggestIndustryFallback(q: string): string[] {
  const t = q.trim().toLowerCase();
  if (t.length < 2) return [];
  return FALLBACK_INDUSTRIES.filter((i) => i.toLowerCase().includes(t)).slice(0, 8);
}
