# Assessment Report Template

This document defines the structure and configuration of the assessment report.

## Report Sections

The assessment report consists of the following configurable sections:

### 1. Header Section
| Field | Source | Required |
|-------|--------|----------|
| Customer Name | `report.customer.name` | Yes |
| Template Name | `report.template.name` | Yes |
| Template Version | `report.template.version` | Yes |
| Overall Score | `report.overall_score` | Yes |

### 2. Meta Information
| Field | Source | Required |
|-------|--------|----------|
| Assessment Date | `report.assessment_date` | Yes |
| Status | `report.status` | Yes |
| Assessed By | `report.completed_by.name` | No |
| Completed At | `report.completed_at` | No |
| Questions Answered | `report.answered_questions / report.total_questions` | Yes |

### 3. Radar Chart Section (NEW)
| Field | Source | Required |
|-------|--------|----------|
| Dimension Radar | `report.dimension_scores` | Yes |
| Drill-down Data | `report.dimensions[].questions` | Yes |
| Comparison Data | `report.comparison_assessments` | No |

**Configuration Options:**
- `showRadarChart`: boolean (default: true)
- `enableDrilldown`: boolean (default: true)
- `showComparison`: boolean (default: true)
- `chartSize`: 'small' | 'medium' | 'large' (default: 'medium')

### 4. Dimension Scores Summary
| Field | Source | Required |
|-------|--------|----------|
| Dimension Name | `dimension_scores[key]` | Yes |
| Dimension Score | `dimension_scores[value]` | Yes |
| Progress Bar | Calculated from score | Yes |

### 5. Recommendations Section (NEW)
| Field | Source | Required |
|-------|--------|----------|
| Title | `recommendations[].title` | Yes |
| Description | `recommendations[].description` | Yes |
| Priority | `recommendations[].priority` | No |
| Category | `recommendations[].category` | No |

**Configuration Options:**
- `showRecommendations`: boolean (default: true)
- `groupByPriority`: boolean (default: false)
- `groupByCategory`: boolean (default: false)

### 6. Assessment Notes
| Field | Source | Required |
|-------|--------|----------|
| Notes | `report.notes` | No |

### 7. Detailed Responses (by Dimension)
For each dimension, display questions with:

| Field | Source | Required |
|-------|--------|----------|
| Question Number | `question.question_number` | Yes |
| Question Text | `question.question_text` | Yes |
| Score | `question.score` | Yes |
| Score Label | `question.score_label` | No |
| Notes | `question.notes` | No |
| Rating Description | `question.score_description` | No |
| Evidence Required | `question.score_evidence` | No |
| Assessor Evidence | `question.assessor_evidence` | No |
| Artifacts | `question.artifacts[]` | No |

**Configuration Options:**
- `showRatingDescriptions`: boolean (default: true)
- `showEvidence`: boolean (default: true)
- `showAssessorNotes`: boolean (default: true)
- `collapseDimensions`: boolean (default: false)

## Report Configuration Schema

```json
{
  "reportConfig": {
    "header": {
      "showLogo": true,
      "logoUrl": "/images/company-logo.png"
    },
    "radarChart": {
      "enabled": true,
      "drilldownEnabled": true,
      "comparisonEnabled": true,
      "size": "medium",
      "printSize": "large"
    },
    "recommendations": {
      "enabled": true,
      "groupBy": "priority",
      "showEmpty": false
    },
    "dimensions": {
      "showSummary": true,
      "showDetailedResponses": true,
      "collapsible": false
    },
    "questions": {
      "showRatingDescription": true,
      "showEvidence": true,
      "showNotes": true,
      "showArtifacts": true,
      "thumbnailSize": "small"
    },
    "export": {
      "includeCoverPage": true,
      "includeTableOfContents": true,
      "pageSize": "A4",
      "orientation": "portrait"
    }
  }
}
```

## Visual Layout

