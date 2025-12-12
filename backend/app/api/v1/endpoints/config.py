"""
Feature Flags & App Configuration API

Provides feature flags and app configuration settings that can be
controlled from the backend to enable/disable features dynamically.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict

router = APIRouter(prefix="/config", tags=["Configuration"])


class FeatureFlags(BaseModel):
    """Feature flags for the application."""
    settings_enabled: bool = False           # Settings page
    prescriptions_enabled: bool = True       # Prescriptions feature
    health_records_enabled: bool = True      # Health records feature
    help_support_enabled: bool = True        # Help & Support page
    ai_chat_enabled: bool = True             # AI Chat widget
    video_consult_enabled: bool = True       # Video consultation feature
    reviews_enabled: bool = True             # Reviews feature


class AppConfig(BaseModel):
    """Application configuration."""
    feature_flags: FeatureFlags
    app_version: str = "1.0.0"
    maintenance_mode: bool = False
    maintenance_message: str = ""


# Default feature flags - can be moved to database/env vars later
DEFAULT_FEATURE_FLAGS = FeatureFlags(
    settings_enabled=False,      # Hide settings for now
    prescriptions_enabled=True,
    health_records_enabled=True,
    help_support_enabled=True,
    ai_chat_enabled=True,
    video_consult_enabled=True,
    reviews_enabled=True,
)


@router.get("/feature-flags", response_model=FeatureFlags)
async def get_feature_flags() -> FeatureFlags:
    """
    Get current feature flags.
    
    Returns which features are enabled/disabled in the application.
    Frontend should use these flags to show/hide UI elements.
    """
    return DEFAULT_FEATURE_FLAGS


@router.get("/app-config", response_model=AppConfig)
async def get_app_config() -> AppConfig:
    """
    Get full application configuration including feature flags.
    
    Returns app version, maintenance mode status, and feature flags.
    """
    return AppConfig(
        feature_flags=DEFAULT_FEATURE_FLAGS,
        app_version="1.0.0",
        maintenance_mode=False,
        maintenance_message="",
    )
