"""
Migration script for TBM and FinOps Assessment Framework.

This migration adds:
1. TBM dimensions (6) - Cost Transparency, IT Financial Management, etc.
2. FinOps dimensions (6) - Cloud Visibility, Cost Governance, etc.
3. TBM use cases (12) - mapped to Apptio A1 modules (Costing, Planning, Studio)
4. FinOps use cases (14) - mapped to Cloudability features
5. Apptio A1 solutions (12) - Costing, Planning, Studio modules
6. Cloudability solutions (14) - visibility, governance, optimization features
7. Dimension-UseCase mappings for TBM and FinOps
8. UseCase-Solution mappings for both frameworks

Run this script after the multi-assessment support migration:
    python -m app.migrations.20260205_add_tbm_finops_framework
"""
import asyncio
from sqlalchemy import text
from app.core.database import engine, async_session


# TBM Assessment Framework Data
TBM_DIMENSIONS = [
    {
        "name": "Cost Transparency",
        "description": "Ability to allocate and report IT costs accurately",
        "display_order": 1
    },
    {
        "name": "IT Financial Management",
        "description": "Budget planning, forecasting, and variance analysis",
        "display_order": 2
    },
    {
        "name": "Service Orientation",
        "description": "Managing IT as services with defined costs",
        "display_order": 3
    },
    {
        "name": "Organizational Alignment",
        "description": "IT and business partnership on financial decisions",
        "display_order": 4
    },
    {
        "name": "Data & Tools Maturity",
        "description": "Quality and integration of financial data systems",
        "display_order": 5
    },
    {
        "name": "Benchmarking",
        "description": "Comparing costs against industry standards",
        "display_order": 6
    }
]

TBM_USE_CASES = [
    # Costing module use cases
    {"name": "Cost Consolidation", "category": "Costing", "display_order": 1,
     "description": "Consolidate IT costs from multiple sources into a unified view"},
    {"name": "IT Cost Allocation", "category": "Costing", "display_order": 2,
     "description": "Allocate IT costs to business units and services"},
    {"name": "Showback Reporting", "category": "Costing", "display_order": 3,
     "description": "Provide visibility into IT costs consumed by business units"},
    {"name": "Chargeback Implementation", "category": "Costing", "display_order": 4,
     "description": "Implement cost recovery through internal billing"},
    # Planning module use cases
    {"name": "Budget Planning", "category": "Planning", "display_order": 5,
     "description": "Create and manage IT budgets aligned with business priorities"},
    {"name": "Forecast Modeling", "category": "Planning", "display_order": 6,
     "description": "Model future IT costs based on demand and trends"},
    {"name": "Variance Analysis", "category": "Planning", "display_order": 7,
     "description": "Analyze differences between planned and actual costs"},
    {"name": "Scenario Planning", "category": "Planning", "display_order": 8,
     "description": "Model what-if scenarios for IT investment decisions"},
    # Studio module use cases
    {"name": "Cost Model Configuration", "category": "Studio", "display_order": 9,
     "description": "Configure and customize cost allocation models"},
    {"name": "Data Integration Setup", "category": "Studio", "display_order": 10,
     "description": "Set up data connectors and integration pipelines"},
    {"name": "Custom Reporting", "category": "Studio", "display_order": 11,
     "description": "Build custom reports and dashboards for stakeholders"},
    {"name": "Taxonomy Management", "category": "Studio", "display_order": 12,
     "description": "Manage cost categories, towers, and taxonomies"}
]

