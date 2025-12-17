from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, appointments, prescriptions, ehr, reviews, config, notifications
from app.api.v1 import doctors, admin, uploads, ai
from app.payments import payment_router

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(doctors.router, prefix="/doctors", tags=["doctors"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(uploads.router, prefix="/uploads", tags=["uploads"])
api_router.include_router(ai.router)
api_router.include_router(appointments.router)
api_router.include_router(prescriptions.router)
api_router.include_router(ehr.router)
api_router.include_router(reviews.router)
api_router.include_router(config.router)
api_router.include_router(notifications.router)
api_router.include_router(payment_router, tags=["payments"])