```
+--------------------------------------------------+
|  HEADER                                          |
|  [Logo] Customer Name                    [Score] |
|  Template Name v1.0                              |
+--------------------------------------------------+
|  META INFO                                       |
|  Date | Status | Assessor | Completed | Progress |
+--------------------------------------------------+
|  RADAR CHART                                     |
|  +--------------------+  +--------------+        |
|  |                    |  | Legend       |        |
|  |    [Radar Chart]   |  | - Current    |        |
|  |                    |  | - Previous   |        |
|  +--------------------+  +--------------+        |
|  [Click dimension to drill-down]                 |
+--------------------------------------------------+
|  DIMENSION SCORES                                |
|  Governance   [====----] 4.2                     |
|  Demand       [===-----] 3.5                     |
|  ...                                             |
+--------------------------------------------------+
|  RECOMMENDATIONS                                 |
|  [HIGH] Title 1                                  |
|  Description with markdown support...            |
|  [MEDIUM] Title 2                                |
|  ...                                             |
+--------------------------------------------------+
|  DETAILED RESPONSES                              |
|  --- Governance ---                              |
|  | # | Question | Score | Rating | Notes |      |
|  |---|----------|-------|--------|-------|      |
|  | 1 | ...      | 4     | ...    | ...   |      |
|  |   | Rating Description: ...           |      |
|  |   | Evidence: [link] [image]          |      |
|  --- Demand ---                                  |
|  ...                                             |
+--------------------------------------------------+
```

## Print/PDF Layout

For print and PDF export, the layout adjusts:

- Radar chart renders at larger size for clarity
- Page breaks inserted between dimensions
- Artifacts display as links (not embedded images)
- Color scheme adjusts for printing (high contrast)

## CSS Classes Reference

| Class | Purpose |
|-------|---------|
| `.assessment-report` | Main report container |
| `.report-header` | Header section |
| `.report-radar-section` | Radar chart container |
| `.report-radar-drilldown` | Drill-down view |
| `.report-recommendations` | Recommendations section |
| `.recommendation-card` | Individual recommendation |
| `.priority-high` | High priority badge (red) |
| `.priority-medium` | Medium priority badge (yellow) |
| `.priority-low` | Low priority badge (green) |
| `.report-dimension-section` | Dimension grouping |
| `.report-evidence-section` | Evidence display |
| `.evidence-thumbnail` | Image thumbnail |
| `.evidence-link` | Clickable artifact link |

## API Response Schema

The report endpoint (`GET /assessments/{id}/report`) returns:

```json
{
  "id": 123,
  "customer": {
    "id": 1,
    "name": "Acme Corp"
  },
  "template": {
    "id": 1,
    "name": "SPM Maturity Assessment",
    "version": "2.0"
  },
  "overall_score": 3.75,
  "dimension_scores": {
    "Governance": 4.2,
    "Demand": 3.5,
    "Resource": 3.8,
    "...": "..."
  },
  "status": "completed",
  "assessment_date": "2025-01-15",
  "completed_at": "2025-01-15T14:30:00Z",
  "completed_by": {
    "id": 1,
    "name": "John Smith"
  },
  "answered_questions": 45,
  "total_questions": 50,
  "notes": "Assessment notes...",
  "recommendations": [
    {
      "id": 1,
      "title": "Establish PMO",
      "description": "Create a Project Management Office to...",
      "priority": "High",
      "category": "Governance"
    }
  ],
  "dimensions": [
    {
      "dimension_name": "Governance",
      "dimension_score": 4.2,
      "questions": [
        {
          "question_number": "1.1",
          "question_text": "Is there a formal PMO?",
          "score": 4,
          "max_score": 5,
          "score_label": "Managed",
          "score_description": "A formal PMO exists and actively manages...",
          "score_evidence": "PMO charter, org chart showing PMO",
          "notes": "Strong PMO in place since 2023",
          "artifacts": [
            {
              "type": "link",
              "url": "https://...",
              "title": "PMO Charter"
            },
            {
              "type": "image",
              "url": "/uploads/...",
              "thumbnail": "/uploads/.../thumb.png"
            }
          ]
        }
      ]
    }
  ],
  "comparison_assessments": [
    {
      "id": 120,
      "date": "2024-06-15",
      "overall_score": 3.2,
      "dimension_scores": {...}
    }
  ]
}
```
