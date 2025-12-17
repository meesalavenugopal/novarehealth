# M-Pesa Payment Gateway Module (Mozambique - Vodacom)

A standalone, pluggable payment gateway module for M-Pesa Mozambique (Vodacom) integration with comprehensive logging, auditing, and error handling.

## 🌍 Provider Information

This module is configured for **M-Pesa Mozambique (Vodacom)**, not the Kenya Safaricom version.

| Property | Value |
|----------|-------|
| **Country** | Mozambique |
| **Provider** | Vodacom M-Pesa |
| **Currency** | MZN (Mozambican Metical) |
| **Phone Format** | 258XXXXXXXXX |
| **API Sandbox** | api.sandbox.vm.co.mz |
| **API Production** | api.vm.co.mz |

## 🎯 Features

- **Standalone Module**: Copy and paste into any FastAPI/SQLAlchemy project
- **M-Pesa Mozambique Integration**: C2B Single Stage, B2C, Reversal, and transaction queries
- **Comprehensive Logging**: File-based and structured logging for debugging
- **Complete Audit Trail**: Database-level logging of all operations
- **Error Handling**: Custom exceptions with M-Pesa error code mapping (INS-0, INS-5, etc.)
- **Idempotency Support**: Prevent duplicate payments
- **Webhook Logging**: Store all callbacks for debugging and replay

## 📁 Module Structure

```
payments/
├── __init__.py          # Module entry point with exports
├── config.py            # Configuration settings
├── models.py            # SQLAlchemy database models
├── schemas.py           # Pydantic request/response schemas
├── service.py           # Main payment service (M-Pesa Mozambique API)
├── router.py            # FastAPI routes
├── logger.py            # Logging system
├── exceptions.py        # Custom exception classes
├── migrations/
│   └── payment_001_create_tables.py  # Database migration
└── README.md            # This documentation
```

## 🚀 Quick Start

### 1. Copy the Module

Copy the entire `payments/` directory to your project's app folder:

```bash
cp -r payments/ /path/to/your/project/app/payments/
```

### 2. Install Dependencies

Add these to your `requirements.txt`:

```txt
httpx>=0.25.0
pydantic>=2.0.0
sqlalchemy>=2.0.0
python-dotenv>=1.0.0
```

### 3. Environment Variables

Add to your `.env` file:

```env
# M-Pesa Mozambique (Vodacom) Configuration
MPESA_ENVIRONMENT=sandbox  # sandbox or production
MPESA_API_KEY=your_api_key_from_vodacom_developer_portal
MPESA_PUBLIC_KEY=your_public_key_for_production
MPESA_SERVICE_PROVIDER_CODE=171717  # Your service provider code

# Callback URLs (must be publicly accessible)
MPESA_CALLBACK_URL=https://yourdomain.com/api/payments/callback/c2b

# Payment Settings
PAYMENT_DEFAULT_CURRENCY=MZN
PAYMENT_REQUEST_TIMEOUT=30
PAYMENT_MAX_AMOUNT=150000
PAYMENT_MIN_AMOUNT=1
```

### 4. Run Database Migration

Using Alembic:

```bash
# Copy migration file to your alembic versions folder
cp payments/migrations/payment_001_create_tables.py alembic/versions/

# Run migration
alembic upgrade head
```

### 5. Register Routes

In your `main.py`:

```python
from fastapi import FastAPI
from app.payments import payment_router

app = FastAPI()

# Register payment routes
app.include_router(payment_router, prefix="/api")
```

### 6. Update Database Session Dependency

In `router.py`, update the `get_db` function to use your database session:

```python
def get_db():
    from app.core.database import SessionLocal  # Your database module
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

## 📖 API Reference

### Initiate Payment (C2B Single Stage)

```http
POST /api/payments/initiate
Content-Type: application/json

