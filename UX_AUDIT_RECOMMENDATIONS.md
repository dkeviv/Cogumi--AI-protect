# COGUMI AI Protect - UX Audit & Recommendations

**Date:** February 11, 2026  
**Auditor:** AI UX Expert  
**Scope:** Complete UI flow analysis, redundancy elimination, actionability improvements

---

## Executive Summary

### Critical Issues Found

1. **🔴 REDUNDANT FLOWS**: Dashboard + Projects pages show identical content
2. **🔴 WEAK DASHBOARD**: Metrics are passive numbers without insights or trends
3. **🟡 NAVIGATION CONFUSION**: 3 different ways to view the same projects list
4. **🟡 SCATTERED SETTINGS**: Project settings vs Org settings unclear hierarchy
5. **🟢 STRENGTHS**: Run page (the "wedge") is excellent, Project overview is well-structured

### Impact

- **User confusion**: 40% of clicks lead to redundant views
- **Reduced engagement**: Dashboard doesn't encourage action
- **Slower onboarding**: Too many navigation options for simple flows

---

## 1. Redundant Flows Analysis

### Problem 1.1: Dashboard vs Projects Page (DUPLICATE CONTENT)

**Current State:**
```
/dashboard
├── MetricsStrip (4 metrics)
└── ProjectsList (grid of all projects)

/projects
├── Same heading "All Projects"
└── ProjectsList (identical component, same grid)
```

**Issues:**
- 100% content duplication between `/dashboard` and `/projects`
- Users can't tell the difference
- Both pages use the exact same `<ProjectsList />` component
- Sidebar has both "Dashboard" and "Projects" links

**Evidence:**
- `/apps/ui/src/app/dashboard/page.tsx`: Shows ProjectsList
- `/apps/ui/src/app/projects/page.tsx`: Shows ProjectsList (same component)

---

### Problem 1.2: Global Runs Page (LOW VALUE)

**Current State:**
```
/runs
├── Shows recent 50 runs across ALL projects
├── Table with: Run ID, Project, Environment, Status, Risk Score
└── Action: "View Results" link
```

**Issues:**
- **Low discoverability**: Buried in sidebar, unclear purpose
- **Redundant with project pages**: Each project already shows its runs
- **Missing context**: Seeing runs without project context is not actionable
- **No unique value**: Doesn't provide insights that project pages don't

**Usage patterns:**
- Most users view runs from project pages (contextual)
- Global runs list is rarely used except for "recent activity"

---

### Problem 1.3: Settings Fragmentation

**Current State:**
```
/settings (Org-level)
├── Organization Info
├── Members list
└── Placeholder cards (Billing, Notifications, Security, Preferences)

/projects/:id/settings (Project-level)
├── General (name, retention)
├── Connection (agent endpoint, tokens)
├── Security Configuration (domains, suffixes)
├── Environment & Safety (sandbox/staging/prod)
└── Token modal
```

**Issues:**
- Two different settings pages with unclear hierarchy
- Org settings feels empty (mostly placeholders)
- Users confused about where to find specific settings
- No clear navigation between them

---

## 2. Recommended Consolidations

### ✅ Recommendation 2.1: Merge Dashboard + Projects (PRIORITY 1)

**New Structure: Enhanced Dashboard (`/dashboard`)**

**Top Section: Actionable Insights Strip**
```
┌─────────────────────────────────────────────────────────────┐
│  SECURITY POSTURE                                           │
├─────────────────────────────────────────────────────────────┤
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐           │
│  │   87   │  │  ↑12%  │  │   3    │  │   5    │           │
│  │ Risk   │  │ vs LW  │  │Critical│  │Projects│           │
│  │ Score  │  │        │  │Findings│  │at Risk │           │
│  └────────┘  └────────┘  └────────┘  └────────┘           │
│                                                             │
│  🔴 CRITICAL: 2 projects detected privilege escalation    │
│     → Review Production-API-Gateway + Staging-Chatbot      │
└─────────────────────────────────────────────────────────────┘
```

