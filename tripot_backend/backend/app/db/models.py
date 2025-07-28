from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    user_id_str = Column(String(255), unique=True, index=True, nullable=False)
    
    # ✨ 수정/추가된 부분: 관계 설정 수정
    photos = relationship("FamilyPhoto", back_populates="user")
    comments = relationship("PhotoComment", back_populates="user")

class FamilyPhoto(Base):
    __tablename__ = "family_photos"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    filename = Column(String(255), nullable=False)
    original_name = Column(String(255))
    file_path = Column(String(512), nullable=False)
    file_size = Column(Integer)
    uploaded_by = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), default=datetime.utcnow)
    
    # ✨ 수정/추가된 부분: 관계 설정 수정
    user = relationship("User", back_populates="photos")
    comments = relationship("PhotoComment", back_populates="photo", cascade="all, delete-orphan")

# ✨ 수정/추가된 부분: 주석 해제 및 관계 설정 확인
class PhotoComment(Base):
    __tablename__ = "photo_comments"
    id = Column(Integer, primary_key=True, index=True)
    photo_id = Column(Integer, ForeignKey("family_photos.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    author_name = Column(String(100), nullable=False) # 클라이언트에서 받은 작성자 이름
    comment_text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), default=datetime.utcnow)
    
    photo = relationship("FamilyPhoto", back_populates="comments")
    user = relationship("User", back_populates="comments")

class Post(Base):
    __tablename__ = "posts"
    id = Column(Integer, primary_key=True, index=True)
    photo_id = Column(Integer, ForeignKey("family_photos.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    description = Column(Text)
    mentions = Column(Text)
    location = Column(String(255))
    audio_message = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), default=datetime.utcnow)

    photo = relationship("FamilyPhoto")
    user = relationship("User")



class Summary(Base):
    __tablename__ = "summaries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(255), nullable=False)
    summary_json = Column(JSON)  # 👈 이 부분 추가
    report_date = Column(Date)  # 👈 여기 추가
    created_at = Column(DateTime(timezone=True), server_default=func.now())
