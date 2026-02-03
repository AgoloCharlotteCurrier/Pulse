import datetime as dt

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    picture = Column(String, default="")
    created_at = Column(DateTime, default=lambda: dt.datetime.now(dt.timezone.utc))

    runs = relationship("Run", back_populates="user")


class Run(Base):
    __tablename__ = "runs"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    topic = Column(String, nullable=False)
    days_back = Column(Integer, nullable=False, default=30)
    sources = Column(String, nullable=False, default="auto")
    depth = Column(String, nullable=False, default="default")
    status = Column(String, nullable=False, default="running")
    result_json = Column(Text, default=None)
    reddit_count = Column(Integer, default=0)
    x_count = Column(Integer, default=0)
    error = Column(Text, default=None)
    created_at = Column(DateTime, default=lambda: dt.datetime.now(dt.timezone.utc))
    completed_at = Column(DateTime, default=None)

    user = relationship("User", back_populates="runs")