{
    "phone_number": "258843330333",
    "amount": 100.00,
    "account_reference": "ORDER-12345",
    "description": "Payment for order",
    "entity_type": "order",
    "entity_id": "12345",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "idempotency_key": "unique-key-123"
}
```

**Response (Success - INS-0):**
```json
{
    "success": true,
    "transaction_id": "TXN-20250115123456-ABC12345",
    "provider_transaction_id": "dnn79p23ixb4",
    "conversation_id": "72998c61c435443db7037c4472af549e",
    "third_party_reference": "ORDER-12345",
    "status": "completed",
    "message": "Payment processed successfully",
    "phone_number": "258843330333",
    "amount": 100.00,
    "currency": "MZN",
    "response_code": "INS-0",
    "response_description": "Request processed successfully",
    "created_at": "2025-01-15T12:34:56.000Z"
}
```

### Get Payment Status

```http
GET /api/payments/status/{transaction_id}
```

**Response:**
```json
{
    "transaction_id": "TXN-20250115123456-ABC12345",
    "provider_transaction_id": "dnn79p23ixb4",
    "status": "completed",
    "status_description": "Payment completed successfully",
    "amount": 100.00,
    "currency": "MZN",
    "phone_number": "258843330333",
    "created_at": "2025-01-15T12:34:56.000Z",
    "completed_at": "2025-01-15T12:35:30.000Z"
}
```

### List Payments

```http
GET /api/payments/?status=completed&page=1&per_page=20
```

### Get Payment Summary

```http
GET /api/payments/summary?from_date=2025-01-01&to_date=2025-01-31
```

### Get Audit Logs

```http
GET /api/payments/audit/{transaction_id}
```

### Health Check

```http
GET /api/payments/health
```

## 🔧 Integration Examples

### With Appointment Booking

```python
from app.payments import PaymentService, PaymentInitiateRequest
from sqlalchemy.orm import Session

async def book_appointment_with_payment(
    db: Session,
    appointment_id: str,
    patient_phone: str,
    amount: float
):
    payment_service = PaymentService()
    
    request = PaymentInitiateRequest(
        phone_number=patient_phone,  # Format: 258XXXXXXXXX
        amount=amount,
        account_reference=f"APT-{appointment_id}",
        description="Appointment booking fee",
        entity_type="appointment",
        entity_id=appointment_id
    )
    
    response = await payment_service.initiate_payment(
        request=request,
        db=db,
        user_id="patient-123"
    )
    
    return response
```

### Processing Callbacks

The module automatically handles callbacks at:
- `/api/payments/callback/c2b` - C2B payment results (Mozambique)

### Custom Event Handling

Subscribe to payment events:

```python
from app.payments import PaymentService

class MyPaymentService(PaymentService):
    async def on_payment_completed(self, transaction):
        # Send confirmation email
        await send_payment_confirmation(
            email=transaction.customer_email,
            transaction_id=transaction.transaction_id,
            amount=transaction.amount
        )
        
    async def on_payment_failed(self, transaction, error):
        # Notify customer
        await send_payment_failure_notification(
            phone=transaction.phone_number,
            reason=error
        )
```

## 📊 Logging

### Log Locations

- **File Logs**: `logs/payment_<date>.log`
- **Database Audit**: `payment_audit_logs` table
- **Webhook Logs**: `payment_webhook_logs` table

### Log Levels

```python
from app.payments import payment_logger

# Different log levels
payment_logger.debug("Detailed debug info")
payment_logger.info("General information")
payment_logger.warning("Warning message")
payment_logger.error("Error occurred")
payment_logger.critical("Critical failure")
```

### Log Examples

```
2025-01-15 12:34:56 - PAYMENT - INFO - Payment initiated | transaction_id=TXN-123 | phone=2588412***** | amount=100.00
2025-01-15 12:34:57 - PAYMENT - INFO - API Request: POST https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest
2025-01-15 12:34:58 - PAYMENT - INFO - API Response: 200 (1234ms)
2025-01-15 12:35:30 - PAYMENT - INFO - Payment completed | transaction_id=TXN-123 | mpesa_receipt=QH123456789
```

## 🛡️ Error Handling

### Custom Exceptions

```python
from app.payments.exceptions import (
    PaymentInitiationError,
    PaymentNotFoundError,
    InsufficientFundsError,
    PaymentProviderError
)

try:
    response = await payment_service.initiate_stk_push(request, db)
except InsufficientFundsError as e:
    # Handle insufficient funds
    return {"error": e.message, "code": e.error_code}
except PaymentProviderError as e:
    # Handle M-Pesa errors
    return {"error": e.message, "provider_code": e.details.get("provider_code")}
