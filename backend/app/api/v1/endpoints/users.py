from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.api.deps import get_current_user
from app.services.user_service import UserService
from app.models import User
from app.schemas import UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse, summary="Get current user")
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    """Get current authenticated user's profile."""
    return current_user


@router.put("/me", response_model=UserResponse, summary="Update current user")
async def update_current_user_profile(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update current authenticated user's profile."""
    user_service = UserService(db)
    updated_user = await user_service.update_user(current_user.id, user_data)
    
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    return updated_user


@router.delete("/me", summary="Deactivate current user")
async def deactivate_current_user(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Deactivate current user's account."""
    user_service = UserService(db)
    await user_service.deactivate_user(current_user.id)
    return {"message": "Account deactivated successfully"}


@router.get("/{user_id}", response_model=UserResponse, summary="Get user by ID")
async def get_user_by_id(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user by ID (admin only or self)."""
    # Allow users to view their own profile or admins to view any
    if current_user.id != user_id and current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this user",
        )
    
    user_service = UserService(db)
    user = await user_service.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    return user
