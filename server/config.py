import os
import sys
from dotenv import load_dotenv

load_dotenv()

# 运行环境：production / development
ENV = os.getenv("ENV", "production")
IS_PROD = ENV == "production"

# JWT 配置
SECRET_KEY = os.getenv("SECRET_KEY", "")
if IS_PROD and not SECRET_KEY:
    print("ERROR: 生产环境必须设置 SECRET_KEY 环境变量")
    sys.exit(1)
if not SECRET_KEY:
    SECRET_KEY = "dev-only-secret-key"
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24

# Mods 配置
MODS_DIR = os.getenv("MODS_DIR", "./mods")
MODS_MANIFEST = os.getenv("MODS_MANIFEST", "./mods_manifest.json")
MODS_DOWNLOAD_BASE_URL = os.getenv("MODS_DOWNLOAD_BASE_URL", "http://mc.sivita.xyz:5806/mods/download")

# 通用同步配置
SYNC_CONFIG_FILE = os.getenv("SYNC_CONFIG_FILE", "./sync_config.json")

# 客户端整包配置
CLIENT_PACK_DIR = os.getenv("CLIENT_PACK_DIR", "./client_pack")

# 机器码绑定限制
MAX_ACCOUNTS_PER_MACHINE = 2

# MC 用户名规则：仅英文字母、数字、下划线，3-16位
USERNAME_PATTERN = r"^[a-zA-Z0-9_]{3,16}$"

# 管理接口 Token（用于公告等管理操作）
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "")

# Mod-Server 通信密钥（MC服务端Mod调用后端API时使用）
MOD_API_KEY = os.getenv("MOD_API_KEY", "")

# CORS 允许的源（生产环境应限制）
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
