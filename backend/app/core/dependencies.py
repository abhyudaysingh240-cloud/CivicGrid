from typing import Optional, List
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.core.security import decode_access_token
from backend.app.models.models import User

async def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    """
    Extracts JWT from HTTP-only cookie, or fallback Authorization Bearer header.
    Validates token and returns authenticated active User.
    """
    token: Optional[str] = request.cookies.get(settings.COOKIE_NAME)
    
    # Optional fallback to Bearer token for programmatic API clients or tests
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Session cookie missing.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user_id = payload["sub"]
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account associated with token not found.",
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated.",
        )
        
    return user


async def get_optional_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Extracts JWT from HTTP-only cookie, or fallback Authorization Bearer header if present.
    Returns User if valid session exists, otherwise None (allowing guest operations).
    """
    token: Optional[str] = request.cookies.get(settings.COOKIE_NAME)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            
    if not token:
        return None
        
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        return None
        
    try:
        user_id = int(payload["sub"])
    except (ValueError, TypeError):
        return None

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        return None
        
    return user


def require_role(*allowed_roles: str):
    """
    Server-side Role-Based Access Control (RBAC) dependency guard.
    Roles: CITIZEN, FIELD_WORKER, DEPARTMENT_OFFICER, ADMIN
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires role in {allowed_roles}, but user has role '{current_user.role}'.",
            )
        return current_user
    return role_checker


async def verify_csrf(request: Request):
    """
    CSRF verification for state-changing requests when session cookie is used.
    Compares 'X-CSRF-Token' header against 'civicgrid_csrf_token' cookie.
    """
    if request.method in ["POST", "PUT", "PATCH", "DELETE"]:
        session_cookie = request.cookies.get(settings.COOKIE_NAME)
        # If user is using cookie auth, enforce CSRF header
        if session_cookie:
            csrf_cookie = request.cookies.get(settings.CSRF_COOKIE_NAME)
            csrf_header = request.headers.get("X-CSRF-Token")
            if not csrf_header or not csrf_cookie or csrf_header != csrf_cookie:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="CSRF validation failed: missing or mismatched CSRF token.",
                )
    return True
