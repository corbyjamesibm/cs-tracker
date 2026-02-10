"""
Fillable PDF Assessment Generator

Generates a PDF with AcroForm radio buttons for each assessment question,
allowing clients to fill in their own ratings and return the PDF for import.
"""

import io
from reportlab.lib.pagesizes import letter
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph
from reportlab.lib.enums import TA_LEFT


# Colors
COLOR_PRIMARY = HexColor("#1F4E79")
COLOR_HIGHLIGHT = HexColor("#E8F0FE")
COLOR_SECONDARY = HexColor("#525252")
COLOR_LIGHT_GRAY = HexColor("#F5F5F5")
COLOR_BORDER = HexColor("#CCCCCC")
COLOR_WHITE = white
COLOR_BLACK = black


def generate_fillable_assessment_pdf(report_data: dict) -> io.BytesIO:
    """Generate a fillable PDF assessment with radio buttons for each question."""
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    page_width, page_height = letter
    margin = 50
    usable_width = page_width - 2 * margin
    y = page_height - margin

    # Track page number
    page_num = [1]

    def new_page():
        """Start a new page with footer."""
        _draw_footer(c, page_width, page_num[0], report_data)
        c.showPage()
        page_num[0] += 1
        return page_height - margin

    def check_space(needed, current_y):
        """Check if we need a new page, return updated y."""
        if current_y - needed < margin + 30:
            return new_page()
        return current_y

    # === PAGE 1: HEADER ===
    y = _draw_header(c, report_data, margin, y, usable_width)
    y -= 20

    # === INSTRUCTIONS ===
    y = _draw_instructions(c, margin, y, usable_width)
    y -= 20

    # === DIMENSION SUMMARY ===
    y = check_space(30 + len(report_data.get("dimensions", [])) * 25, y)
    y = _draw_dimension_summary(c, report_data, margin, y, usable_width)
    y -= 30

    # === HIDDEN METADATA FIELDS ===
    _add_hidden_fields(c, report_data)

    # === PER-QUESTION SECTIONS ===
    for dim in report_data.get("dimensions", []):
        # Dimension header
        y = check_space(50, y)
        y = _draw_dimension_header(c, dim, margin, y, usable_width)
        y -= 10

        for question in dim.get("questions", []):
            # Estimate space needed for this question
            # Each rating option takes ~45px, plus question header ~40px, plus notes ~40px
            all_labels = question.get("all_score_labels", {})
            num_options = len(all_labels) if all_labels else 5
            space_needed = 50 + (num_options * 48) + 50
            y = check_space(space_needed, y)

            y = _draw_question(c, question, margin, y, usable_width)
            y -= 15

    # Final footer
    _draw_footer(c, page_width, page_num[0], report_data)
    c.save()
    buffer.seek(0)
    return buffer


def _draw_header(c, report_data, margin, y, usable_width):
    """Draw the assessment header with title, customer, score, and date."""
    # Title bar
    c.setFillColor(COLOR_PRIMARY)
    c.rect(margin, y - 35, usable_width, 35, fill=1)
    c.setFillColor(COLOR_WHITE)
    c.setFont("Helvetica-Bold", 16)
    template_name = report_data.get("template", {}).get("name", "Assessment")
    c.drawString(margin + 10, y - 25, template_name)
    y -= 45

    # Customer info row
    c.setFillColor(COLOR_LIGHT_GRAY)
    c.rect(margin, y - 60, usable_width, 60, fill=1)

    c.setFillColor(COLOR_BLACK)
    c.setFont("Helvetica-Bold", 11)
    customer_name = report_data.get("customer", {}).get("name", "N/A")
    c.drawString(margin + 10, y - 18, f"Customer: {customer_name}")

    c.setFont("Helvetica", 10)
    assessment_date = report_data.get("assessment_date", "N/A")
    c.drawString(margin + 10, y - 35, f"Date: {assessment_date}")

    overall_score = report_data.get("overall_score")
    if overall_score is not None:
        c.drawString(margin + 10, y - 50, f"Overall Score: {overall_score:.1f} / 5.0")

    answered = report_data.get("answered_questions", 0)
    total = report_data.get("total_questions", 0)
    c.drawString(margin + 300, y - 35, f"Questions Answered: {answered} / {total}")

    status = report_data.get("status", "N/A")
    c.drawString(margin + 300, y - 50, f"Status: {status}")

    y -= 70
    return y


