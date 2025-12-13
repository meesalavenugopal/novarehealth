"""
Notifications API endpoints for in-app notifications.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import datetime

from app.db.database import get_db
from app.models.models import User, Notification, NotificationType
from app.api.deps import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


# Response schemas
from pydantic import BaseModel
from typing import List, Any


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    type: str
    title: str
    message: str
    is_read: bool
    related_id: Optional[int] = None
    related_type: Optional[str] = None
    extra_data: Optional[dict] = None
    created_at: datetime
    read_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NotificationsListResponse(BaseModel):
    notifications: List[NotificationResponse]
    total: int
    page: int
    limit: int
    unread_count: int


class UnreadCountResponse(BaseModel):
    unread_count: int


class MessageResponse(BaseModel):
    message: str


@router.get("", response_model=NotificationsListResponse)
async def get_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all notifications for the current user with pagination."""
    offset = (page - 1) * limit
    
    # Base query
    query = select(Notification).where(Notification.user_id == current_user.id)
    
    if unread_only:
        query = query.where(Notification.is_read == False)
    
    # Get total count
    count_query = select(func.count()).select_from(Notification).where(
        Notification.user_id == current_user.id
    )
    if unread_only:
        count_query = count_query.where(Notification.is_read == False)
    
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Get unread count
    unread_query = select(func.count()).select_from(Notification).where(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    )
    unread_result = await db.execute(unread_query)
    unread_count = unread_result.scalar() or 0
    
    # Get notifications with pagination
    query = query.order_by(Notification.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    notifications = result.scalars().all()
    
    return NotificationsListResponse(
        notifications=[
            NotificationResponse(
                id=n.id,
                user_id=n.user_id,
                type=n.type.value if isinstance(n.type, NotificationType) else n.type,
                title=n.title,
                message=n.message,
                is_read=n.is_read,
                related_id=n.related_id,
                related_type=n.related_type,
                extra_data=n.extra_data,
                created_at=n.created_at,
                read_at=n.read_at
            )
            for n in notifications
        ],
        total=total,
        page=page,
        limit=limit,
        unread_count=unread_count
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get the count of unread notifications for the current user."""
    query = select(func.count()).select_from(Notification).where(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    )
    result = await db.execute(query)
    count = result.scalar() or 0
    
    return UnreadCountResponse(unread_count=count)


@router.put("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark a specific notification as read."""
    query = select(Notification).where(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    )
    result = await db.execute(query)
    notification = result.scalar_one_or_none()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.is_read = True
    notification.read_at = datetime.utcnow()
    await db.commit()
    await db.refresh(notification)
    
    return NotificationResponse(
        id=notification.id,
        user_id=notification.user_id,
        type=notification.type.value if isinstance(notification.type, NotificationType) else notification.type,
        title=notification.title,
        message=notification.message,
        is_read=notification.is_read,
        related_id=notification.related_id,
        related_type=notification.related_type,
        extra_data=notification.extra_data,
        created_at=notification.created_at,
        read_at=notification.read_at
    )


@router.put("/read-all", response_model=MessageResponse)
async def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark all notifications as read for the current user."""
    stmt = (
        update(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        )
        .values(is_read=True, read_at=datetime.utcnow())
    )
    await db.execute(stmt)
    await db.commit()
    
    return MessageResponse(message="All notifications marked as read")


@router.delete("/{notification_id}", response_model=MessageResponse)
async def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a specific notification."""
    query = select(Notification).where(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    )
    result = await db.execute(query)
    notification = result.scalar_one_or_none()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    await db.delete(notification)
    await db.commit()
    
    return MessageResponse(message="Notification deleted")


@router.delete("/clear-all", response_model=MessageResponse)
async def clear_all_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete all notifications for the current user."""
    stmt = delete(Notification).where(Notification.user_id == current_user.id)
    await db.execute(stmt)
    await db.commit()
    
    return MessageResponse(message="All notifications cleared")
