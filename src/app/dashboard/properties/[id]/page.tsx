import { notFound } from 'next/navigation';
import PropertyDetailsView from '@/components/PropertyDetailsView';
import { getOrCreatePropertyAnalysis } from '@/lib/propertyAnalysis';
import { getPropertyDetailBundle } from '@/lib/propertyDetails';

export default async function PropertyDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ listingsRoot?: string; analysisRoot?: string }>;
}) {
  const { id } = await params;
  const { listingsRoot, analysisRoot } = await searchParams;
  const normalizedId = decodeURIComponent(id);
  const bundle = await getPropertyDetailBundle(normalizedId, listingsRoot || null);

  if (!bundle) {
    notFound();
  }

  const analysisResult = await getOrCreatePropertyAnalysis(bundle, analysisRoot || String(bundle.listing.analysisRoot || ''));

  return <PropertyDetailsView bundle={bundle} analysisResult={analysisResult} />;
}