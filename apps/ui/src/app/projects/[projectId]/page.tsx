import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@cogumi/db';
import { getOrgId } from '@/lib/session';
import Link from 'next/link';
import { TokenManagement } from '@/components/projects/TokenManagement';

export default async function ProjectPage({ params }: { params: { projectId: string } }) {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  const orgId = await getOrgId();
  
  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    include: {
      _count: {
        select: {
          runs: true,
          tokens: true,
        },
      },
    },
  });

  if (!project || project.orgId !== orgId) {
    redirect('/dashboard');
  }

  const getEnvironmentBadge = (env: string) => {
    const badges = {
      sandbox: 'bg-blue-100 text-blue-800',
      staging: 'bg-yellow-100 text-yellow-800',
      prod: 'bg-red-100 text-red-800',
    };
    return badges[env as keyof typeof badges] || badges.sandbox;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEnvironmentBadge(project.environment)}`}>
                {project.environment}
              </span>
            </div>
            <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Stats Cards */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-sm text-gray-600 mb-1">Total Runs</div>
            <div className="text-3xl font-bold text-gray-900">{project._count.runs}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-sm text-gray-600 mb-1">Active Tokens</div>
            <div className="text-3xl font-bold text-gray-900">{project._count.tokens}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-sm text-gray-600 mb-1">Environment</div>
            <div className="text-2xl font-semibold text-gray-900 capitalize">{project.environment}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button className="border-b-2 border-blue-600 py-4 px-1 text-sm font-medium text-blue-600">
                Tokens
              </button>
              <Link 
                href={`/projects/${params.projectId}/connect`}
                className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                Connect Wizard
              </Link>
              <Link 
                href={`/projects/${params.projectId}/settings`}
                className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                Settings
              </Link>
            </nav>
          </div>

          {/* Token Management Section */}
          <div className="p-6">
            <TokenManagement projectId={params.projectId} />
          </div>
        </div>
      </main>
    </div>
  );
}
