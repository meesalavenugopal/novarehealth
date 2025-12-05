"""
PDF Generation Service for Prescriptions.

Uses ReportLab to generate professional prescription PDFs.
"""
import io
import os
from datetime import datetime, date
from typing import Optional
import logging

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload, joinedload

logger = logging.getLogger(__name__)


async def generate_prescription_pdf(prescription_id: int):
    """
    Generate a prescription PDF and save to storage.
    This runs as a background task.
    """
    from app.db.database import async_session_maker
    from app.models import Prescription, Doctor, User
    from app.services.file_service import FileService
    
    try:
        async with async_session_maker() as db:
            # Get prescription with all related data
            result = await db.execute(
                select(Prescription)
                .options(
                    joinedload(Prescription.doctor).joinedload(Doctor.user),
                    joinedload(Prescription.doctor).joinedload(Doctor.specialization),
                    joinedload(Prescription.patient),
                    joinedload(Prescription.appointment)
                )
                .where(Prescription.id == prescription_id)
            )
            prescription = result.scalar_one_or_none()
            
            if not prescription:
                logger.error(f"Prescription {prescription_id} not found")
                return
            
            # Generate PDF content
            pdf_buffer = _create_prescription_pdf(prescription)
            
            # Save to storage
            file_service = FileService()
            filename = f"prescription_{prescription_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            
            pdf_url = await file_service.upload_file(
                file_content=pdf_buffer.getvalue(),
                filename=filename,
                content_type="application/pdf",
                folder="prescriptions"
            )
            
            # Update prescription with PDF URL
            prescription.pdf_url = pdf_url
            await db.commit()
            
            logger.info(f"Generated PDF for prescription {prescription_id}: {pdf_url}")
            
    except Exception as e:
        logger.error(f"Error generating prescription PDF: {str(e)}")
        raise