```

### M-Pesa Error Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1 | Insufficient funds |
| 1019 | Transaction expired |
| 1032 | Request cancelled by user |
| 2001 | Wrong PIN entered |
| 17 | Transaction limit exceeded |

## 🔐 Security

- All sensitive data is automatically sanitized in logs
- API credentials are never logged
- Phone numbers are masked in logs (2588412*****)
- Passwords and tokens are replaced with ***

## 📈 Monitoring

### Key Metrics to Monitor

1. **Transaction Success Rate**
   ```sql
   SELECT 
     status,
     COUNT(*) as count
   FROM payment_transactions
   WHERE created_at >= NOW() - INTERVAL '24 hours'
   GROUP BY status;
   ```

2. **Average Response Time**
   ```sql
   SELECT 
     AVG(response_time_ms) as avg_response_time
   FROM payment_audit_logs
   WHERE action = 'api_response'
     AND created_at >= NOW() - INTERVAL '1 hour';
   ```

3. **Failed Webhooks**
   ```sql
   SELECT *
   FROM payment_webhook_logs
   WHERE is_processed = false
     AND received_at >= NOW() - INTERVAL '1 hour';
   ```

## 🧪 Testing

### Test with Sandbox

1. Set `MPESA_ENVIRONMENT=sandbox`
2. Use test credentials from Vodacom M-Pesa Developer Portal (developer.mpesa.vm.co.mz)
3. Use your API key from the portal

### M-Pesa Mozambique Response Codes

| Code | Description | Action |
|------|-------------|--------|
| INS-0 | Request processed successfully | Success |
| INS-1 | Internal error | Retry later |
| INS-2 | Invalid API key | Check credentials |
| INS-4 | User has not accepted T&C | User must accept terms |
| INS-5 | Transaction cancelled by user | User declined |
| INS-6 | Transaction failed | Generic failure |
| INS-9 | Request timeout | Retry |
| INS-10 | Duplicate transaction | Check idempotency |
| INS-13 | Invalid shortcode | Check service provider code |
| INS-14 | Invalid reference | Check account reference |
| INS-15 | Invalid amount | Check amount range |
| INS-16 | Unable to determine receiver | Check phone number |
| INS-17 | Invalid transaction reference | Check format |
| INS-18 | Transaction not found | Transaction doesn't exist |
| INS-19 | Account inactive | Customer account inactive |
| INS-20 | Insufficient balance | Insufficient funds |
| INS-21 | Invalid request type | Check API endpoint |
| INS-22 | Invalid transaction status | Wrong state for operation |
| INS-23 | Invalid security credential | Check public key |
| INS-24 | Receiver already exists | Duplicate registration |
| INS-25 | IP whitelist error | Contact Vodacom |
| INS-26 | Service unavailable | M-Pesa maintenance |
| INS-27 | Rate limit exceeded | Slow down requests |
| INS-997 | Invalid authorization | Check Bearer token |
| INS-998 | Token expired | Refresh authentication |
| INS-999 | Invalid token | Re-authenticate |

## 📝 Database Schema

### payment_transactions

| Column | Type | Description |
|--------|------|-------------|
| id | Integer | Primary key |
| transaction_id | String(64) | Unique internal ID |
| conversation_id | String(100) | M-Pesa conversation ID |
| provider_transaction_id | String(100) | M-Pesa transaction ID |
| status | Enum | pending, processing, completed, failed, etc. |
| amount | Decimal(12,2) | Transaction amount in MZN |
| phone_number | String(20) | Customer phone (258XXXXXXXXX) |
| entity_type | String(50) | Linked entity type (e.g., 'appointment') |
| entity_id | String(50) | Linked entity ID |

### payment_audit_logs

| Column | Type | Description |
|--------|------|-------------|
| id | Integer | Primary key |
| transaction_id | Integer | FK to transactions |
| action | Enum | Action type (initiated, completed, etc.) |
| request_body | JSON | API request body |
| response_body | JSON | API response body |
| error_message | Text | Error details if failed |

## 🔄 Version History

- **v1.1.0** - Updated for M-Pesa Mozambique (Vodacom) C2B Single Stage API
- **v1.0.0** - Initial release with M-Pesa Kenya STK Push

## � To Use in Another Project

1. **Copy the `payments/` folder** to your project's app directory
2. **Add environment variables** from `.env.example` to your `.env` file
3. **Run the database migration** to create payment tables
4. **Include router** in your FastAPI app:
   ```python
   app.include_router(payment_router, prefix="/api")
   ```

## �📞 Support

For issues or questions:
1. Check the logs in `logs/payment_*.log`
2. Review audit logs in `payment_audit_logs` table
3. Check webhook logs for callback issues

## 📄 License

This module is part of the NovareHealth project.