APPTIO_A1_SOLUTIONS = [
    # Costing module solutions
    {"name": "Apptio Cost Transparency", "category": "Costing", "version": "1.0",
     "description": "Unified view of IT spend across all cost sources"},
    {"name": "Apptio IT Allocation", "category": "Costing", "version": "1.0",
     "description": "Allocate costs to business units, services, and applications"},
    {"name": "Apptio Showback", "category": "Costing", "version": "1.0",
     "description": "Generate showback reports for business unit consumption"},
    {"name": "Apptio Chargeback", "category": "Costing", "version": "1.0",
     "description": "Implement internal billing and cost recovery"},
    # Planning module solutions
    {"name": "Apptio Budget Manager", "category": "Planning", "version": "1.0",
     "description": "IT budget creation, tracking, and management"},
    {"name": "Apptio Forecasting", "category": "Planning", "version": "1.0",
     "description": "Predictive cost modeling and trend analysis"},
    {"name": "Apptio Variance Analyzer", "category": "Planning", "version": "1.0",
     "description": "Plan vs actual analysis with drill-down capabilities"},
    {"name": "Apptio Scenario Modeler", "category": "Planning", "version": "1.0",
     "description": "What-if analysis for IT investment decisions"},
    # Studio module solutions
    {"name": "Apptio Model Builder", "category": "Studio", "version": "1.0",
     "description": "Visual cost model configuration and customization"},
    {"name": "Apptio Data Connectors", "category": "Studio", "version": "1.0",
     "description": "Pre-built integrations for common data sources"},
    {"name": "Apptio Report Designer", "category": "Studio", "version": "1.0",
     "description": "Custom report and dashboard builder"},
    {"name": "Apptio Taxonomy Editor", "category": "Studio", "version": "1.0",
     "description": "Manage IT towers, cost pools, and taxonomies"}
]

# FinOps Assessment Framework Data
FINOPS_DIMENSIONS = [
    {
        "name": "Cloud Visibility",
        "description": "Ability to see and understand cloud spend",
        "display_order": 1
    },
    {
        "name": "Cost Governance",
        "description": "Policies and controls for cloud spending",
        "display_order": 2
    },
    {
        "name": "Rate Optimization",
        "description": "Leveraging discounts and pricing models",
        "display_order": 3
    },
    {
        "name": "Usage Optimization",
        "description": "Right-sizing and eliminating waste",
        "display_order": 4
    },
    {
        "name": "Cloud Financial Planning",
        "description": "Budgeting and forecasting cloud costs",
        "display_order": 5
    },
    {
        "name": "FinOps Culture",
        "description": "Organizational adoption of FinOps practices",
        "display_order": 6
    }
]

FINOPS_USE_CASES = [
    # Visibility use cases
    {"name": "Multi-Cloud Cost Visibility", "category": "Visibility", "display_order": 1,
     "description": "Unified view of costs across AWS, Azure, GCP, and other cloud providers"},
    {"name": "Cost Anomaly Detection", "category": "Visibility", "display_order": 2,
     "description": "Automated detection and alerting for unusual spending patterns"},
    {"name": "Resource Tagging Compliance", "category": "Visibility", "display_order": 3,
     "description": "Monitor and enforce tagging standards for cost allocation"},
    {"name": "Unit Economics Tracking", "category": "Visibility", "display_order": 4,
     "description": "Track cost per unit metrics (cost per customer, transaction, etc.)"},
    # Governance use cases
    {"name": "Budget Policy Enforcement", "category": "Governance", "display_order": 5,
     "description": "Enforce spending limits and budget policies"},
    {"name": "Access Control Management", "category": "Governance", "display_order": 6,
     "description": "Manage who can view and act on cloud cost data"},
    {"name": "Approval Workflows", "category": "Governance", "display_order": 7,
     "description": "Implement approval processes for cloud resource requests"},
    {"name": "Compliance Reporting", "category": "Governance", "display_order": 8,
     "description": "Generate compliance reports for audits and governance"},
    # Rate Optimization use cases
    {"name": "Reserved Instance Management", "category": "Rate Optimization", "display_order": 9,
     "description": "Manage and optimize reserved instance purchases"},
    {"name": "Spot Instance Optimization", "category": "Rate Optimization", "display_order": 10,
     "description": "Leverage spot/preemptible instances for cost savings"},
    {"name": "Commitment Utilization", "category": "Rate Optimization", "display_order": 11,
     "description": "Monitor and optimize committed use discounts"},
    # Usage Optimization use cases
    {"name": "Rightsizing Recommendations", "category": "Usage Optimization", "display_order": 12,
     "description": "Identify and right-size over-provisioned resources"},
    {"name": "Idle Resource Detection", "category": "Usage Optimization", "display_order": 13,
     "description": "Find and eliminate unused cloud resources"},
    {"name": "Container Optimization", "category": "Usage Optimization", "display_order": 14,
     "description": "Optimize container and Kubernetes costs"}
]