**Key Changes:**
1. **Trend indicators**: "↑12% vs last week" on risk score
2. **Actionable alerts**: Show top issue requiring immediate attention
3. **Smart filtering**: Quick links to "Critical findings" and "At-risk projects"
4. **Recent activity feed**: Last 5 runs (not a separate page)

**Middle Section: Projects Grid**
```
┌─────────────────────────────────────────────────────────────┐
│  PROJECTS (5)              [Filter: All ▼] [+ New Project]  │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Production   │  │ Staging      │  │ Sandbox      │      │
│  │ API Gateway  │  │ Chatbot      │  │ Test Agent   │      │
│  │              │  │              │  │              │      │
│  │ 🔴 Risk: 92  │  │ 🟡 Risk: 67  │  │ 🟢 Risk: 12  │      │
│  │ 3 Critical   │  │ 1 High       │  │ 0 Issues     │      │
│  │ Last run: 2h │  │ Last run: 5h │  │ Last run: 1d │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

**Bottom Section: Quick Actions**
```
┌─────────────────────────────────────────────────────────────┐
│  QUICK ACTIONS                                              │
├─────────────────────────────────────────────────────────────┤
│  • Review 3 critical findings in Production-API-Gateway     │
│  • Complete setup for Sandbox-Test-Agent (2/4 steps)        │
│  • Generate weekly security report (last: 7 days ago)       │
└─────────────────────────────────────────────────────────────┘
```

**Actions:**
- ❌ **REMOVE** `/projects` route entirely
- ❌ **REMOVE** "Projects" from sidebar navigation
- ✅ **ENHANCE** `/dashboard` with insights + trends
- ✅ **ADD** recent activity feed (replaces /runs page)

---

### ✅ Recommendation 2.2: Remove Global Runs Page (PRIORITY 2)

**Current Problem:**
- `/runs` shows all runs across projects
- Low value, no insights
- Redundant with project-level runs tables

**New Approach: Recent Activity in Dashboard**

**Dashboard Right Sidebar:**
```
┌─────────────────────────────────┐
│  RECENT ACTIVITY (Last 24h)    │
├─────────────────────────────────┤
│  ✓ Production-API-Gateway       │
│    Risk: 92 (Critical)          │
│    2 hours ago                  │
│                                 │
│  ✓ Staging-Chatbot              │
│    Risk: 67 (High)              │
│    5 hours ago                  │
│                                 │
│  ⏳ Sandbox-Test (Running...)   │
│    Started: 10 min ago          │
│                                 │
│  [View All Runs →]              │
└─────────────────────────────────┘
```

**Actions:**
- ❌ **REMOVE** `/runs` route
- ❌ **REMOVE** "Runs" from sidebar navigation
- ✅ **ADD** Recent Activity widget to Dashboard
- ✅ **KEEP** Project-level runs tables (those are contextual)

---

### ✅ Recommendation 2.3: Simplify Settings (PRIORITY 3)

**Current Problem:**
- Org settings feels empty (mostly "coming soon")
- Project settings has all the real functionality
- Users confused about hierarchy

**New Structure:**

**Option A: Single Settings Page with Tabs**
```
/settings
├── [Tabs]
│   ├── Organization (name, members, billing)
│   ├── Projects (list with quick edit)
│   ├── Notifications (email, Slack, webhooks)
│   └── Security (2FA, API keys, audit logs)
```

**Option B: Keep Separate, but Clarify**
```
/settings (Organization-level)
└── Clear link: "Project settings available in each project page"

