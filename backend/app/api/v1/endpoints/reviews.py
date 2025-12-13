"""
Reviews API Endpoints
- Submit review after consultation
- Get doctor reviews
- Get patient's submitted reviews
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

from app.db.database import get_db
from app.api.deps import get_current_user
from app.models.models import User, Doctor, Appointment, Review, AppointmentStatus
from app.services.in_app_notification_service import get_in_app_notification_service

router = APIRouter(prefix="/reviews", tags=["reviews"])


# Schemas
class ReviewCreate(BaseModel):
    appointment_id: int
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    comment: Optional[str] = Field(None, max_length=1000)


class ReviewResponse(BaseModel):
    id: int
    appointment_id: int
    rating: int
    comment: Optional[str]
    created_at: datetime
    patient_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class DoctorReviewsResponse(BaseModel):
    reviews: list[ReviewResponse]
    total: int
    average_rating: float
    rating_distribution: dict[str, int]  # {"5": 10, "4": 5, ...}


class PatientReviewResponse(BaseModel):
    id: int
    appointment_id: int
    rating: int
    comment: Optional[str]
    created_at: datetime
    doctor_name: str
    specialization: Optional[str]
    
    class Config:
        from_attributes = True


@router.post("", response_model=ReviewResponse)
async def submit_review(
    review_data: ReviewCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submit a review for a completed appointment.
    Only patients can submit reviews for their own appointments.
    """
    # Get the appointment
    result = await db.execute(
        select(Appointment).where(Appointment.id == review_data.appointment_id)
    )
    appointment = result.scalar_one_or_none()
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Verify this is the patient's appointment
    if appointment.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only review your own appointments")
    
    # Verify appointment is completed
    if appointment.status != AppointmentStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="You can only review completed appointments")
    
    # Check if already reviewed
    existing_review = await db.execute(
        select(Review).where(Review.appointment_id == review_data.appointment_id)
    )
    if existing_review.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="You have already reviewed this appointment")
    
    # Get doctor's user_id for notification before creating review
    doctor_result = await db.execute(
        select(Doctor).where(Doctor.id == appointment.doctor_id)
    )
    doctor = doctor_result.scalar_one_or_none()
    doctor_user_id = doctor.user_id if doctor else None
    
    # Create review
    review = Review(
        appointment_id=review_data.appointment_id,
        patient_id=current_user.id,
        doctor_id=appointment.doctor_id,
        rating=review_data.rating,
        comment=review_data.comment
    )
    db.add(review)
    
    # Update doctor's rating and review count
    await update_doctor_rating(db, appointment.doctor_id)
    
    await db.commit()
    await db.refresh(review)
    
    patient_name = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or "Anonymous"
    review_id = review.id
    rating = review_data.rating
    
    # Notify doctor about the new review in background
    if doctor_user_id:
        async def send_review_notification():
            try:
                from app.db.database import AsyncSessionLocal
                async with AsyncSessionLocal() as notif_db:
                    notification_service = get_in_app_notification_service(notif_db)
                    await notification_service.notify_review_received(
                        doctor_id=doctor_user_id,
                        patient_name=patient_name,
                        rating=rating,
                        review_id=review_id
                    )
            except Exception as e:
                import logging
                logging.error(f"Failed to send review notification: {e}")
        
        background_tasks.add_task(send_review_notification)
    
    return ReviewResponse(
        id=review.id,
        appointment_id=review.appointment_id,
        rating=review.rating,
        comment=review.comment,
        created_at=review.created_at,
        patient_name=patient_name
    )


