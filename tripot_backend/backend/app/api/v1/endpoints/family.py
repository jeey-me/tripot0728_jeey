import os
from fastapi import APIRouter, Depends, File, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import List
from datetime import datetime

from app.db.database import get_db
from app.services import report_service
from app.services.photo_service import PhotoService
from app.services.comment_service import CommentService
from app.db.models import FamilyPhoto, User, PhotoComment, Post

router = APIRouter()

# Pydantic 스키마 정의
class CommentCreate(BaseModel):
    photo_id: int
    user_id_str: str
    author_name: str
    comment_text: str

class CommentResponse(BaseModel):
    id: int
    author_name: str
    comment_text: str
    created_at: datetime

    class Config:
        orm_mode = True

class CommentUpdate(BaseModel):
    user_id_str: str
    comment_text: str

class CommentDelete(BaseModel):
    user_id_str: str

class PostCreate(BaseModel):
    photo_id: int
    user_id_str: str         
    description: str = ""
    mentions: str = ""
    location: str = ""
    audio_message: str = ""

class PhotoMetadataSchema(BaseModel):
    id: int
    description: str
    mentions: str
    location: str
    uploaded_by: str
    created_at: datetime
    file_url: str
    comments: List[dict] = []

    class Config:
        from_attributes = True

# 여기에 실제 서버 IP나 도메인 사용
# BASE_URL = "http://192.168.0.5:8000"  # 또는 localhost가 아닌 실제 접속 주소
# BASE_URL = "http://192.168.0.5"  # 또는 localhost가 아닌 실제 접속 주소
BASE_URL = "http://192.168.101.48:8889"  # 또는 localhost가 아닌 실제 접속 주소

@router.get("/reports/{senior_user_id}")
def get_senior_report_api(senior_user_id: str, db: Session = Depends(get_db)):
    report_data = report_service.get_report_by_user_id(db, senior_user_id)
    return report_data

