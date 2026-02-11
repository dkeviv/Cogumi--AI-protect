import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav className={cn('flex items-center space-x-2 text-sm mb-6', className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <React.Fragment key={index}>
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className={cn(
                isLast ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'
              )}>
                {item.label}
              </span>
            )}
            
            {!isLast && (
              <ChevronRight size={14} className="text-gray-400" />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
