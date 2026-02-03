# Production Override Toggle - Complete Explanation

## What Is It?

The **production override** is a safety mechanism that prevents users from accidentally running adversarial AI red team tests in their real production environment.

By default: **Production testing is BLOCKED** 🚫

To enable it, users must explicitly check a box acknowledging the risks.

---

## How It Works (Current Implementation)

### 1. Database Schema

**File**: `packages/db/prisma/schema.prisma`

```prisma
model Project {
  id                  String     @id @default(uuid())
  environment         ProjectEnv @default(sandbox)  // sandbox | staging | prod
  prodOverrideEnabled Boolean    @default(false)    // ⚠️ THIS FIELD
  // ... other fields
}
```

**Key Points**:
- `prodOverrideEnabled` defaults to `false` (safe by default)
- Stored per project (not global)
- Persists across sessions

---

### 2. UI: Create New Project

**File**: `apps/ui/src/components/dashboard/ProjectsList.tsx` (lines 295-330)

When creating a new project with environment = "prod":

```tsx
{environment === 'prod' && (
  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
    <h4 className="font-semibold text-yellow-800 mb-1">
      ⚠️ Production Environment Warning
    </h4>
    <p className="text-sm text-yellow-700 mb-2">
      Running red team tests in production can expose real secrets 
      and trigger real actions. Ensure you understand the risks.
    </p>
    <label className="flex items-center">
      <input
        type="checkbox"
        checked={prodOverride}
        onChange={(e) => setProdOverride(e.target.checked)}
      />
      <span className="ml-2">
        I understand the risks and want to enable production testing
      </span>
    </label>
  </div>
)}

<button
  type="submit"
  disabled={isSubmitting || (environment === 'prod' && !prodOverride)}
  // ☝️ Submit button is DISABLED until checkbox is checked
>
  Create Project
</button>
```

**Visual Flow**:

```
User selects "Production" environment
         ↓
Yellow warning box appears
         ↓
"Create Project" button is DISABLED
         ↓
User must check "I understand the risks..."
         ↓
Button becomes enabled
         ↓
POST /api/projects with prodOverrideEnabled=true
```

---

### 3. UI: Project Settings (Edit Existing Project)

**File**: `apps/ui/src/components/projects/ProjectSettings.tsx` (lines 190-210)

When editing a project that's set to production:

```tsx
{formData.environment === 'prod' && (
  <div className="flex items-start">
    <input
      type="checkbox"
      id="prodOverride"
      checked={formData.prodOverrideEnabled}
      onChange={(e) => setFormData({ 
        ...formData, 
        prodOverrideEnabled: e.target.checked 
      })}
    />
    <label htmlFor="prodOverride">
      I understand the risks of running tests in production
    </label>
  </div>
)}
```

**Simpler than create flow** (just a checkbox, no big warning box).

---

### 4. API Enforcement: Create Project

**File**: `apps/ui/src/app/api/projects/route.ts` (lines 75-78)

```typescript
// Backend validation
if (validated.environment === 'prod' && !validated.prodOverrideEnabled) {
  return NextResponse.json(
    { error: 'Production environment requires explicit override confirmation' },
    { status: 403 } // Forbidden
  );
}
```

**Even if someone bypasses the UI** (e.g., curl, Postman), the API rejects it.

---

### 5. API Enforcement: Create Run

**File**: `apps/ui/src/app/api/projects/[projectId]/runs/route.ts` (lines 57-62)

```typescript
// Double-check when creating a run
if (project.environment === "prod" && !project.prodOverrideEnabled) {
  return NextResponse.json(
    {
      error: "Production runs disabled",
      message: "Enable production override in project settings to run tests in production",
    },
    { status: 403 } // Forbidden
  );
}
```

**This is the critical enforcement point**:
- Even if a project somehow has `environment=prod` but `prodOverrideEnabled=false`
- The run creation is blocked
- User gets clear error message pointing them to settings

---

## Complete Flow Example

### Scenario: User Wants to Test Production Agent

**Step 1**: User clicks "Create Project"

**Step 2**: Fills in project name, selects "Production" environment

**Step 3**: Yellow warning box appears:
```
⚠️ Production Environment Warning

Running red team tests in production can expose real secrets 
and trigger real actions. Ensure you understand the risks.

☐ I understand the risks and want to enable production testing
```

**Step 4**: "Create Project" button is grayed out (disabled)

**Step 5**: User checks the box (acknowledging risks)

**Step 6**: Button becomes enabled, user clicks "Create Project"

**Step 7**: POST request sent to API:
```json
{
  "name": "My Prod Agent",
  "environment": "prod",
  "prodOverrideEnabled": true
}
```

**Step 8**: API validates:
- ✅ `environment === 'prod'` 
- ✅ `prodOverrideEnabled === true` 
- ✅ Request allowed

**Step 9**: Project created in database:
```sql
INSERT INTO projects (
  name, 
  environment, 
  prod_override_enabled
) VALUES (
  'My Prod Agent', 
  'prod', 
  true
);
```

**Step 10**: Later, when user clicks "Run Tests":

POST `/api/projects/{id}/runs` checks:
```typescript
if (project.environment === 'prod' && !project.prodOverrideEnabled) {
  // BLOCKED!
}
```

Since `prodOverrideEnabled = true`, run proceeds.

---

## What's Missing (The 5% Gap)

### Current Implementation:
- ✅ Single checkbox
- ✅ Yellow warning box
- ✅ API enforcement
- ✅ Database persistence

### What the Spec Wanted:

**More Scary UI** with **3 separate checkboxes**:

