from typing import Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    code: int = 200
    message: str = "success"
    data: T | None = None


def ok(data: T | None = None) -> ApiResponse[T]:
    return ApiResponse(data=data)
