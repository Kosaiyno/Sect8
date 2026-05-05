export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6 pb-6 animate-fade-in">
      <div className="dashboard-panel rounded-[34px] p-6 md:p-7">
        <div className="agent-skeleton h-7 w-56 rounded-full bg-white/6" />
        <div className="agent-skeleton mt-5 h-16 w-full max-w-3xl rounded-[28px] bg-white/5" />
        <div className="agent-skeleton mt-4 h-12 w-full max-w-xl rounded-[20px] bg-white/5" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <div className="dashboard-panel rounded-[32px] p-6 md:p-8">
          <div className="agent-skeleton h-5 w-36 rounded-full bg-white/6" />
          <div className="agent-skeleton mt-5 h-14 w-full max-w-2xl rounded-[24px] bg-white/5" />
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="dashboard-subpanel rounded-[24px] p-4">
                <div className="agent-skeleton h-4 w-20 rounded-full bg-white/6" />
                <div className="agent-skeleton mt-4 h-8 w-full rounded-[14px] bg-white/5" />
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-panel rounded-[32px] p-6">
          <div className="agent-skeleton h-5 w-32 rounded-full bg-white/6" />
          <div className="agent-skeleton mt-5 h-32 rounded-[24px] bg-white/5" />
          <div className="agent-skeleton mt-4 h-32 rounded-[24px] bg-white/5" />
        </div>
      </div>
    </div>
  );
}