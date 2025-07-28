print("🔥🔥🔥 MAIN.PY 시작! 🔥🔥🔥")
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

print("🔥 IMPORTS 완료")
from app.db import models
from app.db.database import engine
from app.api.v1.api import api_router

print("🔥 API 라우터 임포트 완료")
from app.db import models
from app.db.database import engine
from app.api.v1.api import api_router

import os

# 서버 시작 시 models.py에 정의된 모든 테이블을 DB에 생성합니다.
models.Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Tripot API",
    description="트라이팟 서비스의 통합 API 서버입니다.",
    version="1.0.0"
)

# 현재 파일(main.py)의 경로를 기준으로 uploads 경로 지정
# '/uploads' URL 경로로 파일 서빙 (사진 저장 폴더 경로가 'uploads'인 경우)
# app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # backend/app/
UPLOAD_DIR = os.path.join(BASE_DIR, "..", "uploads")   # backend/uploads
# print(f"📂 Static mount 경로: {UPLOAD_DIR}")  # 꼭 찍어보세요
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


# ❗️❗️ 이 부분이 핵심적인 변경 사항입니다 ❗️❗️
# 모든 출처에서의 연결을 허용하도록 와일드카드('*')를 사용합니다.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # 특정 목록 대신, 모든 출처를 허용합니다.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# '/api/v1' 경로로 들어오는 모든 요청을 api_router에게 위임합니다.
app.include_router(api_router, prefix="/api/v1")

# 서버 상태 확인용 루트 경로
@app.get("/", tags=["Default"])
def read_root():
    return {"message": "Welcome to Tripot Integrated Backend!"}

