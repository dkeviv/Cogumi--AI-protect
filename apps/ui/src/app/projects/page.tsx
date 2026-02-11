import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { AppShell } from '@/components/layout/AppShell';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { ProjectsList } from '@/components/dashboard/ProjectsList';

export default async function ProjectsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Projects' },
  ];

  return (
    <AppShell>
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        {/* Page Header */}
        <div className="mb-6">
          <Breadcrumbs items={breadcrumbs} />
          <h1 className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">
            All Projects
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Manage and monitor all your AI agent security testing projects
          </p>
        </div>

        {/* Projects List */}
        <ProjectsList />
      </div>
    </AppShell>
  );
}