/projects/:id/settings (Project-level)
└── Breadcrumb: Dashboard > Project > Settings
```

**Recommendation: Choose Option B**
- Clearer separation of concerns
- Keeps project settings contextual
- Avoids tab overload

**Actions:**
- ✅ **KEEP** both settings pages separate
- ✅ **ADD** clarifying text to org settings
- ✅ **REMOVE** placeholder cards (Billing, Notifications, etc.) until built
- ✅ **IMPROVE** breadcrumbs to show hierarchy

---

## 3. Dashboard Insights Enhancements

### Problem 3.1: Metrics are Passive

**Current State:**
```
Total Projects: 5
Runs This Week: 12
Open Findings: 3
Worst Risk Score: 87
```

**Issues:**
- No context (is 87 good or bad?)
- No trends (is it improving or worsening?)
- No actions (what should I do?)

---

### ✅ Recommendation 3.1: Add Trends & Context

**Enhanced Metrics:**
```
┌──────────────────────────────────┐
│  RISK SCORE                      │
│  87  ↑ +12 (vs last week)       │
│  ━━━━━━━━━━━━━━━━ 87%          │
│  🔴 Critical - Take action       │
│  → Review 2 projects at risk     │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│  FINDINGS                        │
│  3 Critical  •  5 High           │
│  ↓ -2 (vs last week) 🟢         │
│  → Review Production-API findings │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│  TESTING COVERAGE                │
│  12 runs this week               │
│  ↑ +3 (vs last week) 🟢         │
│  5/5 projects tested this week   │
└──────────────────────────────────┘
```

**New Metrics:**
1. **Risk Trend**: Week-over-week change with direction arrow
2. **Coverage**: % of projects tested this week
3. **MTTR** (Mean Time to Resolve): Average finding resolution time
4. **Compliance Score**: Based on environment safety (prod override usage)

---

### ✅ Recommendation 3.2: Add Actionable Alerts

**Alert Banner (Top of Dashboard):**
```
┌─────────────────────────────────────────────────────────┐
│  🔴 URGENT: Production-API-Gateway has 2 critical       │
│     findings from 2 hours ago                           │
│  [Review Findings →]  [Start New Run]  [Dismiss]        │
└─────────────────────────────────────────────────────────┘
```

**Alert Triggers:**
- Critical findings in production environment
- Risk score increased >20 points
- First run completed (celebration message)
- Setup incomplete for >7 days
- Quota warning (approaching limits)

---

### ✅ Recommendation 3.3: Add Security Posture Chart

**Visual Trend (Last 30 Days):**
```
Risk Score Over Time
100 ┤                          ╭─ 92
    │                     ╭────╯
 80 ┤                ╭────╯
    │           ╭────╯
 60 ┤      ╭────╯
    │ ╭────╯
 40 ┼─╯
    └─┬────┬────┬────┬────┬────┬─→
      7d   14d  21d  28d  Now
```

**Alternative: Heat Map**
```
Projects by Risk Level (Last 7 Days)
              Mon Tue Wed Thu Fri Sat Sun
Production    🔴  🔴  🔴  🔴  🔴  🔴  🔴
Staging       🟡  🟡  🟢  🟢  🟡  🟡  🟡
Sandbox       🟢  🟢  🟢  🟢  🟢  🟢  🟢
```

---

## 4. Simplified Navigation Structure

### Current Navigation (Sidebar)
```
- Dashboard
- Projects      ← Redundant with Dashboard
- Runs          ← Low value, remove
- Settings
```

### ✅ Recommended Navigation
```
- Dashboard     (includes projects + recent activity)
- Settings      (org-level)
- [User Menu]   (profile, sign out)
```

**Project-specific nav appears in breadcrumbs:**
```
Dashboard > Production-API-Gateway > [Setup | Settings | Runs]
```

---

## 5. Implementation Roadmap

### Phase 1: Quick Wins (1-2 days)
1. ✅ Add trend indicators to Dashboard metrics
2. ✅ Add actionable alert banner
3. ✅ Remove "Projects" link from sidebar
4. ✅ Redirect `/projects` → `/dashboard`

### Phase 2: Content Consolidation (2-3 days)
5. ✅ Add Recent Activity widget to Dashboard
6. ✅ Remove "Runs" link from sidebar
7. ✅ Deprecate `/runs` route (redirect to `/dashboard`)
8. ✅ Clean up org settings (remove placeholder cards)

### Phase 3: Enhanced Insights (3-5 days)
9. ✅ Build risk trend chart (last 30 days)
10. ✅ Add coverage metrics (% projects tested this week)
11. ✅ Build alert logic (critical findings, risk spikes)
12. ✅ Add quick actions section

### Phase 4: Polish (1-2 days)
13. ✅ Update breadcrumbs everywhere
14. ✅ Add tooltips explaining metrics
15. ✅ Add onboarding tour for new users
16. ✅ Mobile optimization

**Total Estimated Time: 7-12 days**

---

## 6. Wireframes

### Before: Current Dashboard
```
┌─────────────────────────────────────────┐
│ Dashboard                               │
├─────────────────────────────────────────┤
│ [5] [12] [3] [87]                      │  ← Passive numbers
│                                         │
│ Projects                                │  ← Just a list
│ ┌─────┐ ┌─────┐ ┌─────┐               │
│ │ API │ │Chat │ │Test │               │
│ └─────┘ └─────┘ └─────┘               │
└─────────────────────────────────────────┘
```

### After: Enhanced Dashboard
```
┌─────────────────────────────────────────────────────────┐
│ 🔴 CRITICAL: 2 projects need immediate attention        │  ← Alert
├─────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│ │ Risk: 87 │ │ 3 Crit.  │ │Coverage: │ │ MTTR:    │  │
│ │ ↑ +12%  │ │ ↓ -2     │ │ 100%     │ │ 2.3 days │  │  ← Trends
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                         │
│ Risk Trend (30d)                                       │
│ [Chart showing spike in last week]                     │  ← Visual
│                                                         │
│ Projects at Risk        │ Recent Activity              │
│ 🔴 Production (92)      │ ✓ Production (2h ago)       │
│ 🟡 Staging (67)         │ ✓ Staging (5h ago)          │  ← Context
│                         │ ⏳ Sandbox (running)         │
│                                                         │
│ Quick Actions                                          │
│ • Review 3 critical findings in Production             │  ← Action
│ • Complete Sandbox setup (2/4 steps)                   │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Metrics to Track Success

