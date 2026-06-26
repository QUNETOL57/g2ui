import uuid
from typing import Annotated

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select, update

from ..auth import (
    CurrentUserDep,
    DbDep,
    create_access_token,
    get_user_by_email,
    hash_password,
    normalize_email,
    verify_password,
)
from ..models import Canvas, User
from ..schemas.auth import ChangePasswordRequest, LoginRequest, RegisterRequest, TokenResponse, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])
SINGLE_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: DbDep) -> TokenResponse:
    email = await normalize_email(str(body.email))
    existing = await get_user_by_email(db, email)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(email=email, password_hash=hash_password(body.password))
    db.add(user)
    await db.flush()

    user_count = await db.scalar(select(func.count()).select_from(User))
    if user_count == 1:
        await db.execute(
            update(Canvas)
            .where(Canvas.owner_id == SINGLE_USER_ID)
            .values(owner_id=user.id)
        )

    await db.refresh(user)
    return TokenResponse(access_token=create_access_token(user.id))


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: DbDep) -> TokenResponse:
    user = await get_user_by_email(db, str(body.email))
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    return TokenResponse(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserRead)
async def me(current_user: CurrentUserDep) -> User:
    return current_user


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    body: ChangePasswordRequest,
    db: DbDep,
    current_user: CurrentUserDep,
) -> None:
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    current_user.password_hash = hash_password(body.new_password)
    await db.flush()
