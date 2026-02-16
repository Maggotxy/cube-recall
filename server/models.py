import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(32), unique=True, nullable=False, index=True)
    password_hash = Column(String(128), nullable=False)
    machine_id = Column(String(64), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    tokens = relationship("LoginToken", back_populates="user", cascade="all, delete-orphan")


class MachineBinding(Base):
    """记录机器码绑定的账号数，一个机器码最多2个账号"""
    __tablename__ = "machine_bindings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    machine_id = Column(String(64), nullable=False, index=True)
    username = Column(String(32), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    __table_args__ = (
        Index("ix_machine_user", "machine_id", "username", unique=True),
    )


class LoginToken(Base):
    """登录Token，用于服务端Mod校验"""
    __tablename__ = "login_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(256), unique=True, nullable=False, index=True)
    client_ip = Column(String(45), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)

    user = relationship("User", back_populates="tokens")


class Announcement(Base):
    """公告"""
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    content = Column(String(2000), nullable=True)
    important = Column(Integer, default=0)  # 0=普通, 1=重要
    active = Column(Integer, default=1)     # 0=隐藏, 1=显示
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class AntiCheatLog(Base):
    """反作弊日志"""
    __tablename__ = "anticheat_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(32), nullable=False, index=True)
    client_ip = Column(String(45), nullable=False)
    violation_count = Column(Integer, default=0)
    reason = Column(String(200), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
