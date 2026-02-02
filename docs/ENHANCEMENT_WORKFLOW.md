# Enhancement Workflow Template

This document describes the standard workflow for implementing enhancement requests in CS Tracker.

## Overview

The enhancement workflow follows a structured process to ensure quality, traceability, and testability:

```
Request → GitHub Issue → Acceptance Criteria → Validation → Implementation → E2E Tests → Review → Merge
```

## Workflow Steps

### 1. Capture Enhancement Request

When an enhancement is requested:

1. **Gather Requirements**
   - What feature is being enhanced?
   - What specific changes are needed?
   - Who is the target user?
   - What is the expected outcome?

2. **Ask Clarifying Questions**
   - Data sources and formats
   - UI/UX preferences
   - Integration points
   - Edge cases

### 2. Create GitHub Issues

For each distinct enhancement:

1. **Search for Existing Issues**
   ```bash
   gh issue list --search "keyword" --limit 20
   ```

2. **Create New Issue** using the enhancement template:
   ```bash
   gh issue create --title "Enhancement: [Description]" \
     --label "enhancement,P0" \
     --body "$(cat <<'EOF'
   ## Description
   [Clear description]

   ## Acceptance Criteria
   - [ ] Criterion 1
   - [ ] Criterion 2

   Part of #[epic-number]
   EOF
   )"
   ```

3. **Link to Parent Epic**
   - Reference the parent epic in the issue body
   - Add appropriate labels (feature area, priority)

### 3. Define Acceptance Criteria

Write testable acceptance criteria that:

- Are specific and measurable
- Use checkbox format for tracking
- Cover both happy path and edge cases
- Include UI, API, and data requirements
- Specify print/export behavior if applicable

**Example:**
```markdown
## Acceptance Criteria
- [ ] User can add recommendations during assessment
- [ ] Multiple recommendations supported per assessment
- [ ] Recommendations display in report with priority badges
- [ ] API returns recommendations in GET /assessments/{id}/report
- [ ] Recommendations included in Excel export
```

### 4. Validate with Stakeholder

Before implementation:

1. Present acceptance criteria to stakeholder
2. Confirm understanding of requirements
3. Get explicit approval to proceed
4. Document any changes or clarifications

### 5. Implementation

#### Parallel Agent Strategy

For complex enhancements, use parallel agents:

```
Agent 1: GitHub Issue Management (creates issues, commits changes)
Agent 2: Feature Implementation A
Agent 3: Feature Implementation B
Agent 4: Feature Implementation C
Agent 5: E2E Test Development (blocked by implementation)
```

#### Implementation Guidelines

- Read existing code before modifying
- Follow existing patterns and conventions
- Make atomic commits with descriptive messages
- Reference issue numbers in commits
- Update script versions for cache busting

#### Commit Message Format
```
[Action] [what changed] (refs #issue-number)

Examples:
- Add radar chart to assessment report modal (refs #215)
- Display rating descriptions in report (closes #216)
- Create recommendation CRUD endpoints (refs #217)
```

### 6. Build E2E Tests

Create Playwright tests that validate each acceptance criterion:

```javascript
test('radar chart displays in assessment report', async ({ page }) => {
  // Navigate to customer detail
  // Open assessment report
  // Verify radar chart is visible
  // Verify dimension labels
  // Test drill-down functionality
});
```

Test file location: `tests/e2e/[feature-name].spec.ts`

### 7. Review and Merge

1. Verify all acceptance criteria are met
2. Run E2E tests and confirm passing
3. Update GitHub issue with implementation notes
4. Close issue when merged

## File Locations

| Type | Location |
|------|----------|
| Backend Models | `backend/app/models/` |
| Backend API | `backend/app/api/` |
| Backend Schemas | `backend/app/schemas/` |
| Frontend JS | `prototype/js/` |
| Frontend HTML | `prototype/` |
| Frontend CSS | `prototype/css/` |
| E2E Tests | `tests/e2e/` |
| API Client | `prototype/js/api.js` |

## Example: Assessment Report Enhancement

### Request
"Add radar chart, rating descriptions, and recommendations to assessment report"

### Clarifying Questions
1. What data for radar chart? → Lens-level + drill-down
2. Source of recommendations? → Manual entry by assessor
3. What is evidence? → Notes + linked artifacts
4. Templates to store? → Process + report templates

### GitHub Issues Created
- #215: Radar chart drill-down and comparison
- #216: Rating descriptions and evidence
- #217: Recommendations section

### Parallel Implementation
- Agent 1: Radar chart (Chart.js integration)
- Agent 2: Rating descriptions (API + UI)
- Agent 3: Recommendations (Model + API + UI)
- Agent 4: E2E tests (after implementation)

### Validation
- Present acceptance criteria
- Get stakeholder approval
- Proceed with implementation

## Checklist

Use this checklist for each enhancement:

- [ ] Requirements gathered and clarified
- [ ] GitHub issue created with acceptance criteria
- [ ] Acceptance criteria validated with stakeholder
- [ ] Implementation complete
- [ ] Atomic commits with issue references
- [ ] E2E tests written and passing
- [ ] Issue closed/updated