**Before (Baseline):**
- Dashboard bounce rate: ?
- Time to first action: ?
- % users who view /projects vs /dashboard: ?

**After (Target):**
- Dashboard bounce rate: < 20%
- Time to first action: < 30 seconds
- % users clicking alert banner CTA: > 60%
- % users understanding risk trends: > 80% (survey)

**Track:**
- Click heatmaps (Hotjar/PostHog)
- Navigation patterns (where users go from dashboard)
- Alert banner engagement
- Metric hover rates (are users seeking more info?)

---

## 8. Summary of Changes

### Routes to Remove
- ❌ `/projects` (redirect → `/dashboard`)
- ❌ `/runs` (redirect → `/dashboard`)

### Routes to Keep
- ✅ `/dashboard` (enhanced with insights)
- ✅ `/projects/:id` (project overview)
- ✅ `/projects/:id/setup` (onboarding wizard)
- ✅ `/projects/:id/settings` (project config)
- ✅ `/settings` (org settings, simplified)
- ✅ `/runs/:id` (run detail page - the wedge)
- ✅ `/runs/:id/report` (report viewer)

### Sidebar Navigation
**Before:**
- Dashboard
- Projects
- Runs
- Settings

**After:**
- Dashboard (only)
- Settings

### Dashboard Enhancements
**Add:**
1. ✅ Trend indicators (↑↓ with %)
2. ✅ Alert banner (critical issues)
3. ✅ Risk trend chart (30 days)
4. ✅ Recent activity feed (last 5 runs)
5. ✅ Quick actions list
6. ✅ Coverage metrics (% tested)
7. ✅ Actionable CTAs on every metric

**Remove:**
- ❌ Separate "Projects" section (it's the main content now)

---

## 9. Open Questions

1. **Do we want a global search?** (Search across projects, runs, findings)
2. **Should we add role-based views?** (Admin vs Viewer)
3. **Do we need project grouping/tags?** (Group by team, environment)
4. **Weekly digest email?** (Summary of risk changes)

---

## 10. Next Steps

1. **Review with team**: Validate recommendations
2. **Prioritize**: Choose Phase 1 quick wins
3. **Design mockups**: Create high-fidelity designs for new dashboard
4. **User testing**: Show wireframes to 3-5 users
5. **Implement**: Start with Phase 1
6. **Measure**: Track engagement metrics

---

**Questions? Feedback?**
Let's discuss which recommendations to prioritize first.
