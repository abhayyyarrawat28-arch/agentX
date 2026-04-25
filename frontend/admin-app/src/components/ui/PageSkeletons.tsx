import React from 'react';

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`.trim()} />;
}

function HeaderSkeleton() {
  return (
    <section className="page-heading">
      <div>
        <Skeleton className="h-3 w-28 rounded-full mb-3" />
        <Skeleton className="h-10 w-72 rounded-xl mb-3" />
        <Skeleton className="h-4 w-[28rem] max-w-full rounded-full" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
    </section>
  );
}

export function DashboardPageSkeleton() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={idx} className="stat-card">
            <Skeleton className="h-3 w-20 rounded-full mb-3" />
            <Skeleton className="h-4 w-28 rounded-full mb-4" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <Skeleton className="h-3 w-16 rounded-full mb-2" />
            <Skeleton className="h-6 w-56 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] table-fixed text-sm">
            <thead>
              <tr>
                <th className="p-3"><Skeleton className="h-3 w-16 rounded-full" /></th>
                <th className="p-3"><Skeleton className="h-3 w-24 rounded-full" /></th>
                <th className="p-3"><Skeleton className="h-3 w-20 rounded-full ml-auto" /></th>
                <th className="p-3"><Skeleton className="h-3 w-16 rounded-full ml-auto" /></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, row) => (
                <tr key={row}>
                  <td className="p-3"><Skeleton className="h-4 w-36 rounded-full" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-24 rounded-full" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-20 rounded-full ml-auto" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-12 rounded-full ml-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function TablePageSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full min-w-[48rem] table-fixed text-sm">
          <thead>
            <tr>
              {Array.from({ length: cols }).map((_, col) => (
                <th key={col} className="p-3 text-left">
                  <Skeleton className="h-3 w-20 rounded-full" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, row) => (
              <tr key={row}>
                {Array.from({ length: cols }).map((_, col) => (
                  <td key={col} className="p-3">
                    <Skeleton className="h-4 w-full max-w-[12rem] rounded-full" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AgentDetailPageSkeleton() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="stat-card">
            <Skeleton className="h-3 w-20 rounded-full mb-3" />
            <Skeleton className="h-4 w-28 rounded-full mb-4" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, card) => (
          <div key={card} className="stat-card">
            <Skeleton className="h-6 w-40 rounded-lg mb-5" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((__, row) => (
                <Skeleton key={row} className="h-4 w-full rounded-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConfigPageSkeleton() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />

      <div className="space-y-6 max-w-6xl">
        <section className="stat-card space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx}>
                <Skeleton className="h-4 w-40 rounded-full mb-2" />
                <Skeleton className="h-11 w-full rounded-xl mb-2" />
                <Skeleton className="h-3 w-full rounded-full" />
              </div>
            ))}
          </div>
        </section>

        <section className="stat-card space-y-4">
          <Skeleton className="h-6 w-72 rounded-lg" />
          <Skeleton className="h-4 w-[36rem] max-w-full rounded-full" />
          {Array.from({ length: 2 }).map((_, idx) => (
            <div key={idx} className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
              <Skeleton className="h-5 w-40 rounded-lg" />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((__, inputIdx) => (
                  <div key={inputIdx}>
                    <Skeleton className="h-4 w-28 rounded-full mb-2" />
                    <Skeleton className="h-11 w-full rounded-xl" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
