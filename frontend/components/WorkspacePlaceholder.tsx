'use client';

import Sidebar from './Sidebar';
import { ArrowLeft, Construction } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function WorkspacePlaceholder({ title, description }: { title: string; description: string }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen bg-[#faf9fc]">
      <Sidebar active={title} />
      <main className="min-w-0 flex-1">
        <header className="flex h-[70px] items-center border-b border-[#eceaf1] bg-white px-4 md:px-8">
          <h1 className="text-lg font-bold">{title}</h1>
        </header>
        <div className="grid min-h-[calc(100vh-70px)] place-items-center p-8">
          <div className="max-w-md rounded-3xl border border-[#ebe8f1] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#f0edff] text-[#6c5ce7]">
              <Construction size={26} />
            </div>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
            <button
              onClick={() => router.push('/')}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#6c5ce7] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5e50d5]"
            >
              <ArrowLeft size={16} /> Back to Meetings
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
