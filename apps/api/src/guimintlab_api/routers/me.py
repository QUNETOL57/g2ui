from fastapi import APIRouter, Depends

from ..auth import CurrentUser, get_current_user

router = APIRouter(tags=["me"])


@router.get("/me")
def me(user: CurrentUser = Depends(get_current_user)) -> dict[str, str | None]:
    return {"id": user.id, "email": user.email, "role": user.role}
