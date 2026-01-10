"""
Authentication API Routes - Login, Logout, Token Refresh, Password Reset
"""
from fastapi import APIRouter, HTTPException, Depends, Request, Form
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from typing import Optional
import logging
import secrets

from app.models.auth import (
    LoginRequest, Token, TokenRefreshRequest,
    PasswordResetRequest, PasswordResetConfirm
)
from app.models.common import APIResponse
from app.core.security import (
    verify_password, get_password_hash,
    create_access_token, create_refresh_token, decode_token,
    get_current_user
)
from app.core.config import settings
from app.db.database import get_db
from app.db.models import User, Session as UserSession, PasswordResetToken, LoginAuditLog

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/login", response_model=Token)
async def login(
    request: Request,
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """Authenticate user and return tokens"""
    # Get client info
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    
    # OAuth2 uses 'username' field for email
    email = form_data.username
    password = form_data.password
    
    # Find user by email
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        # Log failed attempt
        db.add(LoginAuditLog(
            email=email,
            action="login_failed",
            ip_address=client_ip,
            user_agent=user_agent
        ))
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password
    if not verify_password(password, user.password_hash):
        db.add(LoginAuditLog(
            user_id=user.id,
            email=email,
            action="login_failed",
            ip_address=client_ip,
            user_agent=user_agent
        ))
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")
    
    # Create tokens with entity context for RBAC
    token_data = {
        "user_id": user.id,
        "sub": user.email,
        "role": user.role.value if user.role else "user",
        "warehouse_id": user.assigned_warehouse_id,  # Entity scope
        "shop_id": user.assigned_shop_id,            # Entity scope
    }
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    # Store session
    session = UserSession(
        user_id=user.id,
        refresh_token=refresh_token,
        device_info=user_agent[:255] if user_agent else None,
        ip_address=client_ip,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(session)
    
    # Update last login
    user.last_login = datetime.utcnow()
    
    # Log successful login
    db.add(LoginAuditLog(
        user_id=user.id,
        email=user.email,
        action="login_success",
        ip_address=client_ip,
        user_agent=user_agent
    ))
    
    db.commit()
    
    logger.info(f"User {user.email} logged in successfully")
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.post("/refresh", response_model=Token)
async def refresh_token(
    token_request: TokenRefreshRequest,
    db: Session = Depends(get_db)
):
    """Refresh access token using refresh token"""
    try:
        # Decode refresh token
        payload = decode_token(token_request.refresh_token)
        
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        
        # Verify session exists
        session = db.query(UserSession).filter(
            UserSession.user_id == user_id,
            UserSession.refresh_token == token_request.refresh_token
        ).first()
        
        if not session:
            raise HTTPException(status_code=401, detail="Session not found or expired")
        
        # Check if session is expired
        if session.expires_at < datetime.utcnow():
            db.delete(session)
            db.commit()
            raise HTTPException(status_code=401, detail="Session expired")
        
        # Get user
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="User not found or inactive")
        
        # Create new tokens
        token_data = {
            "user_id": user.id,
            "sub": user.email,
            "role": user.role.value if user.role else "user"
        }
        new_access_token = create_access_token(token_data)
        new_refresh_token = create_refresh_token(token_data)
        
        # Update session with new refresh token
        session.refresh_token = new_refresh_token
        session.expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        db.commit()
        
        return Token(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@router.post("/logout")
async def logout(
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Logout user and invalidate session"""
    user_id = current_user["user_id"]
    
    # Get authorization header to find the current session
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        # Delete all sessions for this user (you could also delete just the current one)
        db.query(UserSession).filter(UserSession.user_id == user_id).delete()
        
        # Log logout
        db.add(LoginAuditLog(
            user_id=user_id,
            email=current_user.get("email", ""),
            action="logout",
            ip_address=request.client.host if request.client else "unknown"
        ))
        db.commit()
    
    return APIResponse(message="Logged out successfully")


@router.get("/me")
async def get_current_user_info(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get current authenticated user info with entity scope"""
    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "phone": user.phone,
        "role": user.role.value if user.role else None,
        "is_active": user.is_active,
        "email_verified": user.email_verified,
        "last_login": user.last_login,
        "created_at": user.created_at,
        # Entity scope for RBAC
        "warehouse_id": user.assigned_warehouse_id,
        "shop_id": user.assigned_shop_id,
    }


@router.post("/forgot-password")
async def forgot_password(
    request_data: PasswordResetRequest,
    db: Session = Depends(get_db)
):
    """Request password reset - sends reset token"""
    # Find user
    user = db.query(User).filter(User.email == request_data.email).first()
    
    # Always return success to prevent email enumeration
    if not user:
        return APIResponse(message="If the email exists, a password reset link will be sent")
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    
    # Delete any existing reset tokens for this user
    db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).delete()
    
    # Create new reset token (valid for 1 hour)
    password_reset = PasswordResetToken(
        user_id=user.id,
        token=reset_token,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1)
    )
    db.add(password_reset)
    db.commit()
    
    # TODO: Send email with reset link
    # For now, just log it (in production, integrate with email service)
    logger.info(f"Password reset token generated for {user.email}: {reset_token}")
    
    return APIResponse(message="If the email exists, a password reset link will be sent")


@router.post("/reset-password")
async def reset_password(
    reset_data: PasswordResetConfirm,
    db: Session = Depends(get_db)
):
    """Reset password using token"""
    # Find reset token
    reset_record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == reset_data.token,
        PasswordResetToken.used == False
    ).first()
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Check if token is expired
    if reset_record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    # Get user
    user = db.query(User).filter(User.id == reset_record.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
    
    # Update password
    user.password_hash = get_password_hash(reset_data.new_password)
    
    # Mark token as used
    reset_record.used = True
    
    # Invalidate all sessions (force re-login)
    db.query(UserSession).filter(UserSession.user_id == user.id).delete()
    
    db.commit()
    
    logger.info(f"Password reset successful for {user.email}")
    
    return APIResponse(message="Password reset successfully. Please login with your new password.")


@router.post("/change-password")
async def change_password(
    current_password: str,
    new_password: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Change password for authenticated user"""
    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify current password
    if not verify_password(current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Update password
    user.password_hash = get_password_hash(new_password)
    db.commit()
    
    return APIResponse(message="Password changed successfully")
