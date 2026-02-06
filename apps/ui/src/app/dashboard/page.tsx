import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { signOut } from '@/lib/auth';
import { AppHeader } from '@/components/nav/AppHeader';
import { ProjectsList } from '@/components/org/ProjectsList';
import { RecentRunsList } from '@/components/org/RecentRunsList';
import { TopFindingsPreview } from '@/components/org/TopFindingsPreview';

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  async function handleSignOut() {
    'use server';
    await signOut();
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#e8eef9_0%,_#f6f7fb_45%,_#f6f7fb_100%)]">
      <AppHeader
        title="Org Dashboard"
        subtitle="Pre-deployment red teaming for AI agents"
        rightSlot={
          <>
            <span className="text-xs text-slate-500">{session.user?.email}</span>
            <form action={handleSignOut}>
              <button
                type="submit"
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
              >
                Sign out
              </button>
            </form>
          </>
        }
      />

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 lg:flex-row">
        <section className="flex-1 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Projects</h2>
            <p className="text-sm text-slate-500">
              Track every agent, environment, and run from one command center.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[var(--app-shadow-card)]">
            <ProjectsList />
          </div>
        </section>

        <aside className="w-full space-y-6 lg:w-[380px]">
          <RecentRunsList />
          <TopFindingsPreview />
        </aside>
      </main>
    </div>
  );
}
