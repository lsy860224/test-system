from pydantic import BaseModel

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    name: str
    role: str

class UserOut(BaseModel):
    id: int
    username: str
    name: str
    role: str
    is_active: bool

    model_config = {"from_attributes": True}
