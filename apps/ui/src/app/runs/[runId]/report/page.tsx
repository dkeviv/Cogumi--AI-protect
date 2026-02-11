'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { Download, ArrowLeft, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

interface Run {
  id: string;
  project: {
    id: string;
    name: string;
  };
}

export default function ReportPage({ params }: { params: { runId: string } }) {
  const runId = params.runId;
  const toast = useToast();

  const [run, setRun] = useState<Run | null>(null);
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load run metadata and report
  useEffect(() => {
    async function loadReport() {
      try {
        setLoading(true);

        // Fetch run metadata
        const runRes = await fetch(`/api/runs/${runId}`);
        if (!runRes.ok) throw new Error('Failed to load run');
        const runData = await runRes.json();
        setRun(runData.run);

        // Fetch report
        const reportRes = await fetch(`/api/runs/${runId}/report`);
        if (!reportRes.ok) throw new Error('Failed to load report');
        const reportText = await reportRes.text();
        setReport(reportText);

        setLoading(false);
      } catch (err) {
        console.error('Failed to load report:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    }

    loadReport();
  }, [runId]);

  // Download report as markdown file
  const handleDownload = () => {
    try {
      const blob = new Blob([report], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cogumi-report-${runId.slice(0, 8)}.md`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Report downloaded');
    } catch (err) {
      toast.error('Failed to download report');
    }
  };

  // Loading state
  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-[var(--brand-from)] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-sm text-[var(--text-secondary)]">Loading report...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  // Error state
  if (error || !run) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <FileText className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
            <p className="text-lg text-[var(--text-primary)] font-semibold">Failed to load report</p>
            <p className="text-sm text-[var(--text-secondary)] mt-2">{error}</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="px-6 py-6">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: run.project.name, href: `/projects/${run.project.id}` },
            { label: `Run #${runId.slice(0, 8)}`, href: `/runs/${runId}` },
            { label: 'Report' },
          ]}
        />

        {/* Header */}
        <div className="mt-6 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/runs/${runId}`}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-[var(--transition-base)]"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Security Report</h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Run #{runId.slice(0, 8)} • {run.project.name}
              </p>
            </div>
          </div>

          <Button variant="primary" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download .md
          </Button>
        </div>

        {/* Report content */}
        <div className="max-w-[800px] mx-auto">
          <div className="bg-white rounded-xl border border-[var(--border-default)] shadow-[var(--shadow-card)] p-8">
            {report ? (
              <div className="prose prose-slate max-w-none text-[var(--text-secondary)]">
                <ReactMarkdown
                  components={{
                    h1: ({ children }: any) => (
                      <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4 pb-2 border-b border-[var(--border-default)]">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }: any) => (
                      <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-3">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }: any) => (
                      <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-2">
                        {children}
                      </h3>
                    ),
                    h4: ({ children }: any) => (
                      <h4 className="text-lg font-semibold text-[var(--text-primary)] mt-4 mb-2">
                        {children}
                      </h4>
                    ),
                    p: ({ children }: any) => (
                      <p className="text-[var(--text-secondary)] mb-4 leading-relaxed">
                        {children}
                      </p>
                    ),
                    ul: ({ children }: any) => (
                      <ul className="list-disc list-inside mb-4 space-y-1">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }: any) => (
                      <ol className="list-decimal list-inside mb-4 space-y-1">
                        {children}
                      </ol>
                    ),
                    code: ({ inline, children }: any) =>
                      inline ? (
                        <code className="px-1.5 py-0.5 bg-[var(--surface-bg)] text-[var(--text-primary)] rounded font-mono text-sm">
                          {children}
                        </code>
                      ) : (
                        <code className="block bg-[var(--surface-sidebar)] text-white p-4 rounded-lg overflow-x-auto font-mono text-sm">
                          {children}
                        </code>
                      ),
                    pre: ({ children }: any) => <pre className="mb-4">{children}</pre>,
                    blockquote: ({ children }: any) => (
                      <blockquote className="border-l-4 border-[var(--brand-from)] pl-4 italic text-[var(--text-secondary)] mb-4">
                        {children}
                      </blockquote>
                    ),
                    a: ({ href, children }: any) => (
                      <a
                        href={href}
                        className="text-[var(--brand-from)] hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {children}
                      </a>
                    ),
                    table: ({ children }: any) => (
                      <div className="overflow-x-auto mb-4">
                        <table className="min-w-full border border-[var(--border-default)]">
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({ children }: any) => (
                      <thead className="bg-[var(--surface-bg)]">{children}</thead>
                    ),
                    tbody: ({ children }: any) => <tbody>{children}</tbody>,
                    tr: ({ children }: any) => (
                      <tr className="border-b border-[var(--border-default)]">{children}</tr>
                    ),
                    th: ({ children }: any) => (
                      <th className="px-4 py-2 text-left text-sm font-semibold text-[var(--text-primary)]">
                        {children}
                      </th>
                    ),
                    td: ({ children }: any) => (
                      <td className="px-4 py-2 text-sm text-[var(--text-secondary)]">
                        {children}
                      </td>
                    ),
                    hr: () => <hr className="border-[var(--border-default)] my-6" />,
                    strong: ({ children }: any) => (
                      <strong className="font-semibold text-[var(--text-primary)]">
                        {children}
                      </strong>
                    ),
                    em: ({ children }: any) => <em className="italic">{children}</em>,
                  }}
                >
                  {report}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
                <p className="text-sm text-[var(--text-secondary)]">No report available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
