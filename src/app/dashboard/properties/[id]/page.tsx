import { notFound } from 'next/navigation';
import PropertyDetailsView from '@/components/PropertyDetailsView';
import { getOrCreatePropertyAnalysis } from '@/lib/propertyAnalysis';
import { getPropertyDetailBundle } from '@/lib/propertyDetails';

export default async function PropertyDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const normalizedId = decodeURIComponent(id);
  const bundle = await getPropertyDetailBundle(normalizedId);

  if (!bundle) {
    notFound();
  }

  const analysisResult = await getOrCreatePropertyAnalysis(bundle);

  return <PropertyDetailsView bundle={bundle} analysisResult={analysisResult} />;
}