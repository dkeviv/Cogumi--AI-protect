# Fixture Mode — UI Development Without Backend

## Overview

Fixture mode enables full UI development and testing without running the backend services (API, worker, sidecar). This is critical for:

- **Rapid iteration** during UI development
- **Component development** in isolation
- **Demos** without infrastructure
- **Testing** UI behavior with known data

## How It Works

When `NEXT_PUBLIC_USE_FIXTURES=true`, the UI loads data from `/fixtures/*.json` files instead of making API requests.

The `FixtureDataSource` class in `/apps/ui/src/lib/fixtureDataSource.ts`:
- Loads fixture JSON files at build time
- Returns mock data for all API endpoints
- Simulates network delays (200-300ms)
- Provides realistic data structures

## Enabling Fixture Mode

### Development

```bash
# In apps/ui/.env.local
NEXT_PUBLIC_USE_FIXTURES=true
```

Then restart your dev server:

```bash
npm run dev
```

### Build-time

For demos or staging builds:

```bash
# In apps/ui/.env.production
NEXT_PUBLIC_USE_FIXTURES=true
```

## What Works in Fixture Mode

✅ **Dashboard**
- Projects list with 3 mock projects
- Metrics (total projects, runs, findings, risk score)

✅ **Project Overview**
- Project details (staging/prod/dev environments)
- Recent runs list
- Run stats

✅ **Run Detail Page**
- Exploit Feed with story steps
- Evidence Panel with conversation/network/findings tabs
- Timeline Scrubber
- Proof Drawer with chain-of-evidence

✅ **Report Page**
- Generated markdown report
- Download functionality

✅ **Connect Wizard**
- All 5 steps (visual only, no real token generation)

✅ **Settings Page**
- All 4 tabs (General/Security/Tokens/Retention)

## What Doesn't Work

❌ **Live streaming** - SSE endpoints return null in fixture mode  
❌ **Mutations** - Create/update/delete operations (wizard, settings changes)  
❌ **Real token generation** - Tokens are mock data only  
❌ **Validation** - No real endpoint testing or connection verification

## Available Fixtures

### Event Data

**`/fixtures/events_escalation_attempt.json`**
- Events showing privilege escalation attempt
- Used in Run page Network tab

**`/fixtures/events_exfil_attempt.json`**
- Events showing data exfiltration attempt
- Used in Run page Network tab

**`/fixtures/events_secret_leak.json`**
- Events showing secrets exposure
- Used in Run page Network tab

### Analysis Data

**`/fixtures/findings_expected.json`**
- Expected security findings
- Used in Run page Findings tab

**`/fixtures/story_steps_expected.json`**
- Expected narrative story steps
- Used in Run page Exploit Feed

## Mock Data

### Projects

```typescript
const FIXTURE_PROJECTS = [
  {
    id: 'fixture-project-1',
    name: 'Demo AI Agent',
    environment: 'staging',
    runsCount: 42,
    lastRiskScore: 87,
  },
  // ... 2 more projects
];
```

### Runs

```typescript
const FIXTURE_RUN = {
  id: 'fixture-run-1',
  status: 'completed',
  riskScore: 87,
  project: {
    name: 'Demo AI Agent',
    environment: 'staging',
  },
};
```

### Metrics

```typescript
const FIXTURE_METRICS = {
  totalProjects: 3,
  runsThisWeek: 23,
  openFindings: 7,
  worstRiskScore: 87,
};
```

## Using Fixture Mode in Components

The data source abstraction is automatic:

```typescript
import { getDataSource } from '@/lib/fixtureDataSource';

export default async function RunPage({ params }: { params: { runId: string } }) {
  const ds = getDataSource();
  
  if (ds) {
    // Fixture mode - use mock data
    const { run } = await ds.getRun(params.runId);
    const { steps } = await ds.getStorySteps(params.runId);
    // ...
  } else {
    // Real mode - use API
    const run = await fetch(`/api/runs/${params.runId}`);
    // ...
  }
}
```

## Adding New Fixtures

To add fixture data for a new page:

1. **Create the JSON file** in `/fixtures/your_data.json`

2. **Import in fixtureDataSource.ts**
   ```typescript
   import yourData from '@/../../../fixtures/your_data.json';
   ```

3. **Add a method to FixtureDataSource**
   ```typescript
   async getYourData() {
     await this.delay(200);
     return yourData;
   }
   ```

4. **Use in your component**
   ```typescript
   const ds = getDataSource();
   if (ds) {
     const data = await ds.getYourData();
   }
   ```

## Testing Fixture Mode

### Manual Testing

1. Enable fixture mode: `NEXT_PUBLIC_USE_FIXTURES=true`
2. Visit pages in this order:
   - `/dashboard` - Verify 3 projects, metrics load
   - `/projects/fixture-project-1` - Verify project details, runs list
   - `/runs/fixture-run-1` - Verify story steps, events, findings
   - `/runs/fixture-run-1/report` - Verify markdown report
   - `/projects/fixture-project-1/setup` - Verify wizard (visual only)
   - `/projects/fixture-project-1/settings` - Verify tabs (visual only)

3. Check console for: `🎭 Fixture mode enabled - using mock data`

### Automated Testing (Future)

```typescript
// In tests
process.env.NEXT_PUBLIC_USE_FIXTURES = 'true';

// Your tests run against fixtures
```

## Switching Back to Real Mode

```bash
# In apps/ui/.env.local
NEXT_PUBLIC_USE_FIXTURES=false

# Or just delete the line
```

Restart dev server. The UI will make real API calls.

## Console Logging

When fixture mode is enabled, you'll see:

```
🎭 Fixture mode enabled - using mock data
```

This confirms fixture mode is active.

## Limitations

- **No state persistence** - Mutations don't persist
- **Single run** - Only one run ID works: `fixture-run-1`
- **Single project** - Only three project IDs work: `fixture-project-1/2/3`
- **No authentication** - Auth flows are bypassed (add mock if needed)
- **Static data** - Data doesn't change over time

## Best Practices

✅ **DO** use fixture mode for UI development  
✅ **DO** use fixture mode for demos  
✅ **DO** disable fixture mode for integration testing  
✅ **DO** keep fixture data realistic  

❌ **DON'T** deploy fixture mode to production  
❌ **DON'T** use fixture mode for API testing  
❌ **DON'T** commit `.env.local` with fixture mode enabled  

## Troubleshooting

**Page shows empty/loading state forever**
- Check console for `🎭 Fixture mode enabled` message
- Verify `NEXT_PUBLIC_USE_FIXTURES=true` in `.env.local`
- Restart dev server after changing env vars

**"Cannot read property X of undefined" errors**
- Check fixture JSON structure matches expected data
- Verify fixture imports in `fixtureDataSource.ts`
- Check if array access needs `.array` wrapper (fixtures are in `{ key: [...] }` format)

**TypeScript errors in fixtureDataSource.ts**
- Use `(fixtureData as any).array` to access wrapped arrays
- Fixtures from JSON are wrapped in objects, not raw arrays

**Changes to fixtures not showing**
- Restart dev server (fixtures loaded at build time)
- Clear browser cache
- Check JSON syntax is valid

---

**Next Steps:**

When backend is ready, simply set `NEXT_PUBLIC_USE_FIXTURES=false` and all API calls will switch to real endpoints automatically.
