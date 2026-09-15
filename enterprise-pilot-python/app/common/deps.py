from fastapi import Header


async def optional_authorization(authorization: str | None = Header(default=None)) -> str | None:
    return authorization
