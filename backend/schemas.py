from pydantic import BaseModel, HttpUrl
from datetime import datetime
from typing import Optional

class LinkCreate(BaseModel):
    original_url: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    expire_at: Optional[datetime] = None
    max_clicks: Optional[int] = None

class LinkUpdate(BaseModel):
    original_url: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    expire_at: Optional[datetime] = None
    max_clicks: Optional[int] = None

class LinkResponse(BaseModel):
    id: int
    short_code: str
    original_url: Optional[str]
    title: Optional[str]
    description: Optional[str]
    expire_at: Optional[datetime]
    click_count: int
    max_clicks: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TemplateCreate(BaseModel):
    name: str
    title: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None

class TemplateResponse(BaseModel):
    id: int
    name: str
    title: Optional[str]
    description: Optional[str]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
