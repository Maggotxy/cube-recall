import re
import hashlib
import secrets
import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel, field_validator
from jose import jwt
from passlib.context import CryptContext

from database import get_db
from models import User, MachineBinding, LoginToken
from config import (
    SECRET_KEY, ALGORITHM, TOKEN_EXPIRE_HOURS,
    MAX_ACCOUNTS_PER_MACHINE, USERNAME_PATTERN, MOD_API_KEY,
)

router = APIRouter(prefix="/auth", tags=["认证"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _truncate_for_bcrypt(password: str) -> str:
    """bcrypt 最多处理 72 字节，超出部分截断"""
    return password.encode("utf-8")[:72].decode("utf-8", errors="ignore")


def hash_password(password: str) -> str:
    """bcrypt 哈希密码"""
    return pwd_context.hash(_truncate_for_bcrypt(password))


def verify_password(password: str, hashed: str) -> bool:
    """验证密码（兼容旧 SHA256 格式和新 bcrypt 格式）"""
    if "$2" in hashed[:4]:
        return pwd_context.verify(_truncate_for_bcrypt(password), hashed)
    # 兼容旧 SHA256+salt 格式
    salt, h = hashed.split("$", 1)
    return hashlib.sha256((salt + password).encode()).hexdigest() == h


class RegisterRequest(BaseModel):
    username: str
    password: str
    machine_id: str

    @field_validator("username")
    @classmethod
    def validate_username(cls, v):
        if not re.match(USERNAME_PATTERN, v):
            raise ValueError("用户名只能包含英文字母、数字和下划线，3-16位，不能以数字开头")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError("密码长度不能少于6位")
        return v


class LoginRequest(BaseModel):
    username: str
    password: str
    machine_id: str


LOCALHOST_VARIANTS = {'127.0.0.1', '::1', '0:0:0:0:0:0:0:1', 'localhost'}


def normalize_ip(ip: str) -> str:
    """Normalize localhost variants to a single canonical form."""
    if ip in LOCALHOST_VARIANTS:
        return '127.0.0.1'
    return ip


class VerifyRequest(BaseModel):
    username: str
    token: str
    client_ip: str


@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    # 检查用户名是否已存在
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(400, "用户名已存在")

    # 检查机器码绑定数量
    binding_count = db.query(MachineBinding).filter(
        MachineBinding.machine_id == req.machine_id
    ).count()
    if binding_count >= MAX_ACCOUNTS_PER_MACHINE:
        raise HTTPException(400, f"该机器已绑定{MAX_ACCOUNTS_PER_MACHINE}个账号，无法再注册")

    # 创建用户
    user = User(
        username=req.username,
        password_hash=hash_password(req.password),
        machine_id=req.machine_id,
    )
    db.add(user)

    # 创建机器码绑定
    binding = MachineBinding(machine_id=req.machine_id, username=req.username)
    db.add(binding)

    db.commit()
    return {"message": "注册成功", "username": req.username}


@router.post("/login")
def login(req: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(401, "用户名或密码错误")

    # 获取客户端 IP（标准化 localhost 变体）
    client_ip = normalize_ip(request.client.host)

    # 生成 Token
    expire = datetime.datetime.utcnow() + datetime.timedelta(hours=TOKEN_EXPIRE_HOURS)
    token_data = {
        "sub": user.username,
        "exp": expire,
        "ip": client_ip,
    }
    token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)

    # 清除旧 Token，保存新 Token
    db.query(LoginToken).filter(LoginToken.user_id == user.id).delete()
    login_token = LoginToken(
        user_id=user.id,
        token=token,
        client_ip=client_ip,
        expires_at=expire,
    )
    db.add(login_token)
    db.commit()

    return {
        "message": "登录成功",
        "username": user.username,
        "token": token,
        "expires_at": expire.isoformat(),
    }


@router.post("/verify")
def verify_token(req: VerifyRequest, db: Session = Depends(get_db)):
    """供服务端 Mod 调用，验证玩家 Token + IP"""
    login_token = db.query(LoginToken).filter(
        LoginToken.token == req.token
    ).first()

    if not login_token:
        return {"valid": False, "reason": "Token不存在"}

    if login_token.expires_at < datetime.datetime.utcnow():
        return {"valid": False, "reason": "Token已过期"}

    if login_token.user.username != req.username:
        return {"valid": False, "reason": "用户名不匹配"}

    if normalize_ip(login_token.client_ip) != normalize_ip(req.client_ip):
        return {"valid": False, "reason": "IP不匹配"}

    return {"valid": True, "username": req.username}


class VerifyPlayerRequest(BaseModel):
    username: str
    client_ip: str


def verify_mod_api_key(request: Request = None, x_api_key: str = Header(None)):
    """验证 Mod-Server 通信密钥"""
    import logging
    if request:
        logging.getLogger('auth').warning(f"verify-player headers: {dict(request.headers)}")
    logging.getLogger('auth').warning(f"x_api_key param = [{x_api_key}], MOD_API_KEY = [{MOD_API_KEY}]")
    if MOD_API_KEY and x_api_key != MOD_API_KEY:
        raise HTTPException(403, "无效的 API Key")


@router.post("/verify-player", dependencies=[Depends(verify_mod_api_key)])
def verify_player(req: VerifyPlayerRequest, db: Session = Depends(get_db)):
    """供服务端 Mod 调用，根据用户名 + IP 验证玩家是否通过启动器登录
    Mod 不知道 Token，只知道玩家用户名和 IP，
    所以这里根据用户名查找最新有效 Token 并校验 IP 是否匹配"""
    user = db.query(User).filter(User.username == req.username).first()
    if not user:
        return {"valid": False, "reason": "用户不存在"}

    # 查找该用户最新的有效 Token
    login_token = db.query(LoginToken).filter(
        LoginToken.user_id == user.id,
        LoginToken.expires_at > datetime.datetime.utcnow(),
    ).order_by(LoginToken.created_at.desc()).first()

    if not login_token:
        return {"valid": False, "reason": "未登录或Token已过期，请通过启动器登录"}

    if normalize_ip(login_token.client_ip) != normalize_ip(req.client_ip):
        return {"valid": False, "reason": "IP不匹配，请通过启动器重新登录"}

    return {"valid": True, "username": req.username}


# ========== Launch Token（一次性启动令牌）==========

class CreateLaunchTokenRequest(BaseModel):
    username: str
    token: str  # 登录 token，用于验证身份


@router.post("/create-launch-token")
def create_launch_token(req: CreateLaunchTokenRequest, request: Request, db: Session = Depends(get_db)):
    """启动器在启动游戏前调用，生成一次性 launch token"""
    # 验证登录 token 有效
    from models import LoginToken, LaunchToken
    login_token = db.query(LoginToken).filter(
        LoginToken.token == req.token,
        LoginToken.expires_at > datetime.datetime.utcnow(),
    ).first()

    if not login_token or login_token.user.username != req.username:
        raise HTTPException(401, "登录 Token 无效或已过期")

    # 更新 login token 的 client_ip 为当前请求 IP（用户可能切换了网络）
    current_ip = normalize_ip(request.client.host)
    if login_token.client_ip != current_ip:
        login_token.client_ip = current_ip


    # 清理该用户旧的 launch token
    db.query(LaunchToken).filter(LaunchToken.username == req.username).delete()

    # 生成新的 launch token（2分钟有效）
    launch_token = secrets.token_hex(32)
    expires = datetime.datetime.utcnow() + datetime.timedelta(minutes=2)
    lt = LaunchToken(
        username=req.username,
        token=launch_token,
        expires_at=expires,
    )
    db.add(lt)
    db.commit()

    return {"launch_token": launch_token, "expires_at": expires.isoformat()}


class VerifyLaunchTokenRequest(BaseModel):
    username: str
    launch_token: str


@router.post("/verify-launch-token", dependencies=[Depends(verify_mod_api_key)])
def verify_launch_token(req: VerifyLaunchTokenRequest, db: Session = Depends(get_db)):
    """服务端 Mod 调用，验证玩家的 launch token"""
    from models import LaunchToken
    lt = db.query(LaunchToken).filter(
        LaunchToken.token == req.launch_token,
        LaunchToken.username == req.username,
        LaunchToken.used == 0,
        LaunchToken.expires_at > datetime.datetime.utcnow(),
    ).first()

    if not lt:
        return {"valid": False, "reason": "启动令牌无效、已过期或已使用"}

    # 标记为已使用（一次性）
    lt.used = 1
    db.commit()

    return {"valid": True, "username": req.username}
