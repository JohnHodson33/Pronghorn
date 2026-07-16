"use client";

// Sortable column header — half of the LIST-UX STANDARD (John 7/16 ~13:00:
// "column headers do the work… consistent across the whole site"). Click
// cycles first-direction → other-direction → off. Numeric columns open desc
// (big first); text columns open asc. Pair with FilterDropdown in the same
// <th> for categorical columns.
export default function SortHeader({
  label,
  active,
  dir,
  numeric = false,
  onChange,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  numeric?: boolean;      // first click sorts desc (largest first)
  onChange: (dir: "asc" | "desc" | null) => void;
}) {
  const first: "asc" | "desc" = numeric ? "desc" : "asc";
  const second: "asc" | "desc" = numeric ? "asc" : "desc";
  function click() {
    if (!active) onChange(first);
    else if (dir === first) onChange(second);
    else onChange(null);
  }
  return (
    <button
      type="button"
      onClick={click}
      title={`Sort by ${label.toLowerCase()}`}
      className={`inline-flex items-center gap-0.5 uppercase tracking-wide ${
        active ? "font-bold text-emerald-800" : "font-medium hover:text-zinc-700"
      }`}
    >
      {label}
      {active && <span aria-hidden>{dir === "desc" ? "▼" : "▲"}</span>}
    </button>
  );
}