def _create_prescription_pdf(prescription) -> io.BytesIO:
    """Create the actual PDF content."""
    buffer = io.BytesIO()
    
    # Create document
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20*mm,
        leftMargin=20*mm,
        topMargin=15*mm,
        bottomMargin=15*mm
    )
    
    # Styles
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#2563EB'),
        spaceAfter=6,
        alignment=TA_CENTER
    )
    
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#6B7280'),
        alignment=TA_CENTER,
        spaceAfter=12
    )
    
    header_style = ParagraphStyle(
        'Header',
        parent=styles['Heading2'],
        fontSize=12,
        textColor=colors.HexColor('#1F2937'),
        spaceBefore=12,
        spaceAfter=6
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#374151'),
        spaceAfter=4
    )
    
    label_style = ParagraphStyle(
        'Label',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#6B7280'),
        spaceAfter=2
    )
    
    # Build content
    elements = []
    
    # Header - Clinic Name
    elements.append(Paragraph("Novare Health", title_style))
    elements.append(Paragraph("Telemedicine Healthcare Platform", subtitle_style))
    
    # Divider line
    elements.append(Spacer(1, 6))
    line_table = Table([['']], colWidths=[170*mm])
    line_table.setStyle(TableStyle([
        ('LINEABOVE', (0, 0), (-1, 0), 1, colors.HexColor('#E5E7EB')),
    ]))
    elements.append(line_table)
    elements.append(Spacer(1, 12))
    
    # Prescription Info Header
    rx_date = prescription.created_at.strftime("%d %B %Y") if prescription.created_at else "N/A"
    rx_number = f"RX-{prescription.id:06d}"
    
    info_data = [
        [
            Paragraph(f"<b>Prescription No:</b> {rx_number}", normal_style),
            Paragraph(f"<b>Date:</b> {rx_date}", normal_style)
        ]
    ]
    info_table = Table(info_data, colWidths=[85*mm, 85*mm])
    info_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 12))
    
    # Doctor Information
    doctor = prescription.doctor
    doctor_name = doctor.user.full_name if doctor and doctor.user else "N/A"
    specialization = doctor.specialization.name if doctor and doctor.specialization else "General Physician"
    
    elements.append(Paragraph("Prescribing Doctor", label_style))
    doctor_info = f"<b>Dr. {doctor_name}</b><br/>{specialization}"
    if doctor and doctor.registration_number:
        doctor_info += f"<br/>Reg. No: {doctor.registration_number}"
    elements.append(Paragraph(doctor_info, normal_style))
    elements.append(Spacer(1, 12))
    
    # Patient Information
    patient = prescription.patient
    patient_name = patient.full_name if patient else "N/A"
    
    # Calculate age
    patient_age = "N/A"
    if patient and patient.date_of_birth:
        today = date.today()
        dob = patient.date_of_birth
        age_years = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        patient_age = f"{age_years} years"
    
    patient_gender = patient.gender.capitalize() if patient and patient.gender else "N/A"
    
    elements.append(Paragraph("Patient Details", label_style))
    patient_data = [
        [
            Paragraph(f"<b>Name:</b> {patient_name}", normal_style),
            Paragraph(f"<b>Age:</b> {patient_age}", normal_style),
            Paragraph(f"<b>Gender:</b> {patient_gender}", normal_style)
        ]
    ]
    patient_table = Table(patient_data, colWidths=[70*mm, 50*mm, 50*mm])
    patient_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(patient_table)
    elements.append(Spacer(1, 12))
    
    # Diagnosis
    if prescription.diagnosis:
        elements.append(Paragraph("Diagnosis", header_style))
        elements.append(Paragraph(prescription.diagnosis, normal_style))
        elements.append(Spacer(1, 12))
    
    # Medications Table
    elements.append(Paragraph("Prescribed Medications", header_style))
    
    # Table header
    med_header = ['#', 'Medicine', 'Dosage', 'Frequency', 'Duration', 'Instructions']
    med_data = [med_header]
    
    medications = prescription.medications or []
    for idx, med in enumerate(medications, 1):
        row = [
            str(idx),
            med.get('name', 'N/A'),
            med.get('dosage', 'N/A'),
            med.get('frequency', 'N/A'),
            med.get('duration', 'N/A'),
            med.get('instructions', '') or med.get('notes', '') or '-'
        ]
        med_data.append(row)
    
    # Create medications table
    med_table = Table(med_data, colWidths=[10*mm, 45*mm, 25*mm, 30*mm, 25*mm, 35*mm])
    med_table.setStyle(TableStyle([
        # Header styling
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563EB')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        
        # Body styling
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        
        # Alternating row colors
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F9FAFB')]),
        
        # Borders
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
        
        # Alignment
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(med_table)
    elements.append(Spacer(1, 16))
    
    # Advice
    if prescription.advice:
        elements.append(Paragraph("Advice & Instructions", header_style))
        elements.append(Paragraph(prescription.advice, normal_style))
        elements.append(Spacer(1, 12))
    
    # Notes
    if prescription.notes:
        elements.append(Paragraph("Notes", header_style))
        elements.append(Paragraph(prescription.notes, normal_style))
        elements.append(Spacer(1, 12))
    
    # Follow-up
    if prescription.follow_up_date:
        follow_up = prescription.follow_up_date.strftime("%d %B %Y")
        elements.append(Paragraph("Follow-up", header_style))
        elements.append(Paragraph(f"Please schedule a follow-up appointment on or before <b>{follow_up}</b>", normal_style))
        elements.append(Spacer(1, 16))
    
    # Footer divider
    line_table2 = Table([['']], colWidths=[170*mm])
    line_table2.setStyle(TableStyle([
        ('LINEABOVE', (0, 0), (-1, 0), 1, colors.HexColor('#E5E7EB')),
    ]))
    elements.append(line_table2)
    elements.append(Spacer(1, 8))
    
    # Footer
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#9CA3AF'),
        alignment=TA_CENTER
    )
    
    elements.append(Paragraph(
        "This is a digitally generated prescription from Novare Health Telemedicine Platform.",
        footer_style
    ))
    elements.append(Paragraph(
        f"Generated on {datetime.now().strftime('%d %B %Y at %H:%M')}",
        footer_style
    ))
    
    # Signature area
    elements.append(Spacer(1, 24))
    sig_data = [
        ['', f"Dr. {doctor_name}"],
        ['', "Authorized Signatory"]
    ]
    sig_table = Table(sig_data, colWidths=[100*mm, 70*mm])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
        ('FONTNAME', (1, 0), (1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (1, 0), (1, 0), 10),
        ('FONTSIZE', (1, 1), (1, 1), 8),
        ('TEXTCOLOR', (1, 1), (1, 1), colors.HexColor('#6B7280')),
        ('LINEABOVE', (1, 0), (1, 0), 1, colors.HexColor('#374151')),
        ('TOPPADDING', (1, 0), (1, 0), 8),
    ]))
    elements.append(sig_table)
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    return buffer
