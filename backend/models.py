from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean
from datetime import datetime
from .database import Base

class Link(Base):
    __tablename__ = "links"

    id = Column(Integer, primary_key=True, index=True)
    short_code = Column(String(50), unique=True, index=True, nullable=False)
    original_url = Column(Text, nullable=True)
    title = Column(String(200))
    description = Column(Text)
    expire_at = Column(DateTime, nullable=True)
    click_count = Column(Integer, default=0)
    max_clicks = Column(Integer, nullable=True, default=None)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Template(Base):
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    title = Column(String(200))
    description = Column(Text)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