def _draw_instructions(c, margin, y, usable_width):
    """Draw instructions box."""
    box_height = 65
    c.setStrokeColor(COLOR_PRIMARY)
    c.setFillColor(HexColor("#EBF5FF"))
    c.roundRect(margin, y - box_height, usable_width, box_height, 5, fill=1)

    c.setFillColor(COLOR_PRIMARY)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(margin + 10, y - 15, "Instructions")

    c.setFillColor(COLOR_SECONDARY)
    c.setFont("Helvetica", 9)
    c.drawString(margin + 10, y - 30,
                 "1. Review each question and its rating options below.")
    c.drawString(margin + 10, y - 42,
                 "2. Select the appropriate rating by clicking the radio button next to your chosen level.")
    c.drawString(margin + 10, y - 54,
                 "3. Add notes in the text fields if needed. Save and return this PDF when complete.")

    y -= box_height
    return y


def _draw_dimension_summary(c, report_data, margin, y, usable_width):
    """Draw dimension score summary bars."""
    dimension_scores = report_data.get("dimension_scores", {})
    if not dimension_scores:
        return y

    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(COLOR_PRIMARY)
    c.drawString(margin, y, "Dimension Summary")
    y -= 20

    bar_height = 16
    max_bar_width = usable_width * 0.5
    label_width = usable_width * 0.35

    for dim_name, score in sorted(dimension_scores.items()):
        # Dimension label
        c.setFont("Helvetica", 9)
        c.setFillColor(COLOR_BLACK)
        # Truncate long names
        display_name = dim_name[:40] + "..." if len(dim_name) > 40 else dim_name
        c.drawString(margin, y - 12, display_name)

        # Background bar
        bar_x = margin + label_width
        c.setFillColor(HexColor("#E5E7EB"))
        c.rect(bar_x, y - bar_height + 2, max_bar_width, bar_height, fill=1)

        # Score bar
        score_width = (score / 5.0) * max_bar_width
        if score >= 4:
            bar_color = HexColor("#22C55E")
        elif score >= 3:
            bar_color = HexColor("#EAB308")
        elif score >= 2:
            bar_color = HexColor("#F97316")
        else:
            bar_color = HexColor("#EF4444")
        c.setFillColor(bar_color)
        c.rect(bar_x, y - bar_height + 2, score_width, bar_height, fill=1)

        # Score text
        c.setFillColor(COLOR_BLACK)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(bar_x + max_bar_width + 8, y - 12, f"{score:.1f}")

        y -= bar_height + 6

    return y


def _draw_dimension_header(c, dim, margin, y, usable_width):
    """Draw a dimension section header."""
    dim_name = dim.get("dimension_name", "Unknown")
    questions = dim.get("questions", [])
    # Calculate dimension average
    scores = [q["score"] for q in questions if q.get("score") is not None]
    avg_score = sum(scores) / len(scores) if scores else 0

    c.setFillColor(COLOR_PRIMARY)
    c.rect(margin, y - 25, usable_width, 25, fill=1)
    c.setFillColor(COLOR_WHITE)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(margin + 10, y - 18, dim_name)
    c.setFont("Helvetica", 10)
    c.drawString(margin + usable_width - 100, y - 18,
                 f"Avg: {avg_score:.1f} / 5.0")
    y -= 30
    return y