CLOUDABILITY_SOLUTIONS = [
    # Visibility solutions
    {"name": "Cloudability Dashboard", "category": "Visibility", "version": "1.0",
     "description": "Unified multi-cloud cost dashboard and analytics"},
    {"name": "Cloudability Anomaly Alerts", "category": "Visibility", "version": "1.0",
     "description": "Automated anomaly detection and alerting"},
    {"name": "Cloudability Tag Manager", "category": "Visibility", "version": "1.0",
     "description": "Tagging compliance monitoring and enforcement"},
    {"name": "Cloudability Business Metrics", "category": "Visibility", "version": "1.0",
     "description": "Unit economics and business KPI tracking"},
    # Governance solutions
    {"name": "Cloudability Budget Policies", "category": "Governance", "version": "1.0",
     "description": "Budget policy creation and enforcement"},
    {"name": "Cloudability Access Controls", "category": "Governance", "version": "1.0",
     "description": "Role-based access control for cost data"},
    {"name": "Cloudability Workflows", "category": "Governance", "version": "1.0",
     "description": "Automated approval and request workflows"},
    {"name": "Cloudability Audit Reports", "category": "Governance", "version": "1.0",
     "description": "Compliance and audit reporting"},
    # Rate Optimization solutions
    {"name": "Cloudability RI Planner", "category": "Rate Optimization", "version": "1.0",
     "description": "Reserved instance analysis and purchase recommendations"},
    {"name": "Cloudability Spot Advisor", "category": "Rate Optimization", "version": "1.0",
     "description": "Spot instance opportunity identification"},
    {"name": "Cloudability Commitment Tracker", "category": "Rate Optimization", "version": "1.0",
     "description": "Commitment utilization monitoring and optimization"},
    # Usage Optimization solutions
    {"name": "Cloudability Rightsizing", "category": "Usage Optimization", "version": "1.0",
     "description": "Automated rightsizing recommendations"},
    {"name": "Cloudability Idle Detector", "category": "Usage Optimization", "version": "1.0",
     "description": "Idle resource identification and cleanup"},
    {"name": "Cloudability Container Insights", "category": "Usage Optimization", "version": "1.0",
     "description": "Container and Kubernetes cost optimization"}
]

# Dimension -> Use Case mappings
TBM_DIMENSION_USE_CASE_MAPPINGS = {
    "Cost Transparency": ["Cost Consolidation", "IT Cost Allocation", "Showback Reporting"],
    "IT Financial Management": ["Budget Planning", "Forecast Modeling", "Variance Analysis"],
    "Service Orientation": ["Chargeback Implementation", "Showback Reporting"],
    "Organizational Alignment": ["Showback Reporting", "Custom Reporting"],
    "Data & Tools Maturity": ["Data Integration Setup", "Cost Model Configuration"],
    "Benchmarking": ["Variance Analysis", "Custom Reporting"]
}

FINOPS_DIMENSION_USE_CASE_MAPPINGS = {
    "Cloud Visibility": ["Multi-Cloud Cost Visibility", "Cost Anomaly Detection", "Resource Tagging Compliance"],
    "Cost Governance": ["Budget Policy Enforcement", "Access Control Management", "Approval Workflows"],
    "Rate Optimization": ["Reserved Instance Management", "Spot Instance Optimization", "Commitment Utilization"],
    "Usage Optimization": ["Rightsizing Recommendations", "Idle Resource Detection", "Container Optimization"],
    "Cloud Financial Planning": ["Budget Policy Enforcement", "Compliance Reporting"],
    "FinOps Culture": ["Budget Policy Enforcement", "Multi-Cloud Cost Visibility", "Access Control Management",
                       "Cost Anomaly Detection"]
}

# Use Case -> Solution mappings
TBM_USE_CASE_SOLUTION_MAPPINGS = {
    "Cost Consolidation": ["Apptio Cost Transparency"],
    "IT Cost Allocation": ["Apptio IT Allocation"],
    "Showback Reporting": ["Apptio Showback"],
    "Chargeback Implementation": ["Apptio Chargeback"],
    "Budget Planning": ["Apptio Budget Manager"],
    "Forecast Modeling": ["Apptio Forecasting"],
    "Variance Analysis": ["Apptio Variance Analyzer"],
    "Scenario Planning": ["Apptio Scenario Modeler"],
    "Cost Model Configuration": ["Apptio Model Builder"],
    "Data Integration Setup": ["Apptio Data Connectors"],
    "Custom Reporting": ["Apptio Report Designer"],
    "Taxonomy Management": ["Apptio Taxonomy Editor"]
}

