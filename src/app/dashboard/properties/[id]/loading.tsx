import PropertyDetailsLoadingState from '@/components/PropertyDetailsLoadingState';

export default function PropertyDetailsLoading() {
  return (
    <PropertyDetailsLoadingState
      title="Loading agent analysis."
      description="Loading the property page and the latest underwriting context for this address."
      steps={[
        {
          key: 'load-bundle',
          title: 'Loading property data',
          detail: 'Pulling the saved listing and supporting property records for this address.',
          status: 'active',
        },
        {
          key: 'run-analysis',
          title: 'Running agent analysis',
          detail: 'Generating the property analysis on the 0G-backed pipeline.',
          status: 'pending',
        },
        {
          key: 'finalize',
          title: 'Rendering the analysis',
          detail: 'Finishing the property page so the full analysis can open.',
          status: 'pending',
        },
      ]}
      terminalLines={[
        'Opening property analysis.',
        'Loading the property page...',
      ]}
      progress={12}
    />
  );
}