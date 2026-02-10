"""
Migration: Populate SPM score descriptions for all 34 assessment questions

This migration adds tailored score descriptions (5 levels each) to all 34 SPM Maturity
assessment questions across 6 dimensions. Descriptions are based on research across
Gartner ITScore for PPM, P3M3, PMI Portfolio Management Maturity, FinOps Foundation,
TBM Council, Acuity PPM, and Quantive Strategy Management frameworks.
"""

import asyncio
import json
from sqlalchemy import text
from app.core.database import engine


# Score descriptions keyed by question ID
SPM_SCORE_DESCRIPTIONS = {
    # === Dimension 1: Strategic Planning ===

    # Q1.1 (ID 70) - [Knowledge] Senior leaders shared understanding
    70: {
        "1": "Senior leaders lack a shared view of strategic priorities. Strategy exists informally in individual leaders' heads, if at all. No common vocabulary for strategic objectives. Different executives cite different priorities when asked.",
        "2": "A strategic plan document exists and has been shared with senior leaders. Some common understanding of top priorities, but interpretation varies significantly. Strategy is discussed at annual planning events but not reinforced throughout the year.",
        "3": "Senior leaders can consistently articulate the same 3-5 strategic priorities. Strategy is documented with clear objectives, outcomes, and timeframes. Regular strategy reviews ensure alignment stays current. Leaders reference strategic priorities when justifying investment decisions.",
        "4": "Deep shared understanding of strategic priorities, interdependencies, and trade-offs. Leaders understand not just what the priorities are but why and how they connect to market dynamics. Strategy is a living framework that leaders actively use, not just reference. Executives can explain how their portfolio contributes to enterprise outcomes.",
        "5": "Enterprise-wide strategic literacy \u2014 every level understands how their work connects to strategic outcomes. Leaders proactively identify when market shifts require strategic pivots. The organization is recognized externally for strategic clarity and alignment. Strategic understanding extends to partners, suppliers, and ecosystem participants."
    },

    # Q1.2 (ID 71) - [Process] Strategic planning process
    71: {
        "1": "No formal strategic planning process. Strategy emerges reactively from budget cycles or crises. Planning is ad hoc, driven by individual leaders. No connection between strategy formulation and execution.",
        "2": "Annual strategic planning cycle exists with a defined timeline. Planning follows a basic template (mission, vision, goals). The process is primarily top-down with limited cross-functional input. Output is a static document reviewed once per year.",
        "3": "Strategic planning is a well-defined, repeatable process with clear inputs, milestones, and outputs. Cross-functional participation ensures diverse perspectives. Strategy is cascaded into portfolio-level objectives. Planning cycle includes mid-year reviews and adjustments. Environmental scanning and competitive analysis are standard inputs.",
        "4": "Continuous strategic planning with quarterly recalibration based on performance data and market shifts. Scenario planning and what-if analysis are standard practice. Strategy formulation is tightly integrated with portfolio management, financial planning, and execution. Feedback loops from execution inform strategy refinement.",
        "5": "Adaptive, real-time strategic planning that responds dynamically to change. Strategy and execution operate as a continuous loop rather than separate activities. The planning process leverages predictive analytics and AI to anticipate shifts. The organization's planning process is a competitive advantage and industry benchmark."
    },

    # Q1.3 (ID 72) - [Adoption] Leaders use strategic priorities
    72: {
        "1": "Investment decisions are not connected to strategic priorities. Projects are funded based on political influence, seniority, or historical precedent. Strategy and portfolio management operate independently.",
        "2": "Strategic priorities are referenced in business cases but don't drive decisions. Some leaders attempt to align investments with strategy, but it's inconsistent. Strategic alignment is a checkbox exercise rather than a decision filter.",
        "3": "Strategic alignment is a required criterion in investment decisions. Portfolio reviews explicitly evaluate alignment to strategic priorities. Leaders actively use strategy to say \"no\" to misaligned requests. Budget allocation reflects strategic priority weighting.",
        "4": "Strategic priorities are the primary filter for all investment decisions. Leaders proactively reallocate resources when strategic priorities shift. Trade-off decisions are made explicitly and transparently using strategic alignment data. Portfolio composition visibly reflects stated strategic priorities.",
        "5": "Strategy-driven investment is embedded in organizational culture. All levels of the organization can explain how their work connects to strategic outcomes. External partners and vendors align their proposals to the organization's strategic framework. The connection between strategy and investment is seamless and self-reinforcing."
    },

    # Q1.4 (ID 73) - [Metrics] Strategic metrics
    73: {
        "1": "No strategic metrics defined. Success is anecdotal or based on financial results alone. No measurement of whether strategic initiatives are delivering intended outcomes.",
        "2": "Basic KPIs defined for strategic objectives (e.g., revenue targets, cost reduction). Metrics are primarily lagging financial indicators. Reporting is periodic (quarterly or annual) and backward-looking. Limited connection between initiative-level metrics and strategic outcomes.",
        "3": "Balanced set of leading and lagging indicators for each strategic priority. OKRs or equivalent framework cascades metrics from strategy to portfolio to initiative level. Regular metric reviews with documented insights and action items. Metrics include non-financial measures (customer, operational, innovation).",
        "4": "Strategic metrics provide predictive insight into future outcomes, not just historical performance. Automated dashboards show real-time progress toward strategic targets. Metric analysis identifies root causes of underperformance and triggers corrective action. Metrics are continuously refined based on their predictive accuracy.",
        "5": "AI-powered strategic analytics predict outcome trajectories and recommend interventions. Metrics dynamically adjust as strategic priorities evolve. External benchmarking compares strategic performance to industry peers. The metrics framework itself is a competitive differentiator, enabling faster strategic pivots."
    },

    # Q1.5 (ID 74) - [Automation] Strategic planning automation
    74: {
        "1": "Strategic planning is entirely manual. Documents are created in word processors and slide decks. No tooling for strategy tracking or alignment measurement. Reporting requires manual data compilation from multiple sources.",
        "2": "Spreadsheets or basic presentation tools used for strategic planning. Some reporting is templated but data collection is manual. Strategy documents stored in shared drives but not linked to execution data.",
        "3": "Dedicated strategy management platform (e.g., Cascade, Quantive, Planview) used for strategic planning and tracking. Automated dashboards pull data from portfolio and financial systems. Strategic alignment scoring is automated in the portfolio management tool. Automated alerts when strategic metrics deviate from targets.",
        "4": "Integrated strategy-to-execution platform connects planning, portfolio management, and delivery. Automated scenario modeling evaluates strategic alternatives. Real-time data flows from execution systems into strategy dashboards without manual intervention. Automated reporting delivers strategic insights to stakeholders on cadence.",
        "5": "AI-driven strategy tools analyze market data, competitive intelligence, and internal performance to recommend strategic adjustments. Automated strategy simulations model the impact of external disruptions. The planning-to-execution pipeline is fully automated with no manual handoffs. Predictive analytics continuously optimize strategic resource allocation."
    },

    # Q1.6 (ID 75) - [Skills & Capacity] Strategic planning skills
    75: {
        "1": "No formal strategic planning skills. Leaders rely on intuition and experience. No investment in strategic planning training or development. Strategic planning is seen as a CEO/CFO activity, not a distributed capability.",
        "2": "Some leaders have attended strategic planning training or workshops. Basic strategic planning concepts (SWOT, PESTLE) are understood by senior staff. Strategic planning skills are concentrated in a few individuals.",
        "3": "Strategic planning competency is developed through formal training programs. Leaders at multiple levels can facilitate strategic planning sessions. Adequate capacity to maintain the annual planning cycle plus mid-year reviews. External strategic advisors supplement internal skills where needed.",
        "4": "Advanced strategic skills including scenario planning, systems thinking, and design thinking are cultivated. Leaders can translate strategy into actionable portfolio decisions. Strategic facilitation skills are widespread, enabling distributed planning. Capacity exists for continuous strategic adaptation, not just periodic planning.",
        "5": "World-class strategic planning capability recognized externally. The organization develops and publishes strategic planning methodologies. Succession planning ensures continuity of strategic leadership. Strategic skills are a criterion for leadership advancement at all levels."
    },

    # === Dimension 2: Portfolio Management ===

    # Q2.1 (ID 76) - [Knowledge] Portfolio objectives and trade-offs
    76: {
        "1": "Executives see the portfolio as a list of projects, not an integrated investment vehicle. No shared understanding of portfolio objectives, balance, or trade-offs. Each executive optimizes their own projects independently.",
        "2": "The concept of a managed portfolio is understood by IT and PMO leadership. Some awareness of portfolio-level trade-offs (cost vs. speed, run vs. grow). Portfolio reports are produced but not widely consumed or understood by business executives.",
        "3": "Executives understand portfolio objectives including strategic alignment, risk balance, and resource optimization. Trade-offs between competing investments are discussed explicitly with supporting data. Portfolio health concepts (balance, pipeline, capacity) are commonly understood. All executives share a common portfolio vocabulary.",
        "4": "Deep understanding of portfolio optimization including efficient frontiers, risk-adjusted returns, and opportunity costs. Executives understand how individual investment changes ripple across the portfolio. Cross-portfolio dependencies and synergies are actively managed. Executives make informed trade-offs between short-term delivery and long-term strategic positioning.",
        "5": "Portfolio thinking is embedded in enterprise culture. Every leader understands their role in portfolio optimization. The organization advances portfolio management thought leadership. Partners and vendors understand and align to the organization's portfolio philosophy."
    },

    # Q2.2 (ID 77) - [Process] Portfolio management processes
    77: {
        "1": "No formal portfolio management process. Project selection is ad hoc, based on individual proposals rather than portfolio-level analysis. No stage-gate reviews or portfolio rebalancing.",
        "2": "Basic portfolio processes exist: project inventory, periodic status reviews, annual planning intake. Portfolio reviews happen but focus on individual project status rather than portfolio-level optimization. Stage gates are defined but inconsistently applied.",
        "3": "Repeatable portfolio management process covers selection, prioritization, balancing, and monitoring. Regular portfolio review cadence (monthly or quarterly) with defined agenda and decision authority. Stage-gate reviews have clear criteria and the authority to stop underperforming investments. Portfolio rebalancing occurs when strategic priorities shift.",
        "4": "Portfolio processes are continuously improved based on outcome data. What-if analysis and scenario modeling are standard parts of portfolio reviews. Portfolio processes integrate seamlessly with strategic planning, financial management, and delivery. Feedback loops from completed investments improve selection criteria.",
        "5": "Adaptive portfolio processes respond dynamically to change. Real-time portfolio optimization continuously adjusts to new information. Portfolio management is a strategic capability, not an administrative function. Processes scale effortlessly across organizational growth and complexity."
    },

    # Q2.3 (ID 78) - [Adoption] Portfolio views in decision-making
    78: {
        "1": "No portfolio views exist, or they exist but are not used. Executives make investment decisions based on individual proposals without portfolio context. Project lists exist but are not managed as a portfolio.",
        "2": "Portfolio reports are produced for leadership meetings. Some executives reference portfolio data when making decisions. Adoption varies significantly \u2014 PMO uses portfolio views, but business executives often bypass them.",
        "3": "Portfolio views are a standard part of executive decision-making meetings. Investment decisions require portfolio-level impact analysis. Executives actively use portfolio dashboards to monitor health, balance, and progress. The portfolio is the single source of truth for enterprise investment status.",
        "4": "Executives proactively engage with portfolio views between formal reviews. Portfolio data drives real-time resource allocation and prioritization changes. Multiple portfolio views (strategic, financial, risk, capacity) are used by different stakeholders. Executives challenge the data and demand continuous improvement in portfolio visibility.",
        "5": "Portfolio management is embedded in organizational DNA. All levels of management use portfolio views appropriate to their scope. External stakeholders (board members, partners) engage with portfolio views. Portfolio visibility is a competitive advantage cited by the organization."
    },

    # Q2.4 (ID 79) - [Metrics] Portfolio metrics
    79: {
        "1": "No portfolio-level metrics. Reporting is limited to individual project status (red/amber/green). No aggregation of metrics across the portfolio. Executives cannot answer \"How is our portfolio performing?\"",
        "2": "Basic portfolio metrics: total spend vs. budget, number of projects on track, resource utilization. Metrics are retrospective and reported periodically. Limited ability to compare performance across portfolio segments.",
        "3": "Comprehensive portfolio metrics including strategic alignment distribution, risk exposure, investment mix (run/grow/transform), and pipeline health. Leading indicators (resource contention, scope creep trends, benefit forecast variance) supplement lagging indicators. Metrics are reviewed at every portfolio governance meeting with documented actions.",
        "4": "Portfolio metrics enable predictive decision-making \u2014 forecasting which investments are likely to underperform. Metrics connect portfolio inputs (investment, resources) to strategic outcomes. Automated variance detection alerts executives to emerging issues before they escalate. Metrics across portfolio segments are benchmarked against each other and against industry norms.",
        "5": "AI-powered portfolio analytics identify optimization opportunities and recommend rebalancing actions. Metrics dynamically adjust as the portfolio evolves. Real-time portfolio health monitoring enables continuous optimization. The organization's portfolio metrics framework is an industry reference."
    },

    # Q2.5 (ID 80) - [Automation] Portfolio management automation
    80: {
        "1": "Portfolio tracking is done manually in spreadsheets or slide decks. Project data is collected via email or meetings. No centralized portfolio management tool. Reporting requires significant manual effort to compile.",
        "2": "Basic PPM tool in place for project tracking and status reporting. Some portfolio views are generated from the tool but require manual curation. Data entry is manual and often out of date. Reporting is semi-automated but still requires manual assembly.",
        "3": "Enterprise PPM platform (e.g., Planview, Clarity, ServiceNow SPM) used for portfolio management. Automated dashboards and reports deliver portfolio views on cadence. Workflow automation handles stage-gate approvals, notifications, and escalations. Data integrations feed financial and resource data into the portfolio tool automatically.",
        "4": "Advanced portfolio analytics including scenario modeling and what-if analysis are automated. Automated resource optimization recommends allocation changes. Portfolio tool integrates with delivery systems (Jira, Azure DevOps) for real-time execution data. Automated alerts detect portfolio health issues and trigger governance actions.",
        "5": "AI-driven portfolio optimization continuously rebalances the portfolio. Automated demand-to-delivery pipeline with no manual handoffs. Machine learning predicts project outcomes and recommends interventions. The portfolio platform is a fully integrated strategy-to-execution system."
    },

    # Q2.6 (ID 81) - [Skills & Capacity] Portfolio management skills
    81: {
        "1": "No dedicated portfolio management staff. Project managers focus on individual project delivery, not portfolio-level optimization. No portfolio management training or development.",
        "2": "PMO leader or portfolio coordinator role established. Basic portfolio management training available. Portfolio skills are concentrated in 1-2 individuals. Capacity is limited \u2014 portfolio activities compete with operational demands.",
        "3": "Dedicated portfolio management team with defined roles (portfolio manager, analyst, governance coordinator). PfMP or equivalent certifications pursued. Adequate capacity to maintain regular portfolio governance cadence. Portfolio management is a recognized career path within the organization.",
        "4": "Advanced portfolio skills including optimization, scenario analysis, and strategic advisory. Portfolio team acts as strategic advisors to executives, not just process administrators. Cross-functional portfolio skills (finance, strategy, technology, risk) are represented. Capacity exists for proactive portfolio improvement, not just maintenance.",
        "5": "Industry-leading portfolio management capability. The organization contributes to portfolio management standards and thought leadership. Talent pipeline ensures continuity and growth of portfolio management skills. Portfolio management skills are a criterion for senior leadership positions."
    },

    # === Dimension 3: Financial Management ===

    # Q3.1 (ID 82) - [Knowledge] Funding models and financial structures
    82: {
        "1": "Executives have limited understanding of how technology investments are funded. Financial structures are opaque \u2014 leaders know their budget but not how it connects to enterprise financial models. No shared vocabulary for technology cost categories (run, grow, transform).",
        "2": "Executives understand basic budget structures and annual funding cycles. The concept of total cost of ownership is known but not consistently applied. Financial reporting provides spend data but limited cost transparency.",
        "3": "Executives understand funding models including CapEx/OpEx implications, chargeback/showback, and cost allocation methods. TBM taxonomy or equivalent cost model is understood by stakeholders. Leaders can explain the financial impact of portfolio decisions in business terms. Cross-functional financial literacy enables informed investment conversations.",
        "4": "Deep understanding of advanced financial concepts: unit economics, marginal cost analysis, and financial optimization. Executives understand how funding model design drives behavior (project vs. product funding, capacity-based allocation). Financial implications of strategic choices are quantified and understood across the leadership team.",
        "5": "Financial management knowledge is pervasive \u2014 all leaders understand cost drivers and financial levers. The organization innovates in financial model design. External partners understand and align to the organization's financial framework. Financial literacy is a core leadership competency at every level."
    },

    # Q3.2 (ID 83) - [Process] Financial planning and forecasting
    83: {
        "1": "Financial planning is limited to annual budgeting with no mid-year forecasting. Budget requests are compiled bottom-up with no portfolio-level optimization. Actuals are tracked but not reconciled to forecasts until year-end. No connection between financial planning and portfolio decisions.",
        "2": "Annual budget process is defined with standard templates and timelines. Quarterly or monthly variance reporting compares actuals to budget. Basic forecasting updates budget expectations mid-year. Financial planning is IT or finance-led with limited business partnership.",
        "3": "Financial planning integrates with portfolio management \u2014 investment decisions have clear financial impact analysis. Rolling forecasts replace or supplement static annual budgets. Cost allocation and chargeback processes are transparent and accepted. Financial reviews are a standard part of portfolio governance with defined cadence.",
        "4": "Continuous financial planning adapts to changing portfolio composition and strategic priorities. Scenario-based financial modeling evaluates alternatives before decisions are made. Financial forecasting leverages delivery data to predict final costs with increasing accuracy. Financial optimization identifies savings opportunities without compromising strategic outcomes.",
        "5": "AI-powered financial forecasting predicts costs and value delivery with high accuracy. Real-time financial monitoring enables dynamic reallocation. Financial planning is fully integrated with strategy, portfolio, and delivery processes. The organization's financial management practices are recognized as industry-leading."
    },

    # Q3.3 (ID 84) - [Adoption] Financial insights in decisions
    84: {
        "1": "Financial data is not used in portfolio decisions beyond initial budget approval. Executives approve projects based on qualitative business cases without rigorous financial analysis. No visibility into total portfolio financial health.",
        "2": "Financial reports are distributed to executives but engagement is inconsistent. Some leaders use financial data for their decisions; others rely on intuition. Financial analysis is available for major investments but not routine for smaller initiatives.",
        "3": "Financial insights are a required input for all portfolio decisions. Portfolio governance reviews include financial health analysis (burn rate, forecast accuracy, ROI projections). Executives actively use financial dashboards and ask probing questions about financial performance. Cost transparency drives accountability for financial outcomes.",
        "4": "Financial analysis is deeply integrated into executive decision-making. Total cost of ownership and full lifecycle economics inform investment selection. Executives proactively request financial scenario analysis before major decisions. Financial performance is a key factor in portfolio rebalancing decisions.",
        "5": "Financial discipline is embedded in organizational culture. Every investment owner manages financial performance as actively as delivery performance. Financial insights drive real-time portfolio optimization. External stakeholders cite the organization's financial management as a differentiator."
    },

    # Q3.4 (ID 85) - [Automation] Financial planning automation
    85: {
        "1": "Financial tracking is spreadsheet-based with manual data entry. Budget data is compiled manually from multiple sources. Financial reporting requires days or weeks to produce. No integration between financial systems and portfolio tools.",
        "2": "Basic financial tools (ERP modules or dedicated budgeting tools) are in place. Some reporting is automated but data collection remains manual. Financial data is imported into portfolio tools via manual exports/imports.",
        "3": "Financial management platform integrated with portfolio and delivery tools. Automated cost tracking flows from timesheets, procurement, and cloud billing into financial dashboards. Automated variance reporting and forecasting reduce manual effort. Chargeback/showback calculations are automated with transparent allocation models.",
        "4": "Advanced financial analytics including trend analysis, benchmarking, and optimization are automated. Automated scenario modeling evaluates financial impact of portfolio changes. Real-time financial data feeds enable continuous monitoring. Automated alerts detect financial anomalies and trigger reviews.",
        "5": "AI-powered financial optimization continuously identifies cost reduction and value maximization opportunities. Automated financial forecasting leverages machine learning for high accuracy. Financial processes are fully integrated across the strategy-to-delivery pipeline. The financial platform adapts dynamically to organizational changes."
    },

    # Q3.5 (ID 86) - [Skills & Capacity] Financial skills
    86: {
        "1": "No dedicated IT financial management staff. Financial analysis is performed by general finance without technology domain expertise. No TBM or FinOps skills in the organization.",
        "2": "IT finance analyst role established. Basic TBM/FinOps training provided to key staff. Financial management is a secondary responsibility for most involved. Limited capacity constrains the depth of financial analysis.",
        "3": "Dedicated IT financial management team or FinOps practice. TBM/FinOps certifications pursued by team members. Financial management skills are a defined competency for technology leadership. Adequate staff capacity to maintain regular financial processes and reporting.",
        "4": "Advanced financial analytics skills including cost modeling, optimization, and value engineering. FinOps team includes engineers, finance professionals, and business analysts. Cross-functional financial training is available for technology and business teams. Capacity supports proactive financial optimization, not just reporting.",
        "5": "Industry-leading FinOps/TBM practice. The organization contributes to TBM Council or FinOps Foundation standards. Financial management talent development is a strategic priority. The team drives innovation in technology financial practices."
    },

    # === Dimension 4: Demand Intake / Initiatives Prioritization ===

    # Q4.1 (ID 87) - [Knowledge] Demand intake criteria understanding
    87: {
        "1": "No shared understanding of how work enters the portfolio. The loudest voice or most senior sponsor wins approval. No common criteria for evaluating proposals. Multiple informal channels create confusion about how to request work.",
        "2": "The concept of a formal intake process is understood by PMO staff. Basic evaluation criteria exist (business case, cost, timeline) but aren't consistently applied. Key stakeholders understand the intake process but not all requestors do.",
        "3": "All stakeholders understand the intake and prioritization process. Evaluation criteria are standardized, published, and used consistently. The rationale for prioritization decisions is transparent and communicated. Common understanding of capacity constraints and their impact on prioritization.",
        "4": "Deep understanding of multi-criteria decision analysis and portfolio optimization. Stakeholders understand trade-offs between competing priorities. Knowledge of value-based prioritization frameworks (WSJF, ICE, RICE). Understanding of opportunity cost and portfolio balancing principles.",
        "5": "Demand management expertise is distributed across the organization. Real-time understanding of portfolio capacity and demand pipeline. All levels understand and support the prioritization methodology. The organization is a reference case for intake and prioritization practices."
    },

    # Q4.2 (ID 88) - [Process] Demand intake process
    88: {
        "1": "No formal intake process. Requests come via email, hallway conversations, or direct assignments. No consistent way to track or evaluate proposals. No prioritization framework \u2014 decisions are political.",
        "2": "Standard intake form or template exists. Basic approval workflow defined. Simple prioritization criteria (high/medium/low) applied. Requests are logged in a tracking system. Intake is periodic (e.g., annual planning cycle) rather than continuous.",
        "3": "Strategic, consistent, and visible intake process. Weighted scoring model used for objective assessment. Business cases required with standardized templates. Continuous intake with regular governance review cycles. Capacity analysis informs what can be approved. Low-value requests are filtered quickly to advance high-value work.",
        "4": "Multi-criteria optimization balances strategic alignment, risk, financial return, and capacity. Scenario analysis models alternative prioritization outcomes. Demand pipeline is managed proactively with forward-looking demand forecasting. Feedback loop from execution informs prioritization improvement.",
        "5": "AI-assisted demand scoring and recommendation. Real-time portfolio optimization continuously adjusts priorities. Self-service intake with automated routing and initial scoring. Demand management is fully integrated with strategic planning and financial management cycles."
    },

    # Q4.3 (ID 89) - [Adoption] Formal intake process adoption
    89: {
        "1": "No consistent intake process is followed. Each department or leader initiates work through their own channels. Bypass and shadow IT are common. No single source of truth for project requests.",
        "2": "IT or PMO uses a formal intake process. Some business units submit requests through the process, but many bypass it. Adoption varies significantly by department and leader.",
        "3": "All significant work requests go through the formal intake process. Governance body has cross-functional representation. The prioritized portfolio is the authoritative source for approved work. Bypass requests are rare and escalated through governance.",
        "4": "Business units proactively use the intake process and value its outcomes. Requestors track their submissions and understand the pipeline. Prioritization decisions are accepted because the process is trusted. Portfolio governance actively manages the demand pipeline.",
        "5": "Intake and prioritization are embedded in organizational culture. External partners and vendors participate in the demand process. The process is self-governing with minimal enforcement needed. Demand management is a competitive advantage."
    },

    # Q4.4 (ID 90) - [Metrics] Intake metrics
    90: {
        "1": "No metrics on demand or prioritization. No visibility into the backlog of requests or approval rates. No measurement of time from request to decision.",
        "2": "Basic intake metrics: number of requests submitted, approved, rejected. Simple backlog tracking. Cycle time from submission to decision is measured but not optimized.",
        "3": "Demand pipeline metrics: submission volume, approval rate, average cycle time, backlog age. Portfolio balance metrics: distribution across strategic themes, risk levels, investment types. Capacity utilization and demand-to-capacity ratio tracked.",
        "4": "Value realization tracking from intake through delivery. Prediction accuracy of business case estimates vs. actual outcomes. Prioritization quality metrics: were highly-scored projects more successful? Demand forecasting accuracy measured and improved.",
        "5": "Predictive demand analytics anticipate future intake volume and composition. Automated portfolio health monitoring triggers rebalancing. Industry benchmarking of intake efficiency and prioritization effectiveness. AI identifies patterns in which types of proposals deliver the most value."
    },

    # Q4.5 (ID 91) - [Automation] Demand intake automation
    91: {
        "1": "Requests via email or verbal communication. No tracking system. Manual compilation of request lists for review meetings.",
        "2": "Web form or shared document for intake submissions. Spreadsheet-based tracking and scoring. Manual notification to reviewers. Basic status tracking for requestors.",
        "3": "Dedicated intake portal with workflow automation. Automated scoring against predefined criteria. Automated notifications, routing, and escalation. Integrated with portfolio management tool for seamless flow from intake to execution.",
        "4": "Automated capacity analysis and feasibility checks during intake. Dynamic portfolio optimization recalculates priorities when inputs change. Automated business case validation and duplicate detection. Self-service dashboards for requestors to track pipeline status.",
        "5": "AI-powered demand scoring and recommendation engine. Automated demand forecasting based on historical patterns. Intelligent routing to appropriate review bodies. Fully integrated demand-to-delivery pipeline with no manual handoffs."
    },

    # Q4.6 (ID 92) - [Skills & Capacity] Demand evaluation skills
    92: {
        "1": "No dedicated intake or prioritization staff. Business cases are prepared by requestors with no standard skills. No analytical capability for portfolio-level prioritization.",
        "2": "PMO staff trained in basic intake and evaluation processes. Business analysts can prepare standardized business cases. Limited capacity \u2014 intake reviews happen infrequently due to staff constraints.",
        "3": "Dedicated portfolio governance team with prioritization expertise. Training available for business case preparation across the organization. Adequate capacity for regular governance reviews (monthly or bi-weekly). Analysts skilled in multi-criteria scoring and portfolio analysis.",
        "4": "Advanced analytical skills including financial modeling, risk analysis, and optimization. Portfolio team includes strategists, financial analysts, and domain experts. Capacity to support continuous intake and rapid decision-making. Training programs develop prioritization skills across leadership.",
        "5": "Demand management is a recognized organizational competency. Governance team is cross-functionally staffed and empowered. Capacity scales dynamically with demand volume. The organization develops and shares demand management best practices externally."
    },

    # === Dimension 5: Value Realization & Performance ===

    # Q5.1 (ID 93) - [Knowledge] Understanding value and performance
    93: {
        "1": "No understanding of benefits realization as a discipline. Projects end at delivery; no one tracks whether promised value was achieved. \"Value\" is assumed, not measured. No distinction between outputs (deliverables) and outcomes (business impact).",
        "2": "Concept of benefits realization is understood by PMO leadership. Business cases include expected benefits, but no one is accountable for tracking them. Basic understanding that value extends beyond on-time/on-budget delivery.",
        "3": "Benefits realization framework is understood across the organization. All stakeholders understand the difference between outputs, outcomes, and benefits. Clear methodology for identifying, quantifying, and tracking benefits. Value is understood as the net result of realized benefits less the cost of achieving them.",
        "4": "Advanced understanding of value management including option value, strategic value, and intangible benefits. Knowledge of how to measure and attribute value across complex, multi-project initiatives. Understanding of leading indicators that predict future value realization.",
        "5": "Value realization knowledge is embedded in organizational decision-making culture. All roles understand their contribution to value creation. The organization advances the industry's understanding of value management."
    },

    # Q5.2 (ID 94) - [Process] Value realization processes
    94: {
        "1": "No benefits tracking process. Projects are considered \"done\" at delivery with no post-implementation review. Business cases are never revisited. No feedback loop from outcomes to future investment decisions.",
        "2": "Post-implementation reviews occur for some projects. Benefits identified in business cases but tracking is inconsistent. Some retrospectives capture lessons learned. Benefit owners may be identified but not held accountable.",
        "3": "Formal benefits realization process from business case through post-delivery tracking. Benefit owners assigned and accountable. Regular benefits reviews assess whether promised value is being achieved. Variance analysis triggers corrective action when benefits fall short.",
        "4": "Benefits tracking integrated across the portfolio investment lifecycle. Continuous value monitoring with leading indicators. Governance bodies use optimization techniques to drive greater value to the portfolio. Lessons learned from value realization feed back into portfolio selection criteria.",
        "5": "Real-time value streaming with continuous measurement and optimization. Value realization is embedded in every phase of the investment lifecycle. Predictive value modeling identifies initiatives likely to under-deliver. Organizational rigor and process discipline proactively optimize portfolio value."
    },

    # Q5.3 (ID 95) - [Adoption] Leaders monitor value outcomes
    95: {
        "1": "No one tracks value realization. Project sponsors move on after delivery. No organizational expectation for benefits tracking.",
        "2": "PMO attempts to track benefits for major projects. Some sponsors engage in post-delivery reviews. Adoption is limited to flagship or executive-sponsored initiatives.",
        "3": "Benefits realization is mandatory for all significant investments. All project sponsors are accountable for defined benefits. Regular value reviews are part of the governance cadence. Benefits tracking data is visible to leadership.",
        "4": "Value realization culture permeates the organization. Teams proactively identify and track value beyond initial business case. Continuous improvement driven by value data. Value management is a factor in performance evaluations.",
        "5": "Value realization is part of organizational DNA. Every investment is expected to demonstrate measurable value. External stakeholders participate in value realization reviews. The organization is a recognized leader in benefits management."
    },

    # Q5.4 (ID 96) - [Metrics] Financial and non-financial value metrics
    96: {
        "1": "No value metrics beyond basic project delivery (on-time, on-budget). No post-delivery measurement. Success is declared at launch, not at value delivery.",
        "2": "Basic benefit metrics defined in business cases (cost savings, revenue impact). Some projects track benefits post-delivery. Metrics are primarily financial and self-reported. No portfolio-level value aggregation.",
        "3": "Comprehensive benefit metrics including financial, operational, customer, and strategic value. Portfolio-level value tracking aggregates individual investment outcomes. Actual vs. planned benefit variance tracked. Forecasting accuracy of business case estimates is measured.",
        "4": "Value metrics connected to strategic outcomes, not just project outputs. Leading indicators predict value delivery trajectory. Lessons learned feedback improves project selection. Value per dollar invested calculated and compared across portfolio segments.",
        "5": "Real-time value dashboards with predictive analytics. Automated value attribution across complex initiative dependencies. Industry benchmarking of value realization rates. AI identifies which investment characteristics predict highest value delivery."
    },

    # Q5.5 (ID 97) - [Automation] Value tracking automation
    97: {
        "1": "No tooling for value tracking. Benefits, if noted, are in business case documents that are filed and forgotten. Manual collection of any outcome data.",
        "2": "Spreadsheet-based benefits tracking. Manual data collection from operational systems. Benefits reviews rely on manually compiled reports.",
        "3": "Benefits realization module in PPM tool or dedicated benefits management platform. Automated data feeds from operational systems measure key benefit metrics. Automated dashboards show portfolio-level value realization. Workflow automation triggers benefit reviews at defined milestones.",
        "4": "Automated benefit variance alerting when actuals deviate from plan. Integration with financial systems for automated ROI calculation. Advanced analytics identify patterns in value realization across the portfolio. Automated linkage between strategic objectives and measurable outcomes.",
        "5": "AI-powered value prediction and optimization. Automated real-time value streaming dashboards. Machine learning identifies early warning signals for under-performing investments. Automated feedback loops adjust portfolio selection criteria based on realized value patterns."
    },

    # Q5.6 (ID 98) - [Skills & Capacity] Value management skills
    98: {
        "1": "No one skilled in benefits management or value realization. Project managers focus on delivery, not outcomes. No capacity allocated for post-delivery value tracking.",
        "2": "Some PMO staff trained in basic benefits management. Business analysts can quantify benefits for business cases. Limited capacity for ongoing value tracking.",
        "3": "Dedicated benefits management role or team. Training in value realization methods for project sponsors and portfolio managers. Adequate capacity for systematic benefits tracking across the portfolio. Benefit owners have the skills to identify, quantify, and track their benefits.",
        "4": "Advanced skills in value modeling, leading indicator development, and portfolio value optimization. Cross-functional value management team with financial, strategic, and operational expertise. Value management is a core competency for leadership roles.",
        "5": "Industry-leading value management capability. The organization develops and publishes best practices in value realization. Talent pipeline ensures continuity of value management skills. Value management skills are a criterion for all leadership positions."
    },

    # === Dimension 6: Organization ===

    # Q6.1 (ID 99) - [Knowledge] Enterprise SPM operating model
    99: {
        "1": "No shared understanding of organizational design for portfolio management. Roles and responsibilities are unclear. Teams do not understand how they relate to the broader organization structure. No common understanding of the SPM operating model.",
        "2": "PMO function is established and its role is understood within IT. Organizational structure for project delivery is documented. Some understanding of how teams should interact, but many gaps remain.",
        "3": "Enterprise-wide understanding of the operating model for portfolio management. All teams understand their role in the organizational structure. Clear understanding of escalation paths, decision rights, and accountability. Cross-functional organizational relationships are well-understood.",
        "4": "Deep understanding of organizational design principles (centers of excellence, shared services, matrix structures). Knowledge of how organizational structure enables or inhibits strategic execution. Organizational learning practices are well-established.",
        "5": "Organizational design expertise enables rapid restructuring to meet changing needs. The organization is a model for others in SPM organizational design. Knowledge of organizational dynamics is used to proactively address change resistance."
    },

    # Q6.2 (ID 100) - [Process] Organizational processes for SPM
    100: {
        "1": "No formal organizational processes for portfolio management work. Team structures are informal and fluid. Coordination happens through ad hoc meetings and personal relationships. No change management process.",
        "2": "Basic organizational processes defined (team formation, escalation, decision-making). PMO has defined operating procedures. Change management is reactive rather than proactive. Communication processes exist but are inconsistent.",
        "3": "Formal organizational processes for team formation, governance, communication, and change management. Regular cadence for organizational reviews and improvements. Standardized onboarding and offboarding processes for portfolio roles. Clear processes for cross-functional coordination and conflict resolution.",
        "4": "Organizational processes are continuously improved based on feedback and performance data. Agile organizational practices enable rapid team formation and dissolution. Change management is proactive and data-driven. Organizational health assessments conducted regularly.",
        "5": "Organizational processes are self-optimizing and adaptive. The organization restructures fluidly in response to strategic needs. Innovation in organizational design is continuous. The organization leads its industry in organizational effectiveness for SPM."
    },

    # Q6.3 (ID 101) - [Adoption] SPM roles and responsibilities adoption
    101: {
        "1": "No consistent organizational model adopted. Each department operates with its own structure and rules. Collaboration is dependent on individual relationships. SPM roles are undefined or unknown.",
        "2": "PMO model adopted within IT or one business unit. Some standardization of team structures. Organizational practices are adopted unevenly across the enterprise.",
        "3": "Enterprise-wide organizational model for portfolio management adopted. All business units participate in the defined organizational structure. Cross-functional governance bodies are operational and attended consistently. SPM roles and responsibilities are documented and followed.",
        "4": "Organizational practices are deeply embedded and actively maintained. Teams self-organize within defined guardrails. Organizational excellence is recognized and rewarded. Continuous improvement of organizational effectiveness is a shared responsibility.",
        "5": "Organizational model is adaptable and self-reinforcing. External partners and vendors integrate seamlessly into organizational structures. The organization serves as a model for industry peers. SPM roles are aspirational positions within the organization."
    },

    # Q6.4 (ID 102) - [Governance] Organizational governance structures
    102: {
        "1": "Little or no formal governance. Decisions are made ad hoc without formal authority structure. No portfolio governance body. No defined decision rights, escalation paths, or approval authority. Governance is reactive \u2014 issues are addressed only in crisis.",
        "2": "Basic governance structure with a portfolio review board or steering committee. Decision rights are partially defined (some approvals clear, many ambiguous). Governance meetings occur but irregularly. Policies exist but are inconsistently applied. PMO is supportive \u2014 provides templates and best practices but does not enforce.",
        "3": "Formal governance structures with clear roles, responsibilities, and decision rights. Regular governance cadence (monthly steering committee, quarterly portfolio review). Stage-gate reviews with defined criteria and authority to stop or continue investments. Weekly team progress reporting and structured escalation paths. PMO requires compliance with frameworks and standards.",
        "4": "Governance performance is regularly tracked and reviewed. Governance decisions are data-driven with documented rationale. Cross-portfolio governance coordinates dependencies and conflicts. Governance processes are continuously improved based on effectiveness metrics. Governance extends beyond compliance to value optimization.",
        "5": "Governance is a strategic capability, not just an oversight function. Adaptive governance adjusts its intensity based on context (risk, size, complexity). AI enhances monitoring and policy recommendations, and automation enforces controls without manual effort. PMO manages portfolios directly with full authority. Governance is recognized externally as a model."
    },

    # Q6.5 (ID 103) - [Skills & Capacity] Leadership and operational skills for SPM
    103: {
        "1": "No dedicated organizational leadership for portfolio management. Leadership skills are informal and learned on the job. No change management capability. Capacity is entirely consumed by operational demands.",
        "2": "PMO leader or equivalent role established. Basic leadership development for portfolio roles. Some change management awareness but limited capability. Organizational capacity is strained by competing priorities.",
        "3": "Organizational leadership team for portfolio management is defined and empowered. Change management competency developed through training and certified practitioners. Adequate capacity to maintain organizational processes and governance. Communication and stakeholder management skills are cultivated.",
        "4": "Advanced organizational leadership skills including systems thinking, design thinking, and organizational psychology. Change management is a core competency with dedicated practitioners. Leadership capacity balances strategic and operational demands. Talent pipeline for organizational leadership roles is actively managed.",
        "5": "World-class organizational leadership capability recognized externally. Succession planning ensures continuity at all levels. The organization develops its own leadership models and shares them externally. Organizational capacity is dynamically scaled to meet evolving SPM needs."
    },
}


