"""POST /api/v1/evidence/{violation_id}/fir-pdf — Generate FIR PDF for a violation.

Generates a court-admissible First Information Report PDF with violation
details, MV Act sections, evidence integrity hash, and officer fields.
"""

import logging
from datetime import datetime, timezone
from io import BytesIO

from fpdf import FPDF
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.db.models import ViolationRecordDB

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/evidence/{violation_id}/fir-pdf")
async def generate_fir_pdf(
    violation_id: str,
    db: Session = Depends(get_db),
):
    """Generate a downloadable FIR PDF for a violation (F2).

    Produces a formatted PDF document containing:
        - Bengaluru Traffic Police header and seal
        - FIR reference number (derived from violation ID)
        - Violation details (type, timestamp, location, camera)
        - Motor Vehicles Act section and fine amount
        - License plate information
        - Evidence integrity hash (SHA-256)
        - AI-generated explanation
        - Danger score
        - Officer signature block

    Args:
        violation_id: Unique violation identifier.

    Returns:
        StreamingResponse with PDF content.

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

    # Header — Bengaluru Traffic Police
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "BENGALURU TRAFFIC POLICE", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "OFFICE OF THE ASSISTANT COMMISSIONER OF TRAFFIC", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, "Bengaluru, Karnataka - 560001", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    # Separator line
    pdf.set_draw_color(0, 0, 0)
    pdf.set_line_width(0.5)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(5)

    # FIR Title
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "FIRST INFORMATION REPORT (FIR)", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    # FIR Reference
    pdf.set_font("Helvetica", "B", 10)
    fir_ref = f"BTP-FIR-{record.id[:8].upper()}"
    pdf.cell(0, 7, f"FIR Reference No: {fir_ref}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, f"Date: {date_str}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    # Section separator
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, "1. VIOLATION DETAILS", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)

    details = [
        ("Violation Type", v_type.replace("_", " ").title()),
        ("Motor Vehicles Act Section", record.mv_act_section or "N/A"),
        ("Fine Amount", f"Rs. {record.fine_amount or 0}"),
        ("Current Status", v_status.replace("_", " ").title()),
        ("Danger Score", f"{record.danger_score or 0}/100"),
        ("Detection Confidence", f"{(record.confidence or 0) * 100:.1f}%"),
        ("Camera ID", record.camera_id or "N/A"),
        ("Junction", record.junction_name or "N/A"),
        ("Location", f"{record.latitude or 0:.4f}N, {record.longitude or 0:.4f}E" if record.latitude else "N/A"),
        ("Date & Time of Offence", timestamp_str),
    ]

    for label, value in details:
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(70, 6, f"   {label}:", new_x="RIGHT")
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(0, 6, str(value), new_x="LMARGIN", new_y="NEXT")

    pdf.ln(3)

    # License Plate Section
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, "2. LICENSE PLATE INFORMATION", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)

    if record.license_plate_text:
        pdf.cell(70, 6, "   Plate Number:", new_x="RIGHT")
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(0, 6, record.license_plate_text, new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 10)
        conf = (record.license_plate_confidence or 0) * 100
        pdf.cell(70, 6, "   OCR Confidence:", new_x="RIGHT")
        pdf.cell(0, 6, f"{conf:.1f}%", new_x="LMARGIN", new_y="NEXT")
    else:
        pdf.cell(0, 6, "   License plate not captured", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(3)

    # Evidence Integrity Section
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, "3. EVIDENCE INTEGRITY", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)

    pdf.cell(70, 6, "   Evidence Hash (SHA-256):", new_x="RIGHT")
    pdf.set_font("Courier", "", 8)
    hash_val = record.evidence_hash or "N/A"
    pdf.cell(0, 6, hash_val[:48] + ("..." if len(hash_val) > 48 else ""), new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(70, 6, "   Evidence Image:", new_x="RIGHT")
    pdf.cell(0, 6, record.evidence_url or "N/A", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(3)

    # AI Explanation Section
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, "4. AI DETECTION EXPLANATION", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)

    explanation = record.ai_explanation or "No AI explanation available."
    pdf.multi_cell(0, 6, f"   {explanation}")

    pdf.ln(5)

    # Signature Block
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, "5. OFFICER ATTESTATION", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, "   I certify that the above information is true and correct to the best of my knowledge.", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(10)

    pdf.cell(90, 6, "   _________________________", new_x="RIGHT")
    pdf.cell(0, 6, "_________________________", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(90, 6, "   Officer Signature", new_x="RIGHT")
    pdf.cell(0, 6, "Date & Seal", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)

    # Footer
    pdf.set_font("Helvetica", "I", 8)
    pdf.cell(0, 5, "This document was generated by VigilAI - AI-Powered Traffic Violation Detection System", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 5, f"Generated at: {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M:%S UTC')}", align="C", new_x="LMARGIN", new_y="NEXT")

    # Stream the PDF
    buffer = BytesIO()
    pdf.output(buffer)
    buffer.seek(0)

    filename = f"FIR_{record.id[:8].upper()}.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )
