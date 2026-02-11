import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Lock, Shield, Users, Twitter, Github, Linkedin, PlayCircle } from 'lucide-react';

export default async function HomePage() {
  // Redirect logged-in users to dashboard
  const session = await auth();
  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-rose-500 bg-clip-text text-transparent">
                  Cogumi
                </span>
              </Link>
              <div className="hidden md:flex ml-10 space-x-8">
                <Link href="#features" className="text-gray-700 hover:text-gray-900 text-sm font-medium">
                  Features
                </Link>
                <Link href="#how-it-works" className="text-gray-700 hover:text-gray-900 text-sm font-medium">
                  How it works
                </Link>
                <Link href="#pricing" className="text-gray-700 hover:text-gray-900 text-sm font-medium">
                  Pricing
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/login"
                className="text-gray-700 hover:text-gray-900 text-sm font-medium"
              >
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

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 sm:pt-24 sm:pb-32">
          <div className="text-center">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 mb-6">
              Red team your AI agents
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-rose-500 bg-clip-text text-transparent">
                before they leak secrets
              </span>
            </h1>
            <p className="max-w-3xl mx-auto text-xl text-gray-600 mb-8">
              Battle test your agents to make sure they don't leak secrets, attempt privileged actions, 
              or become compromised by social engineering — with a replay and chain of evidence.
            </p>
            <div className="flex justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
              >
                Start free trial
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <PlayCircle className="h-5 w-5" />
                Watch demo
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              Pre-deployment testing for sandbox and staging environments • No production deployment required
            </p>
          </div>
        </div>

        {/* Gradient background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-white" />
        </div>
      </section>

      {/* Trust badges */}
      <section className="border-t border-b border-gray-200 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-gray-900">&lt;10min</div>
              <div className="text-sm text-gray-600 mt-1">Time to first test</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">Zero trust</div>
              <div className="text-sm text-gray-600 mt-1">No TLS decryption</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">100%</div>
              <div className="text-sm text-gray-600 mt-1">Your environment</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">Live replay</div>
              <div className="text-sm text-gray-600 mt-1">Chain of evidence</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Built for AI agent security teams
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Universal testing platform that works with any agent framework, any language, any LLM provider.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Secret Leakage Detection</h3>
              <p className="text-gray-600">
                Detect API keys, tokens, and credentials in agent outputs. Identify attempted exfiltration via network intent.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Privilege Escalation</h3>
              <p className="text-gray-600">
                Catch unauthorized DELETE/POST requests to sensitive endpoints and calls to disallowed destinations.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg border border-gray-200 hover:border-rose-300 transition-colors">
              <div className="w-12 h-12 bg-rose-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-rose-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Social Engineering</h3>
              <p className="text-gray-600">
                Test trust spoof attacks and memory poisoning. Verify behavioral persistence across sessions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Ship with confidence in under 10 minutes
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              No SDK required. Works with your existing agent infrastructure.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Deploy sidecar</h3>
              <p className="text-gray-600">
                Add our lightweight Go proxy to your staging environment via Docker Compose or Kubernetes.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Configure endpoint</h3>
              <p className="text-gray-600">
                Point us to your agent's test endpoint. We'll run deterministic adversarial scripts.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Watch the replay</h3>
              <p className="text-gray-600">
                See live exploit feed with chain-of-evidence cards. Download full security report.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 to-rose-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to secure your AI agents?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Start testing in minutes. No credit card required.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 shadow-sm"
            >
              Start free trial
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-6 py-3 border border-white text-base font-medium rounded-md text-white hover:bg-blue-700"
            >
              <PlayCircle className="h-5 w-5" />
              Watch demo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><Link href="#features" className="hover:text-white">Features</Link></li>
                <li><Link href="#how-it-works" className="hover:text-white">How it works</Link></li>
                <li><Link href="#pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="/login" className="hover:text-white">Sign in</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white">Documentation</a></li>
                <li><a href="#" className="hover:text-white">API Reference</a></li>
                <li><a href="#" className="hover:text-white">Security</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
                <li><a href="#" className="hover:text-white">Partners</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white">Cookie Policy</a></li>
                <li><a href="#" className="hover:text-white">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="mb-4 md:mb-0">
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-rose-400 bg-clip-text text-transparent">
                  Cogumi
                </span>
                <p className="text-sm text-gray-400 mt-1">AI Protect • Universal Agent Red Team</p>
              </div>
              <div className="flex space-x-6">
                <a href="#" className="hover:text-white" aria-label="Twitter">
                  <Twitter className="h-6 w-6" />
                </a>
                <a href="#" className="hover:text-white" aria-label="GitHub">
                  <Github className="h-6 w-6" />
                </a>
                <a href="#" className="hover:text-white" aria-label="LinkedIn">
                  <Linkedin className="h-6 w-6" />
                </a>
              </div>
            </div>
            <p className="text-sm text-gray-400 text-center mt-8">
              © {new Date().getFullYear()} Cogumi. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
