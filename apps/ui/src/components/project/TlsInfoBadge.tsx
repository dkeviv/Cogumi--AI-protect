'use client';

import { ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';

/**
 * TLS Info Badge
 * 
 * Displays a disclosure that the sidecar proxy does not decrypt TLS traffic.
 * Always visible in the project overview right column per UX_DESIGN.md spec.
 */
export function TlsInfoBadge() {
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-blue-900">
              TLS Metadata Only
            </p>
            <p className="mt-1 text-xs text-blue-700">
              TLS payloads are not decrypted. Evidence is based on agent behavior + network intent.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