```tsx
<Dialog>
  <h2>⚠️ Enable Production Testing</h2>
  
  <Alert type="danger">
    Production testing is DANGEROUS. Confirm ALL safety checks:
  </Alert>
  
  <Checkbox required>
    ✓ This is NOT customer-facing production traffic
  </Checkbox>
  
  <Checkbox required>
    ✓ No real customer secrets exist in this environment
  </Checkbox>
  
  <Checkbox required>
    ✓ I accept that adversarial prompts MAY trigger unsafe behavior
  </Checkbox>
  
  <Button disabled={!allThreeChecked}>
    I Understand - Enable Production Testing
  </Button>
</Dialog>
```

**Plus Audit Logging**:
```typescript
await prisma.auditLog.create({
  data: {
    orgId,
    userId,
    action: 'ENABLE_PROD_OVERRIDE',
    projectId,
    metadata: { 
      confirmedAt: new Date(),
      ipAddress: request.ip 
    }
  }
});
```

---

## Why We Simplified

### Pros of Current (1 Checkbox):
✅ **Faster to build** - Shipped in M2  
✅ **Still safe** - Production is blocked by default  
✅ **Functionally equivalent** - Same outcome  
✅ **Less UI friction** - Advanced users can proceed quickly

### Cons:
❌ **Less scary** - Users might click without reading  
❌ **No audit trail** - Can't track who/when enabled it  
❌ **Single failure point** - One checkbox = one mistake away

---

## Risk Assessment

### Current Risk Level: **MEDIUM** 🟡

**Why Medium (Not High)**:
- Production is blocked by default ✅
- API enforces it even if UI bypassed ✅
- Clear warning text ✅

**Why Not Low**:
- Single checkbox could be clicked casually
- No record of who enabled it or when
- No way to audit prod override usage

---

## Recommended Improvements (Before Production)

### Priority 1: Enhanced UI Flow (4 hours)

**Replace** single checkbox with:

1. **Modal Dialog** (not inline):
   ```tsx
   <Dialog title="Enable Production Testing">
     <AlertBox severity="error">
       ⚠️ DANGER: This will run adversarial attacks in production
     </AlertBox>
     
     <CheckboxList required>
       <Checkbox>
         This is NOT customer-facing traffic
       </Checkbox>
       <Checkbox>
         No real secrets exist here
       </Checkbox>
       <Checkbox>
         I accept unsafe behavior may occur
       </Checkbox>
     </CheckboxList>
     
     <Button 
       variant="danger" 
       disabled={!allChecked}
     >
       I Understand - Enable
     </Button>
   </Dialog>
   ```

2. **Show confirmation in settings**:
   ```tsx
   {project.prodOverrideEnabled && (
     <Alert type="warning">
       ✓ Production override ENABLED by {user.name} on {date}
       <Button onClick={openDisableDialog}>Disable</Button>
     </Alert>
   )}
   ```

### Priority 2: Audit Logging (2 hours)

**Create AuditLog table**:
```prisma
model AuditLog {
  id        String   @id @default(uuid())
  orgId     String
  userId    String
  action    String   // 'ENABLE_PROD_OVERRIDE', 'DISABLE_PROD_OVERRIDE'
  projectId String?
  metadata  Json?    // { confirmedAt, ipAddress }
  createdAt DateTime @default(now())
}
```

**Log on enable**:
```typescript
await prisma.auditLog.create({
  data: {
    orgId: session.orgId,
    userId: session.userId,
    action: 'ENABLE_PROD_OVERRIDE',
    projectId: project.id,
    metadata: {
      confirmedAt: new Date().toISOString(),
      userAgent: request.headers['user-agent'],
    }
  }
});
```

**Display in UI**:
```tsx
<h3>Production Override History</h3>
<Table>
  {auditLogs.map(log => (
    <tr>
      <td>{log.action}</td>
      <td>{log.user.name}</td>
      <td>{formatDate(log.createdAt)}</td>
    </tr>
  ))}
</Table>
```

### Priority 3: Email Notification (Optional)

When production override is enabled, send email to org admins:

```
Subject: ⚠️ Production Testing Enabled for Project "X"

User {name} has enabled production testing for project "{projectName}".

This means adversarial AI red team tests will run against your production environment.

If this was not intentional, disable it immediately:
[Go to Project Settings]

Risks:
- Real secrets may be exposed
- Real actions may be triggered
- Production agents may behave unexpectedly

Questions? Reply to this email.
```

---

## Implementation Complexity

| Improvement | Effort | Impact | Priority |
|------------|--------|--------|----------|
| 3-checkbox modal | 4 hours | High (UX clarity) | **High** |
| Audit logging | 2 hours | Medium (compliance) | **High** |
| Settings display | 1 hour | Low (visibility) | Medium |
| Email notification | 3 hours | Low (awareness) | Low |

**Total: ~10 hours to reach 100% spec compliance**

---

## Summary

### Current State:
- ✅ **Functional**: Production is blocked by default
- ✅ **Safe**: API enforces override check
- ✅ **Clear**: Warning text explains risks
- ⚠️ **Simple**: Only 1 checkbox (not 3)
- ⚠️ **No audit**: Can't track who enabled it

### Gap vs Spec:
- **UI**: 1 checkbox instead of 3-checkbox confirmation flow
- **Audit**: No logging of who/when enabled override
- **Visibility**: No history view in settings

### Production Readiness:
**Current**: 85% - Safe but could be scarier  
**After 10 hours work**: 100% - Spec-compliant and enterprise-ready

### Recommendation:
**Ship current version for beta** (it's safe), then add 3-checkbox flow + audit logging before GA.

The core safety mechanism works. The improvements are about:
1. Making it **harder to enable accidentally**
2. Creating an **audit trail for compliance**
3. Giving **visibility to who enabled it**

None of these block MVP launch.
