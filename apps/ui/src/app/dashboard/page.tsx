import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ProjectsList } from '@/components/dashboard/ProjectsList';
import { signOut } from '@/lib/auth';

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
    <div className="min-h-screen bg-gray-50">
      {/* App Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">COGUMI AI Protect</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700">{session.user?.email}</span>
              <form action={handleSignOut}>
                <button
                  type="submit"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Projects</h2>
          <p className="text-gray-600">Red team your AI agents to find security vulnerabilities</p>
        </div>

        {/* Projects List - Client Component */}
        <ProjectsList />
      </main>
    </div>
  );
}
