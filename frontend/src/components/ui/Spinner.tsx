import React from 'react';
import { Zap } from 'lucide-react';

export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md', className = '',
}) => {
  const s = { sm: 'w-4 h-4 border-[2px]', md: 'w-5 h-5 border-[2.5px]', lg: 'w-8 h-8 border-3' }[size];
  return (
    <div
      className={`${s} border-gray-300 border-t-gray-900 rounded-full animate-spin ${className}`}
      role="status" aria-label="Memuat..."
    />
  );
};

export const FullPageSpinner: React.FC = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[#FFFDF5] gap-4">
    <div className="w-14 h-14 rounded-neo border-3 border-gray-900 flex items-center justify-center overflow-hidden"
         style={{ boxShadow: '4px 4px 0px 0px #1a1a1a' }}>
      <img src="/logo.svg" alt="Logo" className="w-full h-full object-cover" />
    </div>
    <div className="text-center">
      <Spinner size="md" className="mx-auto mb-2" />
      <p className="text-xs font-bold text-gray-500">Memuat TaskFlow...</p>
    </div>
  </div>
);

export const SkeletonCard: React.FC = () => (
  <div className="card p-5 space-y-3">
    <div className="skeleton h-5 w-3/4" />
    <div className="skeleton h-3 w-full" />
    <div className="skeleton h-3 w-2/3" />
    <div className="flex gap-2 pt-1">
      <div className="skeleton h-6 w-16 rounded-neo" />
      <div className="skeleton h-6 w-20 rounded-neo" />
    </div>
  </div>
);

export const SkeletonList: React.FC = () => (
  <div className="space-y-2">
    {Array(5).fill(0).map((_, i) => (
      <div key={i} className="w-full text-left p-4 rounded-neo border-3 border-gray-300 bg-white flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-neo border-2 border-gray-200 bg-gray-100 flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2 mt-1">
          <div className="skeleton h-3 w-3/4" />
          <div className="skeleton h-2 w-1/4" />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonProjectDetail: React.FC = () => (
  <div className="flex flex-col h-full">
    <div className="px-6 py-4 border-b-3 border-gray-900 bg-white flex-shrink-0 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4 w-full">
          <div className="w-11 h-11 bg-gray-200 rounded-neo border-3 border-gray-300 flex-shrink-0" />
          <div className="space-y-2 w-1/3 min-w-[200px]">
            <div className="skeleton h-6 w-3/4" />
            <div className="skeleton h-3 w-1/2" />
          </div>
        </div>
      </div>
      <div className="skeleton h-2 w-64 rounded-full mt-3" />
      <div className="flex gap-1.5 mt-4 -mb-4">
        {Array(5).fill(0).map((_, i) => (
          <div key={i} className="skeleton h-9 w-24 rounded-t-neo" />
        ))}
      </div>
    </div>
    <div className="flex-1 p-6">
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {Array(4).fill(0).map((_, i) => (
           <div key={i} className="card p-5 space-y-3 border-gray-200 bg-white">
             <div className="skeleton h-5 w-3/4" />
             <div className="skeleton h-3 w-full" />
             <div className="skeleton h-3 w-2/3" />
           </div>
         ))}
       </div>
    </div>
  </div>
);
