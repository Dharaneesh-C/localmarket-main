from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
import bcrypt

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from firebase_db import get_db
from config import settings


# OAuth2 endpoint used by Swagger UI.
# IMPORTANT:
# This endpoint accepts form data, not JSON.
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/token",
    auto_error=False,
)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(
        plain.encode("utf-8"),
        hashed.encode("utf-8")
    )


def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None
):
    to_encode = data.copy()

    expire = datetime.utcnow() + (
        expires_delta
        or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    to_encode.update({"exp": expire})

    return jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )


async def get_current_user(
    token: str = Depends(oauth2_scheme)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not token:
        raise credentials_exception

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )

        user_id: str = payload.get("sub")

        if user_id is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    db = get_db()

    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Database is not initialized. "
                "Please check Firebase credentials."
            ),
        )

    user_doc = (
        db.collection("users")
        .document(user_id)
        .get()
    )

    if not user_doc.exists:
        raise credentials_exception

    return user_doc.to_dict()


async def require_merchant(
    current_user=Depends(get_current_user)
):
    if current_user.get("role") != "merchant":
        raise HTTPException(
            status_code=403,
            detail="Only merchants can perform this action"
        )

    return current_user


async def require_buyer(
    current_user=Depends(get_current_user)
):
    if current_user.get("role") != "buyer":
        raise HTTPException(
            status_code=403,
            detail="Only buyers can perform this action"
        )

    return current_user