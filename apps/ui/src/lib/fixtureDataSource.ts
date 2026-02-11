/**
 * Fixture Data Source
 * 
 * Loads data from /fixtures/*.json files when NEXT_PUBLIC_USE_FIXTURES=true
 * This enables UI development without a running backend.
 */

import eventsEscalation from '../../fixtures/events_escalation_attempt.json';
import eventsExfil from '../../fixtures/events_exfil_attempt.json';
import eventsSecretLeak from '../../fixtures/events_secret_leak.json';
import findingsExpected from '../../fixtures/findings_expected.json';
import storyStepsExpected from '../../fixtures/story_steps_expected.json';

// Mock run data
const FIXTURE_RUN = {
  id: 'fixture-run-1',
  status: 'completed',
  riskScore: 87,
  startedAt: new Date(Date.now() - 3600000).toISOString(),
  endedAt: new Date().toISOString(),
  project: {
    id: 'fixture-project-1',
    name: 'Demo AI Agent',
    environment: 'staging',
  },
};

// Mock projects
const FIXTURE_PROJECTS = [
  {
    id: 'fixture-project-1',
    name: 'Demo AI Agent',
    environment: 'staging' as const,
    agentTestUrl: 'https://demo-agent.example.com/chat',
    retentionDays: 30,
    status: 'active',
    lastRunAt: new Date(Date.now() - 3600000).toISOString(),
    runsCount: 42,
    lastRiskScore: 87,
  },
  {
    id: 'fixture-project-2',
    name: 'Customer Support Bot',
    environment: 'prod' as const,
    agentTestUrl: 'https://support-bot.example.com/api',
    retentionDays: 90,
    status: 'active',
    lastRunAt: new Date(Date.now() - 7200000).toISOString(),
    runsCount: 156,
    lastRiskScore: 34,
  },
  {
    id: 'fixture-project-3',
    name: 'Research Assistant',
    environment: 'dev' as const,
    agentTestUrl: 'http://localhost:8000/chat',
    retentionDays: 7,
    status: 'active',
    lastRunAt: new Date(Date.now() - 86400000).toISOString(),
    runsCount: 8,
    lastRiskScore: 62,
  },
];

// Mock dashboard metrics
const FIXTURE_METRICS = {
  totalProjects: 3,
  runsThisWeek: 23,
  openFindings: 7,
  worstRiskScore: 87,
};

export class FixtureDataSource {
  /**
   * Get run by ID
   */
  async getRun(runId: string) {
    // Simulate network delay
    await this.delay(300);
    
    return {
      run: FIXTURE_RUN,
    };
  }

  /**
   * Get story steps for a run
   */
  async getStorySteps(runId: string) {
    await this.delay(200);
    
    // Fixture is wrapped in { steps: [...] }
    return storyStepsExpected;
  }

  /**
   * Get events for a run
   */
  async getEvents(runId: string) {
    await this.delay(200);
    
    // Combine all fixture events (fixtures are wrapped in { events: [...] })
    const allEvents = [
      ...(eventsEscalation as any).events,
      ...(eventsExfil as any).events,
      ...(eventsSecretLeak as any).events,
    ];
    
    return {
      events: allEvents,
    };
  }

  /**
   * Get findings for a run
   */
  async getFindings(runId: string) {
    await this.delay(200);
    
    // Fixture is wrapped in { findings: [...] }
    return findingsExpected;
  }

  /**
   * Get report markdown for a run
   */
  async getReport(runId: string) {
    await this.delay(300);
    
    // Extract arrays from fixture objects
    const findings = (findingsExpected as any).findings || [];
    const steps = (storyStepsExpected as any).steps || [];
    
    const markdown = `# Security Assessment Report

**Run ID:** ${runId}  
**Project:** ${FIXTURE_RUN.project.name}  
**Environment:** ${FIXTURE_RUN.project.environment}  
**Completed:** ${new Date(FIXTURE_RUN.endedAt).toLocaleString()}  
**Risk Score:** ${FIXTURE_RUN.riskScore}/100 (Critical)

## Executive Summary

This automated security assessment identified **${findings.length} high-severity vulnerabilities** in the AI agent's behavior, including privilege escalation attempts, data exfiltration, and secrets exposure.

⚠️ **Critical Finding:** The agent attempted to escalate privileges and access sensitive system resources outside its intended scope.

## Findings

${findings.map((f: any, i: number) => `
### ${i + 1}. ${f.title}

- **Severity:** ${f.severity}
- **Status:** ${f.status}
- **Summary:** ${f.summary}
`).join('\n')}

## Exploit Timeline

${steps.map((s: any) => `
- **[${s.stepKind}]** ${s.claimTitle}  
  ${s.claimSummary}
`).join('\n')}

## Recommendations

1. **Implement strict permission boundaries** - The agent should not have access to system commands or sensitive APIs
2. **Add content filtering** - Block attempts to exfiltrate data or access credentials
3. **Enable audit logging** - Track all agent actions for security monitoring
4. **Regular testing** - Run automated security assessments before each deployment

---

*This report was generated automatically by COGUMI AI Protect*  
*Note: This is a fixture/demo report for UI development*
`;
    
    return {
      report: markdown,
    };
  }

  /**
   * Get all projects
   */
  async getProjects() {
    await this.delay(300);
    
    return {
      projects: FIXTURE_PROJECTS,
    };
  }

  /**
   * Get project by ID
   */
  async getProject(projectId: string) {
    await this.delay(200);
    
    const project = FIXTURE_PROJECTS.find(p => p.id === projectId) || FIXTURE_PROJECTS[0];
    
    return {
      project: {
        ...project,
        _count: {
          runs: project.runsCount,
        },
      },
    };
  }

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics() {
    await this.delay(300);
    
    return {
      metrics: FIXTURE_METRICS,
    };
  }

  /**
   * Get runs for a project
   */
  async getProjectRuns(projectId: string) {
    await this.delay(300);
    
    // Generate some mock runs
    const runs = [
      {
        id: 'fixture-run-1',
        status: 'completed',
        riskScore: 87,
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        endedAt: new Date().toISOString(),
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'fixture-run-2',
        status: 'completed',
        riskScore: 34,
        startedAt: new Date(Date.now() - 86400000).toISOString(),
        endedAt: new Date(Date.now() - 86000000).toISOString(),
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'fixture-run-3',
        status: 'failed',
        riskScore: null,
        startedAt: new Date(Date.now() - 172800000).toISOString(),
        endedAt: new Date(Date.now() - 172000000).toISOString(),
        createdAt: new Date(Date.now() - 172800000).toISOString(),
      },
    ];
    
    return {
      runs,
    };
  }

  /**
   * SSE stream endpoint (returns null in fixture mode - no live streaming)
   */
  async getRunStream(runId: string) {
    // No streaming in fixture mode
    return null;
  }

  /**
   * Simulate network delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Check if fixture mode is enabled
 */
export function isFixtureMode(): boolean {
  return process.env.NEXT_PUBLIC_USE_FIXTURES === 'true';
}

/**
 * Get the appropriate data source based on environment
 */
export function getDataSource() {
  if (isFixtureMode()) {
    console.log('🎭 Fixture mode enabled - using mock data');
    return new FixtureDataSource();
  }
  
  // Return null to indicate real API should be used
  return null;
}
