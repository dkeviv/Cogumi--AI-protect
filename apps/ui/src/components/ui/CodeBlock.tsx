'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useToast } from './Toast';

interface CodeBlockProps {
  code: string;
  language?: string;
  showCopy?: boolean;
  maxHeight?: string;
}

export function CodeBlock({ 
  code, 
  language = 'bash', 
  showCopy = true,
  maxHeight = '400px' 
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <div className="relative">
      {showCopy && (
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 rounded-lg bg-[var(--surface-card)] border border-[var(--border-default)] p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors z-10"
          aria-label="Copy code to clipboard"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      )}
      <pre
        className="rounded-lg bg-[var(--surface-sidebar)] border border-[var(--border-default)] p-4 overflow-x-auto font-mono text-sm max-h-[400px]"
      >
        <code className="text-gray-100 whitespace-pre">{code}</code>
      </pre>
    </div>
  );
}