@router.post("/family-yard/upload")
async def upload_photos(
    files: list[UploadFile] = File(...),
    user_id_str: str = Form(...),
    uploaded_by: str = Form(...),
    description: str = Form(""),
    mentions: str = Form(""),
    location: str = Form(""),
    audio_message: str = Form(""),
    db: Session = Depends(get_db)
):
    try:
        print(f"📸 여러 장 업로드 요청: {len(files)}장")
        user = db.query(User).filter(User.user_id_str == user_id_str).first()
        if not user:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

        saved_photos = []
        created_posts = []

        for file in files:
            contents = await file.read()
            upload_path, unique_filename_base = PhotoService.generate_file_path()
            file_ext = os.path.splitext(file.filename)[1].lower()
            unique_filename = f"{unique_filename_base}{file_ext}"
            file_path = os.path.join(upload_path, unique_filename)

            with open(file_path, "wb") as f:
                f.write(contents)

            photo = PhotoService.save_photo_metadata(
                db=db,
                user=user,
                filename=unique_filename,
                original_name=file.filename,
                file_path=file_path,
                file_size=len(contents),
                uploaded_by=uploaded_by
            )
            saved_photos.append(photo)

            new_post = Post(
                photo_id=photo.id,
                user_id=user.id,
                description=description,
                mentions=mentions,
                location=location,
                audio_message=audio_message,
            )
            db.add(new_post)
            created_posts.append(new_post)

        # for문 끝난 후 한 번만 커밋/refresh/디버깅
        print("Post 생성: photo_id=", [p.photo_id for p in created_posts], "user_id=", [p.user_id for p in created_posts])
        print("커밋 직전 saved_photos:", [p.id for p in saved_photos])
        print("커밋 직전 created_posts:", [p.id for p in created_posts])
        db.commit()
        for post in created_posts:
            db.refresh(post)
        print("커밋 후 post_ids:", [p.id for p in created_posts])

        return {
            "status": "success",
            "uploaded_count": len(saved_photos),
            "photo_ids": [p.id for p in saved_photos],
            "post_ids": [p.id for p in created_posts]
        }

    except Exception as e:
        print(f"❌ 다중 업로드 실패: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"업로드 실패: {str(e)}")

@router.get("/family-yard/photos")
def get_family_photos(
    user_id_str: str,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    try:
        print(f"📷 사진 목록 조회 요청: user={user_id_str}")
        user = db.query(User).filter(User.user_id_str == user_id_str).first()
        if not user:
            print(f"❌ 사용자를 찾을 수 없음: {user_id_str}")
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
        photos = PhotoService.get_photos_by_user(db, user, limit)
        photos_by_date = PhotoService.group_photos_by_date(photos)
        print(f"✅ 사진 목록 조회 완료: {len(photos)}개")
        return {
            "status": "success",
            "photos_by_date": photos_by_date,
            "total_count": len(photos)
        }
    except Exception as e:
        print(f"❌ 사진 조회 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"조회 실패: {str(e)}")

@router.get("/family-yard/photo/{photo_id}")
def get_photo_file(photo_id: int, db: Session = Depends(get_db)):
    try:
        photo = PhotoService.get_photo_by_id(db, photo_id)
        if not photo or not os.path.exists(photo.file_path):
            raise HTTPException(status_code=404, detail="사진 파일을 찾을 수 없습니다")
        media_type = "image/jpeg"
        if photo.original_name and photo.original_name.lower().endswith('.png'):
            media_type = "image/png"
        return FileResponse(photo.file_path, media_type=media_type)
    except Exception as e:
        print(f"❌ 사진 파일 조회 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"사진 파일 조회 실패: {str(e)}")
@router.get("/family-yard/photo/{photo_id}/meta")
def get_photo_meta(photo_id: int, db: Session = Depends(get_db)):
    try:
        photo_with_post = db.execute(text("""
            SELECT
                fp.id AS id,
                fp.user_id AS user_id,
                fp.file_path AS file_path,
                fp.created_at AS created_at,
                fp.uploaded_by AS uploaded_by,
                p.description AS description,
                p.mentions AS mentions,
                p.location AS location,
                p.audio_message AS audio_message
            FROM family_photos fp
            LEFT JOIN posts p ON fp.id = p.photo_id
            WHERE fp.id = :photo_id
        """), {"photo_id": photo_id}).fetchone()

        if not photo_with_post:
            raise HTTPException(status_code=404, detail="사진 없음")

        # API URL prefix 예시
        # BASE_URL = "http://your-server-url.com"  # 실제 도메인 또는 IP로 수정

        return {
            "id": photo_with_post.id,
            "user_id": photo_with_post.user_id,
            "file_url": f"{BASE_URL}/{photo_with_post.file_path}",
            "created_at": photo_with_post.created_at,
            "uploaded_by": photo_with_post.uploaded_by,
            "description": photo_with_post.description or "",
            "mentions": photo_with_post.mentions or "",
            "location": photo_with_post.location or "",
            "audio_message": photo_with_post.audio_message or ""
        }

    except Exception as e:
        print(f"❌ 사진 메타데이터 조회 실패: {str(e)}")
        raise HTTPException(status_code=500, detail="사진 정보 조회 실패")
    
@router.get("/family-yard/photo/{photo_id}/detail")
def get_photo_detail(photo_id: int, db: Session = Depends(get_db)):
    try:
        print(f"🔍 사진 상세 정보 요청: photo_id={photo_id}")
        query = text("""
            SELECT
              fp.id AS id,
              fp.user_id AS user_id,
              fp.file_path AS file_path,
              fp.created_at AS created_at,
              fp.uploaded_by AS uploaded_by,
              p.description AS description,
              p.mentions AS mentions,
              p.location AS location,
              p.audio_message AS audio_message
            FROM family_photos fp
            LEFT JOIN posts p ON fp.id = p.photo_id
            WHERE fp.id = :photo_id
        """)
        result = db.execute(query, {"photo_id": photo_id}).fetchone()
        print(f"✅ 사진 상세 정보 조회 완료: {result}")
        if not result:
            raise HTTPException(status_code=404, detail="사진을 찾을 수 없습니다.")


        # file_url = f"{BASE_URL}/{result.file_path}" if result.file_path else None
        relative_url = result.file_path.split("uploads")[-1]  # → /family_photos/...
        file_url = f"{BASE_URL}/uploads{relative_url}"
        print(f"✅ file_url: {file_url}")

        return {
            "id": result.id,
            "user_id": result.user_id,
            "file_url": file_url,
            "created_at": result.created_at,
            "uploaded_by": result.uploaded_by,
            "description": result.description,
            "mentions": result.mentions,
            "location": result.location,
            "audio_message": result.audio_message,
        }
    except Exception as e:
        print(f"❌ 사진 상세 조회 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"사진 상세 조회 실패: {str(e)}")

@router.post("/family-yard/comment", response_model=CommentResponse)
def create_comment_for_photo(
    comment_data: CommentCreate,
    db: Session = Depends(get_db)
):
    try:
        print(f"💬 댓글 생성 요청: photo_id={comment_data.photo_id}, user={comment_data.user_id_str}")
        
        # user_id_str로 실제 user_id 찾기
        user = db.query(User).filter(User.user_id_str == comment_data.user_id_str).first()
        if not user:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
        
        new_comment = CommentService.create_comment(
            db=db,
            photo_id=comment_data.photo_id,
            user_id=user.id,  # user_id_str이 아닌 user.id 전달
            author_name=comment_data.author_name,
            comment_text=comment_data.comment_text
        )
        return new_comment
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"❌ 댓글 생성 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"댓글 생성 실패: {str(e)}")

@router.get("/family-yard/photo/{photo_id}/comments", response_model=List[CommentResponse])
def get_comments_for_photo(
    photo_id: int,
    db: Session = Depends(get_db)
):
    try:
        print(f"🔍 댓글 목록 조회 요청: photo_id={photo_id}")
        comments = CommentService.get_comments_by_photo_id(db, photo_id)
        return comments
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"❌ 댓글 조회 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"댓글 조회 실패: {str(e)}")
    
@router.get("/photo/{photo_id}/meta", response_model=PhotoMetadataSchema)
def get_photo_metadata(photo_id: int, db: Session = Depends(get_db)):
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    return {
        "id": photo.id,
        "description": photo.description,
        "mentions": photo.mentions,
        "location": photo.location,
        "uploaded_by": photo.uploaded_by,
        "created_at": photo.created_at,
        "file_url": f"/uploads/{photo.filename}",
        "comments": [
            {"id": c.id, "comment": c.comment, "created_at": c.created_at}
            for c in photo.comments
        ]
    }

@router.put("/family-yard/comment/{comment_id}", response_model=CommentResponse)
def update_comment(
    comment_id: int,
    comment_data: CommentUpdate,
    db: Session = Depends(get_db)
):
    try:
        print(f"✏️ 댓글 수정 요청: comment_id={comment_id}, user={comment_data.user_id_str}")
        updated_comment = CommentService.update_comment(
            db=db,
            comment_id=comment_id,
            user_id_str=comment_data.user_id_str,
            new_comment_text=comment_data.comment_text
        )
        return updated_comment
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"❌ 댓글 수정 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"댓글 수정 실패: {str(e)}")

@router.delete("/family-yard/comment/{comment_id}")
def delete_comment(
    comment_id: int,
    comment_data: CommentDelete,
    db: Session = Depends(get_db)
):
    try:
        print(f"🗑️ 댓글 삭제 요청: comment_id={comment_id}, user={comment_data.user_id_str}")
        CommentService.delete_comment(
            db=db,
            comment_id=comment_id,
            user_id_str=comment_data.user_id_str
        )
        return {"status": "success", "message": "댓글이 성공적으로 삭제되었습니다."}
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"❌ 댓글 삭제 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"댓글 삭제 실패: {str(e)}")