def _draw_question(c, question, margin, y, usable_width):
    """Draw a single question with radio buttons for all rating options."""
    q_id = question.get("question_id")
    q_num = question.get("question_number", "")
    q_text = question.get("question_text", "")
    current_score = question.get("score")
    all_labels = question.get("all_score_labels", {})
    all_descriptions = question.get("all_score_descriptions", {})
    all_evidence = question.get("all_score_evidence", {})
    min_score = question.get("min_score", 1)
    max_score = question.get("max_score", 5)

    # Question header
    c.setFillColor(HexColor("#F8FAFC"))
    c.setStrokeColor(COLOR_BORDER)
    c.rect(margin, y - 28, usable_width, 28, fill=1, stroke=1)
    c.setFillColor(COLOR_PRIMARY)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(margin + 8, y - 19, f"Q{q_num}. {q_text[:90]}")
    # If text is too long, wrap to second line
    if len(q_text) > 90:
        y -= 14
        c.setFont("Helvetica", 9)
        c.drawString(margin + 28, y - 19, q_text[90:180])
    y -= 32

    # Radio button options
    field_name = f"q_{q_id}"
    radio_x = margin + 15

    for score_val in range(min_score, max_score + 1):
        score_key = str(score_val)
        label = all_labels.get(score_key, f"Level {score_val}")
        description = all_descriptions.get(score_key, "")
        evidence = all_evidence.get(score_key, "")

        is_selected = (current_score is not None and current_score == score_val)

        # Highlight background if selected
        option_height = 38
        if evidence:
            option_height += 12

        if is_selected:
            c.setFillColor(COLOR_HIGHLIGHT)
            c.rect(margin + 5, y - option_height + 4, usable_width - 10,
                   option_height, fill=1, stroke=0)

        # Radio button
        c.acroForm.radio(
            name=field_name,
            value=score_key,
            selected=(score_key == str(current_score)) if current_score else False,
            x=radio_x,
            y=y - 16,
            size=14,
            buttonStyle='circle',
            borderColor=COLOR_PRIMARY,
            fillColor=COLOR_WHITE,
            textColor=COLOR_PRIMARY,
            forceBorder=True,
        )

        # Score number and label
        c.setFillColor(COLOR_BLACK)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(radio_x + 20, y - 13, f"{score_val} - {label}")

        # Description
        if description:
            c.setFillColor(COLOR_SECONDARY)
            c.setFont("Helvetica", 8)
            # Wrap description text
            desc_display = description[:120]
            if len(description) > 120:
                desc_display += "..."
            c.drawString(radio_x + 20, y - 26, desc_display)

        # Evidence
        if evidence:
            c.setFillColor(HexColor("#6B7280"))
            c.setFont("Helvetica-Oblique", 8)
            evidence_display = f"Evidence: {evidence[:100]}"
            if len(evidence) > 100:
                evidence_display += "..."
            c.drawString(radio_x + 20, y - 38, evidence_display)

        y -= option_height + 4

    # Notes text field
    y -= 5
    c.setFillColor(COLOR_SECONDARY)
    c.setFont("Helvetica", 9)
    c.drawString(margin + 8, y - 2, "Notes:")
    c.acroForm.textfield(
        name=f"notes_{q_id}",
        x=margin + 50,
        y=y - 18,
        width=usable_width - 60,
        height=20,
        value=question.get("notes", "") or "",
        fontSize=9,
        borderColor=COLOR_BORDER,
        fillColor=COLOR_WHITE,
        textColor=COLOR_BLACK,
        maxlen=500,
    )
    y -= 25

    return y


def _add_hidden_fields(c, report_data):
    """Add hidden metadata fields to the PDF form."""
    assessment_id = str(report_data.get("assessment_id", ""))
    template_id = str(report_data.get("template", {}).get("id", ""))
    customer_id = str(report_data.get("customer", {}).get("id", ""))

    # Place hidden fields off-screen
    c.acroForm.textfield(
        name="assessment_id",
        value=assessment_id,
        x=-100, y=-100,
        width=1, height=1,
        fontSize=1,
    )
    c.acroForm.textfield(
        name="template_id",
        value=template_id,
        x=-100, y=-100,
        width=1, height=1,
        fontSize=1,
    )
    c.acroForm.textfield(
        name="customer_id",
        value=customer_id,
        x=-100, y=-100,
        width=1, height=1,
        fontSize=1,
    )


def _draw_footer(c, page_width, page_num, report_data):
    """Draw page footer."""
    c.setFont("Helvetica", 8)
    c.setFillColor(COLOR_SECONDARY)
    customer_name = report_data.get("customer", {}).get("name", "")
    template_name = report_data.get("template", {}).get("name", "")
    c.drawString(50, 25, f"{customer_name} - {template_name}")
    c.drawRightString(page_width - 50, 25, f"Page {page_num}")
