import datetime
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models import Announcement
from config import ADMIN_TOKEN

router = APIRouter(prefix="/announcements", tags=["公告"])


def verify_admin(authorization: str = Header(None)):
    """验证管理员 Token"""
    if not ADMIN_TOKEN:
        raise HTTPException(503, "管理接口未配置 ADMIN_TOKEN，请设置环境变量")
    if not authorization or authorization != f"Bearer {ADMIN_TOKEN}":
        raise HTTPException(403, "无权限操作")


class AnnouncementCreate(BaseModel):
    title: str
    content: Optional[str] = None
    important: bool = False


class AnnouncementResponse(BaseModel):
    id: int
    title: str
    content: Optional[str]
    important: bool
    created_at: str


@router.get("/")
def get_announcements(db: Session = Depends(get_db)):
    """获取所有活跃公告（最新的在前，最多20条）"""
    items = (
        db.query(Announcement)
        .filter(Announcement.active == 1)
        .order_by(Announcement.created_at.desc())
        .limit(20)
        .all()
    )
    return {
        "announcements": [
            {
                "id": a.id,
                "title": a.title,
                "content": a.content,
                "important": bool(a.important),
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in items
        ]
    }


@router.post("/", dependencies=[Depends(verify_admin)])
def create_announcement(req: AnnouncementCreate, db: Session = Depends(get_db)):
    """创建公告（需要管理员权限）"""
    ann = Announcement(
        title=req.title,
        content=req.content,
        important=1 if req.important else 0,
    )
    db.add(ann)
    db.commit()
    db.refresh(ann)
    return {"message": "公告创建成功", "id": ann.id}


@router.delete("/{announcement_id}", dependencies=[Depends(verify_admin)])
def delete_announcement(announcement_id: int, db: Session = Depends(get_db)):
    """删除（隐藏）公告（需要管理员权限）"""
    ann = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not ann:
        raise HTTPException(404, "公告不存在")
    ann.active = 0
    db.commit()
    return {"message": "公告已删除"}
