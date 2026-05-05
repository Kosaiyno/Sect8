export default function MarketLoading() {
  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <div className="dashboard-panel rounded-[32px] p-6 md:p-8">
        <div className="agent-skeleton h-5 w-40 rounded-full bg-white/6" />
        <div className="agent-skeleton mt-5 h-12 w-full max-w-2xl rounded-[24px] bg-white/5" />
        <div className="agent-skeleton mt-4 h-12 w-full max-w-xl rounded-[20px] bg-white/5" />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="dashboard-panel rounded-[30px] p-5">
            <div className="agent-skeleton h-6 w-3/4 rounded-[14px] bg-white/6" />
            <div className="agent-skeleton mt-3 h-4 w-1/2 rounded-full bg-white/5" />
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="agent-skeleton h-24 rounded-[22px] bg-white/5" />
              <div className="agent-skeleton h-24 rounded-[22px] bg-white/5" />
            </div>
            <div className="agent-skeleton mt-4 h-24 rounded-[22px] bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}