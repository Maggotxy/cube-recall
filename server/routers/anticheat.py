import datetime
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models import AntiCheatLog
from config import MOD_API_KEY, ADMIN_TOKEN

router = APIRouter(prefix="/anticheat", tags=["反作弊"])


def verify_mod_api_key(x_api_key: str = Header(None)):
    """验证 Mod-Server 通信密钥"""
    if MOD_API_KEY and x_api_key != MOD_API_KEY:
        raise HTTPException(403, "无效的 API Key")


def verify_admin(authorization: str = Header(None)):
    """验证管理员 Token"""
    if not ADMIN_TOKEN:
        raise HTTPException(503, "管理接口未配置 ADMIN_TOKEN")
    if not authorization or authorization != f"Bearer {ADMIN_TOKEN}":
        raise HTTPException(403, "无权限操作")


class ViolationReport(BaseModel):
    username: str
    client_ip: str
    violation_count: int
    reason: str


@router.post("/report", dependencies=[Depends(verify_mod_api_key)])
def report_violation(req: ViolationReport, db: Session = Depends(get_db)):
    """接收服务端 Mod 的反作弊上报"""
    log = AntiCheatLog(
        username=req.username,
        client_ip=req.client_ip,
        violation_count=req.violation_count,
        reason=req.reason,
    )
    db.add(log)
    db.commit()
    return {"message": "违规记录已保存", "id": log.id}


@router.get("/logs", dependencies=[Depends(verify_admin)])
def get_anticheat_logs(
    username: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """查询反作弊日志（管理接口）"""
    query = db.query(AntiCheatLog).order_by(AntiCheatLog.created_at.desc())
    if username:
        query = query.filter(AntiCheatLog.username == username)
    items = query.limit(limit).all()
    return {
        "logs": [
            {
                "id": log.id,
                "username": log.username,
                "client_ip": log.client_ip,
                "violation_count": log.violation_count,
                "reason": log.reason,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in items
        ]
    }
