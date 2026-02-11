import React from 'react';
import { requireAuth, getOrgId } from '@/lib/session';
import { prisma } from '@cogumi/db';
import { AppShell } from '@/components/layout/AppShell';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Settings, Users, CreditCard, Bell, Shield } from 'lucide-react';

export default async function OrganizationSettingsPage() {
  await requireAuth();
  const orgId = await getOrgId();

  // Fetch organization details
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      _count: {
        select: {
          projects: true,
        },
      },
    },
  });

  if (!org) {
    return <div>Organization not found</div>;
  }

  return (
    <AppShell>
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Settings' },
          ]}
        />

        {/* Header */}
        <div className="mt-6 mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="h-7 w-7 text-[var(--brand-from)]" />
            <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text-primary)]">
              Organization Settings
            </h1>
          </div>
          <p className="text-sm sm:text-base text-[var(--text-secondary)]">
            Manage your organization settings, members, and billing.
          </p>
        </div>

        {/* Organization Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Organization Information</CardTitle>
            <CardDescription>Basic details about your organization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">Organization Name</label>
                <div className="mt-1 text-base text-[var(--text-primary)]">{org.name}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">Organization ID</label>
                <div className="mt-1 text-sm font-mono text-[var(--text-muted)]">{org.id}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">Total Projects</label>
                <div className="mt-1 text-base text-[var(--text-primary)]">{org._count.projects}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Members Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <CardTitle>Members</CardTitle>
            </div>
            <CardDescription>People who have access to this organization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {org.members.map((membership) => (
                <div key={membership.id} className="flex items-center justify-between py-3 border-b border-[var(--border-default)] last:border-b-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                      {membership.user.name?.[0]?.toUpperCase() || membership.user.email[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-[var(--text-primary)]">{membership.user.name || membership.user.email}</div>
                      <div className="text-sm text-[var(--text-secondary)]">{membership.user.email}</div>
                    </div>
                  </div>
                  <div className="text-sm text-[var(--text-secondary)] capitalize">{membership.role}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Placeholder Cards for Future Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                <CardTitle>Billing & Usage</CardTitle>
              </div>
              <CardDescription>Manage your subscription and view usage</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--text-muted)]">Coming soon: View your current plan, usage quotas, and billing history.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-600" />
                <CardTitle>Notifications</CardTitle>
              </div>
              <CardDescription>Configure alert preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--text-muted)]">Coming soon: Set up email and Slack notifications for runs, findings, and quotas.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <CardTitle>Security</CardTitle>
              </div>
              <CardDescription>Organization-wide security settings</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--text-muted)]">Coming soon: Enforce 2FA, audit logs, and API key management.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                <CardTitle>Preferences</CardTitle>
              </div>
              <CardDescription>Customize your experience</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--text-muted)]">Coming soon: Default retention policies, timezone, and UI preferences.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
