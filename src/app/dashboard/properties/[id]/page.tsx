import PropertyDetailsSessionView from '@/components/PropertyDetailsSessionView';

export default async function PropertyDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ listingsRoot?: string; analysisRoot?: string }>;
}) {
  const { id } = await params;
  const { listingsRoot } = await searchParams;
  const normalizedId = decodeURIComponent(id);

  return <PropertyDetailsSessionView listingId={normalizedId} listingsRoot={listingsRoot || null} />;
}