async def run_migration():
    """Populate score_descriptions for all 34 SPM assessment questions."""
    async with engine.begin() as conn:
        # Verify we're updating the right template
        result = await conn.execute(text(
            "SELECT COUNT(*) FROM assessment_questions WHERE template_id = 4"
        ))
        count = result.scalar()
        print(f"Found {count} SPM assessment questions (template_id=4)")

        if count != 34:
            print(f"WARNING: Expected 34 questions, found {count}. Proceeding anyway.")

        updated = 0
        for question_id, descriptions in SPM_SCORE_DESCRIPTIONS.items():
            result = await conn.execute(
                text("""
                    UPDATE assessment_questions
                    SET score_descriptions = :descriptions
                    WHERE id = :id AND template_id = 4
                """),
                {"id": question_id, "descriptions": json.dumps(descriptions)}
            )
            if result.rowcount > 0:
                updated += 1
                print(f"  Updated question ID {question_id}")
            else:
                print(f"  WARNING: Question ID {question_id} not found or not in SPM template")

        print(f"\nMigration complete: Updated {updated}/{len(SPM_SCORE_DESCRIPTIONS)} questions")


async def rollback_migration():
    """Reset score_descriptions to empty for all SPM questions."""
    async with engine.begin() as conn:
        result = await conn.execute(text("""
            UPDATE assessment_questions
            SET score_descriptions = '{}'::jsonb
            WHERE template_id = 4
        """))
        print(f"Rollback complete: Reset {result.rowcount} questions to empty score_descriptions")


if __name__ == "__main__":
    asyncio.run(run_migration())
