"""
Create M-Pesa Mozambique payment tables

This migration creates the tables for the M-Pesa Mozambique payment gateway:
- payment_transactions: Main transaction records
- payment_audit_logs: Audit trail for all operations
- payment_webhook_logs: Webhook/callback logs

Revision ID: payment_001
Revises: 
Create Date: 2025-01-15 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'payment_001'
down_revision = None  # Update this to your last migration
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum types for M-Pesa Mozambique only
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE payment_status_enum AS ENUM (
                'pending', 'processing', 'completed', 'failed', 'cancelled', 'expired'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE payment_type_enum AS ENUM ('c2b');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE payment_provider_enum AS ENUM ('mpesa_mozambique');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE audit_action_enum AS ENUM (
                'payment_initiated', 'payment_submitted', 'payment_callback_received',
                'payment_status_updated', 'payment_completed', 'payment_failed',
                'payment_cancelled', 'api_request', 'api_response', 'api_error',
                'webhook_received', 'validation_error', 'system_error'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    # Create payment_transactions table
    op.create_table(
        'payment_transactions',
        # Primary Key (UUID)
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        
        # Transaction Identifiers
        sa.Column('transaction_id', sa.String(100), nullable=False, unique=True, index=True),
        
        # M-Pesa Mozambique (Vodacom) fields
        sa.Column('conversation_id', sa.String(100), nullable=True, index=True),
        sa.Column('third_party_reference', sa.String(100), nullable=True, index=True),
        sa.Column('provider_transaction_id', sa.String(100), nullable=True, index=True),
        
        # Transaction Details
        sa.Column('payment_type', postgresql.ENUM('c2b', name='payment_type_enum', create_type=False), nullable=False, server_default='c2b'),
        sa.Column('payment_provider', postgresql.ENUM('mpesa_mozambique', name='payment_provider_enum', create_type=False), nullable=False, server_default='mpesa_mozambique'),
        sa.Column('status', postgresql.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'expired', name='payment_status_enum', create_type=False), nullable=False, server_default='pending', index=True),
        
        # Financial Details (MZN only)
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, server_default='MZN'),
        sa.Column('fees', sa.Numeric(12, 2), nullable=True, server_default='0'),
        sa.Column('net_amount', sa.Numeric(12, 2), nullable=True),
        
        # Customer Details
        sa.Column('phone_number', sa.String(20), nullable=False, index=True),
        sa.Column('customer_name', sa.String(200), nullable=True),
        sa.Column('customer_email', sa.String(255), nullable=True),
        
        # Business Details
        sa.Column('account_reference', sa.String(100), nullable=True),
        sa.Column('description', sa.String(500), nullable=True),
        
        # Entity linking
        sa.Column('entity_type', sa.String(50), nullable=True),
        sa.Column('entity_id', sa.String(100), nullable=True),
        
        # User tracking
        sa.Column('user_id', sa.String(100), nullable=True, index=True),
        
        # Provider Response (sync response)
        sa.Column('provider_response_code', sa.String(20), nullable=True),
        sa.Column('provider_response_description', sa.Text(), nullable=True),
        sa.Column('provider_raw_response', postgresql.JSON(), nullable=True),
        
        # Callback Data (async response)
        sa.Column('callback_received_at', sa.DateTime(), nullable=True),
        sa.Column('callback_raw_data', postgresql.JSON(), nullable=True),
        
        # Idempotency
        sa.Column('idempotency_key', sa.String(100), nullable=True, unique=True, index=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        
        # Soft Delete
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
    )
    
    # Create composite indexes
    op.create_index('idx_payment_status_created', 'payment_transactions', ['status', 'created_at'])
    op.create_index('idx_payment_user_status', 'payment_transactions', ['user_id', 'status'])
    op.create_index('idx_payment_entity', 'payment_transactions', ['entity_type', 'entity_id'])
    op.create_index('idx_payment_phone_status', 'payment_transactions', ['phone_number', 'status'])
    
    # Create payment_audit_logs table
    op.create_table(
        'payment_audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('transaction_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('payment_transactions.id', ondelete='SET NULL'), nullable=True, index=True),
        
        sa.Column('action', postgresql.ENUM(
            'payment_initiated', 'payment_submitted', 'payment_callback_received',
            'payment_status_updated', 'payment_completed', 'payment_failed',
            'payment_cancelled', 'api_request', 'api_response', 'api_error',
            'webhook_received', 'validation_error', 'system_error',
            name='audit_action_enum', create_type=False
        ), nullable=False, index=True),
        sa.Column('description', sa.Text(), nullable=True),
        
        # Request/Response Details
        sa.Column('request_url', sa.String(500), nullable=True),
        sa.Column('request_method', sa.String(10), nullable=True),
        sa.Column('request_headers', postgresql.JSON(), nullable=True),
        sa.Column('request_body', postgresql.JSON(), nullable=True),
        
        sa.Column('response_status_code', sa.Integer(), nullable=True),
        sa.Column('response_headers', postgresql.JSON(), nullable=True),
        sa.Column('response_body', postgresql.JSON(), nullable=True),
        sa.Column('response_time_ms', sa.Integer(), nullable=True),
        
        # Error Details
        sa.Column('error_type', sa.String(100), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('error_stack_trace', sa.Text(), nullable=True),
        
        # Context
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('user_id', sa.String(100), nullable=True),
        sa.Column('extra_data', postgresql.JSON(), nullable=True),
        
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), index=True),
    )
    
    op.create_index('idx_audit_transaction_action', 'payment_audit_logs', ['transaction_id', 'action'])
    op.create_index('idx_audit_created_at', 'payment_audit_logs', ['created_at'])
    
    # Create payment_webhook_logs table
    op.create_table(
        'payment_webhook_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        
        sa.Column('provider', postgresql.ENUM('mpesa_mozambique', name='payment_provider_enum', create_type=False), nullable=False, server_default='mpesa_mozambique'),
        sa.Column('webhook_type', sa.String(50), nullable=True),
        
        sa.Column('request_headers', postgresql.JSON(), nullable=True),
        sa.Column('request_body', postgresql.JSON(), nullable=True),
        sa.Column('raw_body', sa.Text(), nullable=True),
        
        sa.Column('is_processed', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('processed_at', sa.DateTime(), nullable=True),
        sa.Column('processing_error', sa.Text(), nullable=True),
        
        sa.Column('transaction_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('payment_transactions.id', ondelete='SET NULL'), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('received_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), index=True),
    )


def downgrade() -> None:
    op.drop_table('payment_webhook_logs')
    op.drop_table('payment_audit_logs')
    op.drop_table('payment_transactions')
    
    op.execute('DROP TYPE IF EXISTS audit_action_enum')
    op.execute('DROP TYPE IF EXISTS payment_provider_enum')
    op.execute('DROP TYPE IF EXISTS payment_type_enum')
    op.execute('DROP TYPE IF EXISTS payment_status_enum')