FINOPS_USE_CASE_SOLUTION_MAPPINGS = {
    "Multi-Cloud Cost Visibility": ["Cloudability Dashboard"],
    "Cost Anomaly Detection": ["Cloudability Anomaly Alerts"],
    "Resource Tagging Compliance": ["Cloudability Tag Manager"],
    "Unit Economics Tracking": ["Cloudability Business Metrics"],
    "Budget Policy Enforcement": ["Cloudability Budget Policies"],
    "Access Control Management": ["Cloudability Access Controls"],
    "Approval Workflows": ["Cloudability Workflows"],
    "Compliance Reporting": ["Cloudability Audit Reports"],
    "Reserved Instance Management": ["Cloudability RI Planner"],
    "Spot Instance Optimization": ["Cloudability Spot Advisor"],
    "Commitment Utilization": ["Cloudability Commitment Tracker"],
    "Rightsizing Recommendations": ["Cloudability Rightsizing"],
    "Idle Resource Detection": ["Cloudability Idle Detector"],
    "Container Optimization": ["Cloudability Container Insights"]
}


async def run_migration():
    """Run the TBM/FinOps framework migration."""
    print("Starting TBM/FinOps framework migration...")

    async with async_session() as session:
        # Step 1: Get assessment type IDs
        print("Step 1: Getting assessment type IDs...")
        result = await session.execute(text("SELECT id, code FROM assessment_types"))
        type_rows = result.fetchall()
        type_ids = {row[1]: row[0] for row in type_rows}

        tbm_type_id = type_ids.get('tbm')
        finops_type_id = type_ids.get('finops')

        if not tbm_type_id or not finops_type_id:
            print("ERROR: TBM and/or FinOps assessment types not found!")
            print(f"  Found types: {type_ids}")
            print("  Please run add_multi_assessment_support migration first.")
            return

        print(f"  TBM type ID: {tbm_type_id}, FinOps type ID: {finops_type_id}")

        # Step 2: Create or get TBM assessment template
        print("Step 2: Creating TBM assessment template...")
        result = await session.execute(
            text("SELECT id FROM assessment_templates WHERE assessment_type_id = :type_id AND is_active = TRUE ORDER BY id LIMIT 1"),
            {"type_id": tbm_type_id}
        )
        tbm_template_id = result.scalar_one_or_none()

        if not tbm_template_id:
            await session.execute(text("""
                INSERT INTO assessment_templates (name, version, description, is_active, assessment_type_id)
                VALUES ('TBM Maturity Assessment', '1.0', 'Technology Business Management maturity assessment', TRUE, :type_id)
            """), {"type_id": tbm_type_id})
            result = await session.execute(
                text("SELECT id FROM assessment_templates WHERE assessment_type_id = :type_id AND is_active = TRUE ORDER BY id LIMIT 1"),
                {"type_id": tbm_type_id}
            )
            tbm_template_id = result.scalar_one_or_none()
            print(f"  Created TBM template with ID: {tbm_template_id}")
        else:
            print(f"  Using existing TBM template with ID: {tbm_template_id}")

        # Step 3: Create or get FinOps assessment template
        print("Step 3: Creating FinOps assessment template...")
        result = await session.execute(
            text("SELECT id FROM assessment_templates WHERE assessment_type_id = :type_id AND is_active = TRUE ORDER BY id LIMIT 1"),
            {"type_id": finops_type_id}
        )
        finops_template_id = result.scalar_one_or_none()

        if not finops_template_id:
            await session.execute(text("""
                INSERT INTO assessment_templates (name, version, description, is_active, assessment_type_id)
                VALUES ('FinOps Maturity Assessment', '1.0', 'Cloud FinOps maturity assessment', TRUE, :type_id)
            """), {"type_id": finops_type_id})
            result = await session.execute(
                text("SELECT id FROM assessment_templates WHERE assessment_type_id = :type_id AND is_active = TRUE ORDER BY id LIMIT 1"),
                {"type_id": finops_type_id}
            )
            finops_template_id = result.scalar_one_or_none()
            print(f"  Created FinOps template with ID: {finops_template_id}")
        else:
            print(f"  Using existing FinOps template with ID: {finops_template_id}")

        # Step 4: Insert TBM dimensions
        print("Step 4: Inserting TBM dimensions...")
        tbm_dimension_ids = {}
        for dim in TBM_DIMENSIONS:
            # Check if dimension already exists for this template
            result = await session.execute(
                text("SELECT id FROM assessment_dimensions WHERE template_id = :template_id AND name = :name"),
                {"template_id": tbm_template_id, "name": dim["name"]}
            )
            existing_id = result.scalar_one_or_none()

            if existing_id:
                tbm_dimension_ids[dim["name"]] = existing_id
                print(f"    Using existing dimension: {dim['name']} (ID: {existing_id})")
            else:
                await session.execute(text("""
                    INSERT INTO assessment_dimensions (template_id, name, description, display_order, weight)
                    VALUES (:template_id, :name, :description, :display_order, 1.0)
                """), {"template_id": tbm_template_id, **dim})
                result = await session.execute(
                    text("SELECT id FROM assessment_dimensions WHERE template_id = :template_id AND name = :name"),
                    {"template_id": tbm_template_id, "name": dim["name"]}
                )
                dim_id = result.scalar_one()
                tbm_dimension_ids[dim["name"]] = dim_id
                print(f"    Created dimension: {dim['name']} (ID: {dim_id})")

        # Step 5: Insert FinOps dimensions
        print("Step 5: Inserting FinOps dimensions...")
        finops_dimension_ids = {}
        for dim in FINOPS_DIMENSIONS:
            result = await session.execute(
                text("SELECT id FROM assessment_dimensions WHERE template_id = :template_id AND name = :name"),
                {"template_id": finops_template_id, "name": dim["name"]}
            )
            existing_id = result.scalar_one_or_none()

            if existing_id:
                finops_dimension_ids[dim["name"]] = existing_id
                print(f"    Using existing dimension: {dim['name']} (ID: {existing_id})")
            else:
                await session.execute(text("""
                    INSERT INTO assessment_dimensions (template_id, name, description, display_order, weight)
                    VALUES (:template_id, :name, :description, :display_order, 1.0)
                """), {"template_id": finops_template_id, **dim})
                result = await session.execute(
                    text("SELECT id FROM assessment_dimensions WHERE template_id = :template_id AND name = :name"),
                    {"template_id": finops_template_id, "name": dim["name"]}
                )
                dim_id = result.scalar_one()
                finops_dimension_ids[dim["name"]] = dim_id
                print(f"    Created dimension: {dim['name']} (ID: {dim_id})")

        # Step 6: Insert TBM use cases
        print("Step 6: Inserting TBM use cases...")
        tbm_use_case_ids = {}
        for uc in TBM_USE_CASES:
            result = await session.execute(
                text("SELECT id FROM use_cases WHERE name = :name AND solution_area = 'TBM'"),
                {"name": uc["name"]}
            )
            existing_id = result.scalar_one_or_none()

            if existing_id:
                tbm_use_case_ids[uc["name"]] = existing_id
                print(f"    Using existing use case: {uc['name']} (ID: {existing_id})")
            else:
                await session.execute(text("""
                    INSERT INTO use_cases (name, description, solution_area, category, display_order, is_active)
                    VALUES (:name, :description, 'TBM', :category, :display_order, TRUE)
                """), uc)
                result = await session.execute(
                    text("SELECT id FROM use_cases WHERE name = :name AND solution_area = 'TBM'"),
                    {"name": uc["name"]}
                )
                uc_id = result.scalar_one()
                tbm_use_case_ids[uc["name"]] = uc_id
                print(f"    Created use case: {uc['name']} (ID: {uc_id})")

        # Step 7: Insert FinOps use cases
        print("Step 7: Inserting FinOps use cases...")
        finops_use_case_ids = {}
        for uc in FINOPS_USE_CASES:
            result = await session.execute(
                text("SELECT id FROM use_cases WHERE name = :name AND solution_area = 'FinOps'"),
                {"name": uc["name"]}
            )
            existing_id = result.scalar_one_or_none()

            if existing_id:
                finops_use_case_ids[uc["name"]] = existing_id
                print(f"    Using existing use case: {uc['name']} (ID: {existing_id})")
            else:
                await session.execute(text("""
                    INSERT INTO use_cases (name, description, solution_area, category, display_order, is_active)
                    VALUES (:name, :description, 'FinOps', :category, :display_order, TRUE)
                """), uc)
                result = await session.execute(
                    text("SELECT id FROM use_cases WHERE name = :name AND solution_area = 'FinOps'"),
                    {"name": uc["name"]}
                )
                uc_id = result.scalar_one()
                finops_use_case_ids[uc["name"]] = uc_id
                print(f"    Created use case: {uc['name']} (ID: {uc_id})")

        # Step 8: Insert Apptio A1 solutions
        print("Step 8: Inserting Apptio A1 solutions...")
        apptio_solution_ids = {}
        for sol in APPTIO_A1_SOLUTIONS:
            result = await session.execute(
                text("SELECT id FROM tp_solutions WHERE name = :name"),
                {"name": sol["name"]}
            )
            existing_id = result.scalar_one_or_none()

            if existing_id:
                apptio_solution_ids[sol["name"]] = existing_id
                print(f"    Using existing solution: {sol['name']} (ID: {existing_id})")
            else:
                await session.execute(text("""
                    INSERT INTO tp_solutions (name, version, category, description, is_active)
                    VALUES (:name, :version, 'core_solutions', :description, TRUE)
                """), sol)
                result = await session.execute(
                    text("SELECT id FROM tp_solutions WHERE name = :name"),
                    {"name": sol["name"]}
                )
                sol_id = result.scalar_one()
                apptio_solution_ids[sol["name"]] = sol_id
                print(f"    Created solution: {sol['name']} (ID: {sol_id})")

        # Step 9: Insert Cloudability solutions
        print("Step 9: Inserting Cloudability solutions...")
        cloudability_solution_ids = {}
        for sol in CLOUDABILITY_SOLUTIONS:
            result = await session.execute(
                text("SELECT id FROM tp_solutions WHERE name = :name"),
                {"name": sol["name"]}
            )
            existing_id = result.scalar_one_or_none()

            if existing_id:
                cloudability_solution_ids[sol["name"]] = existing_id
                print(f"    Using existing solution: {sol['name']} (ID: {existing_id})")
            else:
                await session.execute(text("""
                    INSERT INTO tp_solutions (name, version, category, description, is_active)
                    VALUES (:name, :version, 'core_solutions', :description, TRUE)
                """), sol)
                result = await session.execute(
                    text("SELECT id FROM tp_solutions WHERE name = :name"),
                    {"name": sol["name"]}
                )
                sol_id = result.scalar_one()
                cloudability_solution_ids[sol["name"]] = sol_id
                print(f"    Created solution: {sol['name']} (ID: {sol_id})")

        # Step 10: Create TBM dimension-use case mappings
        print("Step 10: Creating TBM dimension-use case mappings...")
        mapping_count = 0
        for dim_name, uc_names in TBM_DIMENSION_USE_CASE_MAPPINGS.items():
            dim_id = tbm_dimension_ids.get(dim_name)
            if not dim_id:
                print(f"    WARNING: Dimension '{dim_name}' not found, skipping")
                continue

            for uc_name in uc_names:
                uc_id = tbm_use_case_ids.get(uc_name)
                if not uc_id:
                    print(f"    WARNING: Use case '{uc_name}' not found, skipping")
                    continue

                # Check if mapping exists
                result = await session.execute(text("""
                    SELECT id FROM dimension_use_case_mappings
                    WHERE dimension_id = :dim_id AND use_case_id = :uc_id AND assessment_type_id = :type_id
                """), {"dim_id": dim_id, "uc_id": uc_id, "type_id": tbm_type_id})
                existing_id = result.scalar_one_or_none()

                if not existing_id:
                    await session.execute(text("""
                        INSERT INTO dimension_use_case_mappings
                        (dimension_id, use_case_id, assessment_type_id, impact_weight, threshold_score, priority)
                        VALUES (:dim_id, :uc_id, :type_id, 0.5, 3.0, :priority)
                    """), {"dim_id": dim_id, "uc_id": uc_id, "type_id": tbm_type_id, "priority": mapping_count})
                    mapping_count += 1

        print(f"    Created {mapping_count} TBM dimension-use case mappings")

        # Step 11: Create FinOps dimension-use case mappings
        print("Step 11: Creating FinOps dimension-use case mappings...")
        mapping_count = 0
        for dim_name, uc_names in FINOPS_DIMENSION_USE_CASE_MAPPINGS.items():
            dim_id = finops_dimension_ids.get(dim_name)
            if not dim_id:
                print(f"    WARNING: Dimension '{dim_name}' not found, skipping")
                continue

            for uc_name in uc_names:
                uc_id = finops_use_case_ids.get(uc_name)
                if not uc_id:
                    print(f"    WARNING: Use case '{uc_name}' not found, skipping")
                    continue

                result = await session.execute(text("""
                    SELECT id FROM dimension_use_case_mappings
                    WHERE dimension_id = :dim_id AND use_case_id = :uc_id AND assessment_type_id = :type_id
                """), {"dim_id": dim_id, "uc_id": uc_id, "type_id": finops_type_id})
                existing_id = result.scalar_one_or_none()

                if not existing_id:
                    await session.execute(text("""
                        INSERT INTO dimension_use_case_mappings
                        (dimension_id, use_case_id, assessment_type_id, impact_weight, threshold_score, priority)
                        VALUES (:dim_id, :uc_id, :type_id, 0.5, 3.0, :priority)
                    """), {"dim_id": dim_id, "uc_id": uc_id, "type_id": finops_type_id, "priority": mapping_count})
                    mapping_count += 1

        print(f"    Created {mapping_count} FinOps dimension-use case mappings")

        # Step 12: Create TBM use case-solution mappings
        print("Step 12: Creating TBM use case-solution mappings...")
        mapping_count = 0
        for uc_name, sol_names in TBM_USE_CASE_SOLUTION_MAPPINGS.items():
            uc_id = tbm_use_case_ids.get(uc_name)
            if not uc_id:
                print(f"    WARNING: Use case '{uc_name}' not found, skipping")
                continue

            for sol_name in sol_names:
                sol_id = apptio_solution_ids.get(sol_name)
                if not sol_id:
                    print(f"    WARNING: Solution '{sol_name}' not found, skipping")
                    continue

                result = await session.execute(text("""
                    SELECT id FROM use_case_tp_solution_mappings
                    WHERE use_case_id = :uc_id AND tp_solution_id = :sol_id
                """), {"uc_id": uc_id, "sol_id": sol_id})
                existing_id = result.scalar_one_or_none()

                if not existing_id:
                    await session.execute(text("""
                        INSERT INTO use_case_tp_solution_mappings
                        (use_case_id, tp_solution_id, is_required, is_primary, priority)
                        VALUES (:uc_id, :sol_id, TRUE, TRUE, :priority)
                    """), {"uc_id": uc_id, "sol_id": sol_id, "priority": mapping_count})
                    mapping_count += 1

        print(f"    Created {mapping_count} TBM use case-solution mappings")

        # Step 13: Create FinOps use case-solution mappings
        print("Step 13: Creating FinOps use case-solution mappings...")
        mapping_count = 0
        for uc_name, sol_names in FINOPS_USE_CASE_SOLUTION_MAPPINGS.items():
            uc_id = finops_use_case_ids.get(uc_name)
            if not uc_id:
                print(f"    WARNING: Use case '{uc_name}' not found, skipping")
                continue

            for sol_name in sol_names:
                sol_id = cloudability_solution_ids.get(sol_name)
                if not sol_id:
                    print(f"    WARNING: Solution '{sol_name}' not found, skipping")
                    continue

                result = await session.execute(text("""
                    SELECT id FROM use_case_tp_solution_mappings
                    WHERE use_case_id = :uc_id AND tp_solution_id = :sol_id
                """), {"uc_id": uc_id, "sol_id": sol_id})
                existing_id = result.scalar_one_or_none()

                if not existing_id:
                    await session.execute(text("""
                        INSERT INTO use_case_tp_solution_mappings
                        (use_case_id, tp_solution_id, is_required, is_primary, priority)
                        VALUES (:uc_id, :sol_id, TRUE, TRUE, :priority)
                    """), {"uc_id": uc_id, "sol_id": sol_id, "priority": mapping_count})
                    mapping_count += 1

        print(f"    Created {mapping_count} FinOps use case-solution mappings")

        await session.commit()

    print("\nMigration completed successfully!")
    print("Summary:")
    print(f"  - TBM dimensions: {len(TBM_DIMENSIONS)}")
    print(f"  - FinOps dimensions: {len(FINOPS_DIMENSIONS)}")
    print(f"  - TBM use cases: {len(TBM_USE_CASES)}")
    print(f"  - FinOps use cases: {len(FINOPS_USE_CASES)}")
    print(f"  - Apptio A1 solutions: {len(APPTIO_A1_SOLUTIONS)}")
    print(f"  - Cloudability solutions: {len(CLOUDABILITY_SOLUTIONS)}")


