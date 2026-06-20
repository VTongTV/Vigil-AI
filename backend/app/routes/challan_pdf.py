"""POST /api/v1/evidence/{violation_id}/challan-pdf — Generate E-Challan PDF for a violation.

Generates a realistic E-Challan PDF with violation details, MV Act sections, 
evidence integrity hash, payment instructions, and QR code placeholder.
"""

import logging
from datetime import datetime, timezone
from io import BytesIO

from fpdf import FPDF
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.db.models import ViolationRecordDB

logger = logging.getLogger(__name__)
router = APIRouter()


def sanitize_text(text: str) -> str:
    """Replace common unicode characters not supported by fpdf latin-1 fonts."""
    if not text:
        return ""
    # Standard replacement of arrows and en-dashes
    text = text.replace('→', '->').replace('–', '-').replace('—', '-')
    # Catch any remaining non-latin-1 characters
    return text.encode('latin-1', 'replace').decode('latin-1')


@router.post("/evidence/{violation_id}/challan-pdf")
async def generate_challan_pdf(
    violation_id: str,
    db: Session = Depends(get_db),
):
    """Generate a downloadable E-Challan PDF for a violation.

    Produces a formatted PDF document containing:
        - Bengaluru Traffic Police header
        - Notice under section 133 of Motor Vehicles Act
        - Challan reference number
        - Violation and Vehicle details
        - AI-generated explanation and evidence hash
        - Fine amount and payment instructions
        - Scan to Pay Placeholder

    Args:
        violation_id: Unique violation identifier.

    Returns:
        Response with PDF content.

    Raises:
        HTTPException 404: If violation not found.
    """
    record = db.query(ViolationRecordDB).filter(ViolationRecordDB.id == violation_id).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"Violation {violation_id} not found")

    v_type = record.violation_type.value if hasattr(record.violation_type, 'value') else str(record.violation_type)
    v_status = record.status.value if hasattr(record.status, 'value') else str(record.status)
    timestamp_str = record.timestamp.strftime("%d/%m/%Y %H:%M:%S") if record.timestamp else "N/A"
    date_str = record.timestamp.strftime("%d/%m/%Y") if record.timestamp else datetime.now(timezone.utc).strftime("%d/%m/%Y")

    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    # Outer border
    pdf.set_line_width(0.5)
    pdf.rect(5, 5, 200, 287)
    pdf.rect(6, 6, 198, 285)

    # Header — Bengaluru Traffic Police
    pdf.set_font("Helvetica", "B", 18)
    pdf.cell(0, 10, "BENGALURU TRAFFIC POLICE", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 8, "TRAFFIC MANAGEMENT CENTRE", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "I", 10)
    pdf.cell(0, 6, "Notice under Section 133 of Motor Vehicles Act 1988", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    # Separator line
    pdf.set_line_width(0.5)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(5)

    # Challan Title & Ref
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "TRAFFIC VIOLATION E-CHALLAN", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    pdf.set_font("Helvetica", "B", 10)
    challan_ref = f"KA-BTP-{record.id[:8].upper()}"
    pdf.cell(100, 7, f"Challan No: {challan_ref}", new_x="RIGHT")
    pdf.cell(0, 7, f"Date of Issue: {date_str}", align="R", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_line_width(0.2)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(3)

    # Vehicle Information
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_fill_color(230, 230, 230)
    pdf.cell(0, 8, " VEHICLE DETAILS", border=1, fill=True, new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    
    plate_text = record.license_plate_text if record.license_plate_text else "Not captured (Manual Verification Required)"
    pdf.cell(60, 8, " Registration Number:", border="L")
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 8, sanitize_text(plate_text), border="R", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(60, 8, " Vehicle Class:", border="L")
    pdf.cell(0, 8, "Motor Vehicle (As per AI Detection)", border="R", new_x="LMARGIN", new_y="NEXT")
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(3)

    # Violation Information
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, " VIOLATION DETAILS", border=1, fill=True, new_x="LMARGIN", new_y="NEXT")
    
    details = [
        ("Offence Description", sanitize_text(v_type.replace("_", " ").title())),
        ("Date & Time of Offence", timestamp_str),
        ("Location of Offence", sanitize_text(record.junction_name or "N/A")),
        ("MV Act Section", sanitize_text(record.mv_act_section or "N/A")),
        ("Detection Camera", sanitize_text(record.camera_id or "N/A")),
        ("Fine Amount", f"Rs. {record.fine_amount or 0}/-"),
    ]

    for label, value in details:
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(60, 8, f" {label}:", border="L")
        pdf.set_font("Helvetica", "B", 10)
        if label == "Fine Amount":
            pdf.set_text_color(200, 0, 0)
        pdf.cell(0, 8, str(value), border="R", new_x="LMARGIN", new_y="NEXT")
        pdf.set_text_color(0, 0, 0)

    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(3)

    # Evidence & AI Section
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, " EVIDENCE & VERIFICATION", border=1, fill=True, new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(60, 8, " Evidence Hash (SHA-256):", border="L")
    pdf.set_font("Courier", "", 8)
    hash_val = record.evidence_hash or "N/A"
    pdf.cell(0, 8, hash_val[:48] + ("..." if len(hash_val) > 48 else ""), border="R", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(60, 8, " Automated Analysis:", border="L")
    pdf.set_font("Helvetica", "I", 9)
    explanation = record.ai_explanation or "No AI explanation available."
    
    # Store current x,y to draw the right border
    start_y = pdf.get_y()
    pdf.set_x(70)
    pdf.multi_cell(0, 5, sanitize_text(explanation))
    end_y = pdf.get_y()
    
    # Draw side borders for the multi_cell region
    pdf.line(10, start_y, 10, end_y)
    pdf.line(200, start_y, 200, end_y)
    
    pdf.line(10, end_y, 200, end_y)
    pdf.ln(5)

    # Payment Instructions
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "PAYMENT INSTRUCTIONS", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    instructions = (
        "1. You are directed to pay the fine amount within 7 days of this notice.\n"
        "2. Payment can be made online at: https://bangaloretrafficpolice.gov.in\n"
        "3. Alternatively, pay via Paytm, PhonePe, or at any Bangalore One centre.\n"
        "4. Failure to pay will result in the matter being forwarded to the Virtual Court."
    )
    pdf.multi_cell(0, 6, instructions)
    pdf.ln(5)

    # QR Code placeholder
    pdf.set_draw_color(0, 0, 0)
    qr_x, qr_y = 160, pdf.get_y()
    pdf.rect(qr_x, qr_y, 30, 30)
    pdf.set_xy(qr_x, qr_y + 12)
    pdf.set_font("Helvetica", "B", 8)
    pdf.cell(30, 5, "SCAN TO", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(qr_x)
    pdf.cell(30, 5, "PAY", align="C", new_x="LMARGIN", new_y="NEXT")
    
    # Reset Y after QR
    pdf.set_y(qr_y + 35)

    # Issuing Authority
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, "ISSUING AUTHORITY", align="R", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, "Automated Traffic Enforcement System", align="R", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, "Bengaluru Traffic Police", align="R", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)

    # Footer
    pdf.set_y(-25)
    pdf.set_font("Helvetica", "I", 8)
    pdf.cell(0, 5, "This is a computer-generated document. No signature is required.", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 5, f"Generated at: {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M:%S UTC')} | Powering VigilAI", align="C", new_x="LMARGIN", new_y="NEXT")

    # Stream the PDF
    buffer = BytesIO()
    pdf.output(buffer)

    filename = f"Challan_{record.id[:8].upper()}.pdf"

    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )
