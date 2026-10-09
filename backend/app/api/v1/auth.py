from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.core.security import verify_password, get_password_hash, create_access_token, generate_csrf_token
from backend.app.core.dependencies import get_current_user
from backend.app.core.audit import log_audit_event
from backend.app.models.models import User
from backend.app.schemas.schemas import UserRegister, UserLogin, UserOut

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.get("/csrf")
def get_csrf_token(response: Response):
    token = generate_csrf_token()
    response.set_cookie(
        key=settings.CSRF_COOKIE_NAME,
        value=token,
        httponly=False,  # Accessible to JavaScript for reading and placing in X-CSRF-Token header
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.COOKIE_SECURE
    )
    return {"csrf_token": token}


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserRegister, request: Request, db: Session = Depends(get_db)):
    # Check duplicate username or email
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already registered.")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered.")

    new_user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        role="CITIZEN",
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    log_audit_event(
        db=db,
        actor=new_user,
        action="USER_REGISTRATION",
        resource_type="user",
        resource_id=str(new_user.id),
        result="SUCCESS",
        ip_address=request.client.host if request.client else None
    )

    return new_user


@router.post("/login", response_model=UserOut)
def login_user(payload: UserLogin, request: Request, response: Response, db: Session = Depends(get_db)):
    # Find user by username or email
    user = db.query(User).filter(
        (User.username == payload.username_or_email) | (User.email == payload.username_or_email)
    ).first()

    ip = request.client.host if request.client else None

    if not user or not verify_password(payload.password, user.hashed_password):
        log_audit_event(
            db=db,
            actor=user,
            action="LOGIN_ATTEMPT",
            resource_type="user",
            resource_id=payload.username_or_email,
            result="DENIED",
            ip_address=ip
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password.")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is deactivated.")

    # Create JWT
    token = create_access_token(subject=user.id, role=user.role)
    csrf_token = generate_csrf_token()

    # Set HTTP-only SameSite auth cookie
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        httponly=True,
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.COOKIE_SECURE,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

    # Set CSRF cookie
    response.set_cookie(
        key=settings.CSRF_COOKIE_NAME,
        value=csrf_token,
        httponly=False,
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.COOKIE_SECURE,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

    log_audit_event(
        db=db,
        actor=user,
        action="LOGIN_SUCCESS",
        resource_type="user",
        resource_id=str(user.id),
        result="SUCCESS",
        ip_address=ip
    )

    return user


@router.post("/logout")
def logout_user(request: Request, response: Response, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    response.delete_cookie(settings.COOKIE_NAME)
    response.delete_cookie(settings.CSRF_COOKIE_NAME)

    log_audit_event(
        db=db,
        actor=current_user,
        action="LOGOUT",
        resource_type="user",
        resource_id=str(current_user.id),
        result="SUCCESS",
        ip_address=request.client.host if request.client else None
    )
    return {"message": "Successfully logged out."}


@router.get("/me", response_model=UserOut)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user