async def rollback_migration():
    """Rollback the TBM/FinOps framework migration."""
    print("Rolling back TBM/FinOps framework migration...")

    async with async_session() as session:
        # Get type IDs
        result = await session.execute(text("SELECT id, code FROM assessment_types"))
        type_rows = result.fetchall()
        type_ids = {row[1]: row[0] for row in type_rows}

        tbm_type_id = type_ids.get('tbm')
        finops_type_id = type_ids.get('finops')

        # Delete TBM dimension-use case mappings
        if tbm_type_id:
            await session.execute(text("""
                DELETE FROM dimension_use_case_mappings WHERE assessment_type_id = :type_id
            """), {"type_id": tbm_type_id})
            print("  Deleted TBM dimension-use case mappings")

        # Delete FinOps dimension-use case mappings
        if finops_type_id:
            await session.execute(text("""
                DELETE FROM dimension_use_case_mappings WHERE assessment_type_id = :type_id
            """), {"type_id": finops_type_id})
            print("  Deleted FinOps dimension-use case mappings")

        # Delete TBM use case-solution mappings (via use_cases with solution_area = 'TBM')
        await session.execute(text("""
            DELETE FROM use_case_tp_solution_mappings
            WHERE use_case_id IN (SELECT id FROM use_cases WHERE solution_area = 'TBM')
        """))
        print("  Deleted TBM use case-solution mappings")

        # Delete FinOps use case-solution mappings
        await session.execute(text("""
            DELETE FROM use_case_tp_solution_mappings
            WHERE use_case_id IN (SELECT id FROM use_cases WHERE solution_area = 'FinOps')
        """))
        print("  Deleted FinOps use case-solution mappings")

        # Delete TBM use cases
        await session.execute(text("DELETE FROM use_cases WHERE solution_area = 'TBM'"))
        print("  Deleted TBM use cases")

        # Delete FinOps use cases
        await session.execute(text("DELETE FROM use_cases WHERE solution_area = 'FinOps'"))
        print("  Deleted FinOps use cases")

        # Delete Apptio A1 solutions
        apptio_names = [s["name"] for s in APPTIO_A1_SOLUTIONS]
        await session.execute(text("""
            DELETE FROM tp_solutions WHERE name = ANY(:names)
        """), {"names": apptio_names})
        print("  Deleted Apptio A1 solutions")

        # Delete Cloudability solutions
        cloudability_names = [s["name"] for s in CLOUDABILITY_SOLUTIONS]
        await session.execute(text("""
            DELETE FROM tp_solutions WHERE name = ANY(:names)
        """), {"names": cloudability_names})
        print("  Deleted Cloudability solutions")

        # Get TBM template ID and delete dimensions
        if tbm_type_id:
            result = await session.execute(
                text("SELECT id FROM assessment_templates WHERE assessment_type_id = :type_id"),
                {"type_id": tbm_type_id}
            )
            tbm_template_id = result.scalar_one_or_none()
            if tbm_template_id:
                await session.execute(text("""
                    DELETE FROM assessment_dimensions WHERE template_id = :template_id
                """), {"template_id": tbm_template_id})
                print("  Deleted TBM dimensions")

        # Get FinOps template ID and delete dimensions
        if finops_type_id:
            result = await session.execute(
                text("SELECT id FROM assessment_templates WHERE assessment_type_id = :type_id"),
                {"type_id": finops_type_id}
            )
            finops_template_id = result.scalar_one_or_none()
            if finops_template_id:
                await session.execute(text("""
                    DELETE FROM assessment_dimensions WHERE template_id = :template_id
                """), {"template_id": finops_template_id})
                print("  Deleted FinOps dimensions")

        # Delete templates (optional - keep if you want to preserve template structure)
        # await session.execute(text("DELETE FROM assessment_templates WHERE assessment_type_id IN (:tbm, :finops)"),
        #                      {"tbm": tbm_type_id, "finops": finops_type_id})

        await session.commit()

    print("Rollback completed!")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        asyncio.run(rollback_migration())
    else:
        asyncio.run(run_migration())
