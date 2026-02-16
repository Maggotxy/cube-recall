import os
import json
import hashlib
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from config import MODS_DIR, MODS_MANIFEST, MODS_DOWNLOAD_BASE_URL

router = APIRouter(prefix="/mods", tags=["Mods同步"])


def compute_md5(filepath: str) -> str:
    h = hashlib.md5()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def generate_manifest():
    """扫描 mods 目录生成清单"""
    if not os.path.isdir(MODS_DIR):
        os.makedirs(MODS_DIR, exist_ok=True)
        return {}

    manifest = {}
    for filename in os.listdir(MODS_DIR):
        filepath = os.path.join(MODS_DIR, filename)
        if os.path.isfile(filepath) and filename.endswith(".jar"):
            manifest[filename] = {
                "md5": compute_md5(filepath),
                "size": os.path.getsize(filepath),
                "url": f"{MODS_DOWNLOAD_BASE_URL}/{filename}",
            }
    return manifest


@router.get("/manifest")
def get_mods_manifest():
    """返回服务端 mods 的 MD5 清单"""
    # 优先读取手动维护的清单文件
    if os.path.isfile(MODS_MANIFEST):
        with open(MODS_MANIFEST, "r", encoding="utf-8") as f:
            return json.load(f)

    # 否则自动扫描生成
    return generate_manifest()


@router.post("/refresh")
def refresh_manifest():
    """重新扫描 mods 目录并更新清单文件"""
    manifest = generate_manifest()
    with open(MODS_MANIFEST, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    return {"message": "清单已更新", "count": len(manifest), "mods": manifest}


@router.get("/download/{filename}")
def download_mod(filename: str):
    """下载单个 mod 文件"""
    abs_mods_dir = os.path.abspath(MODS_DIR)
    filepath = os.path.abspath(os.path.join(abs_mods_dir, filename))

    # 安全检查：防止路径穿越攻击
    if not filepath.startswith(abs_mods_dir):
        raise HTTPException(403, "非法路径访问")

    if not os.path.isfile(filepath):
        raise HTTPException(404, "Mod文件不存在")
    return FileResponse(filepath, filename=os.path.basename(filepath))
