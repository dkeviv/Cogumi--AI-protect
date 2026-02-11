import Link from 'next/link';
import { PlayCircle } from 'lucide-react';

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-rose-500 bg-clip-text text-transparent">
              Cogumi
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-gray-700 hover:text-gray-900 text-sm font-medium">
                Sign in
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Start testing
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
            <PlayCircle className="h-6 w-6 text-blue-700" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900">Product demo</h1>
          <p className="mt-3 text-lg text-gray-600">
            This is a placeholder page for the demo video. We intentionally do not link the demo CTA to the dashboard.
          </p>

          <div className="mt-10 rounded-2xl border border-gray-200 bg-gray-50 p-6 text-left">
            <div className="text-sm font-semibold text-gray-900">What you will see in the demo</div>
            <ul className="mt-3 list-disc pl-5 text-sm text-gray-700 space-y-2">
              <li>Connect wizard: token → sidecar → heartbeat → endpoint validation</li>
              <li>Run live replay: exploit feed, prompt chain, network intent, findings, proof drawer</li>
              <li>Evidence chain: why we believe a finding is real, without TLS decryption</li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                Start free trial
              </Link>
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

