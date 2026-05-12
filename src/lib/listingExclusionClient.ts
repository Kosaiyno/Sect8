// Pure client-side land/lot exclusion logic for use in React components
export function isExcludedPropertyType(propertyType: unknown) {
  const normalized = String(propertyType || "").trim().toLowerCase();
  return normalized.includes("land") || normalized.includes("lot");
}

function hasExcludedListingSignal(value: unknown) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return false;
  return normalized.includes(' land')
    || normalized.startsWith('land ')
    || normalized.includes(' lot ')
    || /\blot\s+#?\d+/i.test(normalized)
    || normalized.includes('vacant lot')
    || normalized.includes('vacant land');
}

export function isExcludedListingRecord(item: {
  propertyType?: unknown;
  address?: unknown;
  formattedAddress?: unknown;
  title?: unknown;
  id?: unknown;
}) {
  return isExcludedPropertyType(item?.propertyType)
    || hasExcludedListingSignal(item?.address)
    || hasExcludedListingSignal(item?.formattedAddress)
    || hasExcludedListingSignal(item?.title)
    || hasExcludedListingSignal(item?.id);
}

export function filterExcludedListings<T extends { propertyType?: unknown; address?: unknown; formattedAddress?: unknown; title?: unknown; id?: unknown }>(items: T[]) {
  return items.filter((item) => !isExcludedListingRecord(item));
}