@router.get("/doctor/{doctor_id}", response_model=DoctorReviewsResponse)
async def get_doctor_reviews(
    doctor_id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all reviews for a specific doctor.
    Public endpoint - no authentication required.
    """
    # Verify doctor exists
    doctor_result = await db.execute(select(Doctor).where(Doctor.id == doctor_id))
    doctor = doctor_result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    # Get reviews with patient info
    offset = (page - 1) * limit
    
    reviews_query = (
        select(Review, User)
        .join(User, Review.patient_id == User.id)
        .where(
            and_(
                Review.doctor_id == doctor_id,
                Review.is_approved == True,
                Review.is_hidden == False
            )
        )
        .order_by(Review.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    
    result = await db.execute(reviews_query)
    reviews_with_patients = result.all()
    
    # Get total count
    count_result = await db.execute(
        select(func.count(Review.id))
        .where(
            and_(
                Review.doctor_id == doctor_id,
                Review.is_approved == True,
                Review.is_hidden == False
            )
        )
    )
    total = count_result.scalar() or 0
    
    # Get average rating
    avg_result = await db.execute(
        select(func.avg(Review.rating))
        .where(
            and_(
                Review.doctor_id == doctor_id,
                Review.is_approved == True,
                Review.is_hidden == False
            )
        )
    )
    average_rating = float(avg_result.scalar() or 0)
    
    # Get rating distribution
    distribution = {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
    dist_result = await db.execute(
        select(Review.rating, func.count(Review.id))
        .where(
            and_(
                Review.doctor_id == doctor_id,
                Review.is_approved == True,
                Review.is_hidden == False
            )
        )
        .group_by(Review.rating)
    )
    for rating, count in dist_result.all():
        distribution[str(rating)] = count
    
    reviews = []
    for review, patient in reviews_with_patients:
        patient_name = f"{patient.first_name or ''} {patient.last_name or ''}".strip()
        if not patient_name:
            patient_name = "Anonymous Patient"
        
        reviews.append(ReviewResponse(
            id=review.id,
            appointment_id=review.appointment_id,
            rating=review.rating,
            comment=review.comment,
            created_at=review.created_at,
            patient_name=patient_name
        ))
    
    return DoctorReviewsResponse(
        reviews=reviews,
        total=total,
        average_rating=round(average_rating, 1),
        rating_distribution=distribution
    )


@router.get("/my-reviews", response_model=list[PatientReviewResponse])
async def get_my_reviews(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all reviews submitted by the current patient.
    """
    offset = (page - 1) * limit
    
    from app.models.models import Specialization
    
    query = (
        select(Review, Doctor, User, Specialization)
        .join(Doctor, Review.doctor_id == Doctor.id)
        .join(User, Doctor.user_id == User.id)
        .outerjoin(Specialization, Doctor.specialization_id == Specialization.id)
        .where(Review.patient_id == current_user.id)
        .order_by(Review.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    
    result = await db.execute(query)
    reviews_data = result.all()
    
    reviews = []
    for review, doctor, doctor_user, specialization in reviews_data:
        doctor_name = f"Dr. {doctor_user.first_name or ''} {doctor_user.last_name or ''}".strip()
        
        reviews.append(PatientReviewResponse(
            id=review.id,
            appointment_id=review.appointment_id,
            rating=review.rating,
            comment=review.comment,
            created_at=review.created_at,
            doctor_name=doctor_name,
            specialization=specialization.name if specialization else None
        ))
    
    return reviews


@router.get("/appointment/{appointment_id}", response_model=Optional[ReviewResponse])
async def get_appointment_review(
    appointment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get the review for a specific appointment (if exists).
    """
    # Verify user has access to this appointment
    appointment_result = await db.execute(
        select(Appointment).where(Appointment.id == appointment_id)
    )
    appointment = appointment_result.scalar_one_or_none()
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Get doctor's user_id to check access
    doctor_result = await db.execute(
        select(Doctor).where(Doctor.id == appointment.doctor_id)
    )
    doctor = doctor_result.scalar_one_or_none()
    
    if appointment.patient_id != current_user.id and (not doctor or doctor.user_id != current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get the review
    review_result = await db.execute(
        select(Review, User)
        .join(User, Review.patient_id == User.id)
        .where(Review.appointment_id == appointment_id)
    )
    result = review_result.first()
    
    if not result:
        return None
    
    review, patient = result
    patient_name = f"{patient.first_name or ''} {patient.last_name or ''}".strip() or "Anonymous"
    
    return ReviewResponse(
        id=review.id,
        appointment_id=review.appointment_id,
        rating=review.rating,
        comment=review.comment,
        created_at=review.created_at,
        patient_name=patient_name
    )


async def update_doctor_rating(db: AsyncSession, doctor_id: int):
    """
    Update doctor's average rating and total review count.
    Called after a new review is submitted.
    """
    # Calculate new average rating
    avg_result = await db.execute(
        select(func.avg(Review.rating), func.count(Review.id))
        .where(
            and_(
                Review.doctor_id == doctor_id,
                Review.is_approved == True,
                Review.is_hidden == False
            )
        )
    )
    avg_rating, total_reviews = avg_result.first()
    
    # Update doctor record
    doctor_result = await db.execute(
        select(Doctor).where(Doctor.id == doctor_id)
    )
    doctor = doctor_result.scalar_one_or_none()
    
    if doctor:
        doctor.rating = round(float(avg_rating or 0), 1)
        doctor.total_reviews = total_reviews or 0
