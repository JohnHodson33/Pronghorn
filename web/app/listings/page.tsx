import ListingsTable from "@/components/ListingsTableV2";
import { listings as mockListings } from "@/lib/mock";
import { fetchListings } from "@/lib/listings";
import type { UiListing } from "@/lib/types";

export const dynamic = "force-dynamic"; // always hit the DB — sourcing data is live

export default async function ListingsPage() {
  const live = await fetchListings();
  const rows: UiListing[] =
    live ?? mockListings.map((l) => ({ ...l, tier: l.tier as UiListing["tier"], relevant: true, url: null }));
  return <ListingsTable rows={rows} live={live !== null} />;
}
