import os
import json
import hashlib
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from typing import Dict, Any

from config import SYNC_CONFIG_FILE

router = APIRouter(prefix="/sync", tags=["通用同步"])


def compute_md5(filepath: str) -> str:
    """计算文件 MD5"""
    h = hashlib.md5()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def load_sync_config() -> Dict[str, Any]:
    """加载同步配置文件"""
    if not os.path.isfile(SYNC_CONFIG_FILE):
        raise HTTPException(500, "同步配置文件不存在")

    with open(SYNC_CONFIG_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def get_folder_config(folder_id: str) -> Dict[str, Any]:
    """获取指定文件夹的配置"""
    config = load_sync_config()
    folder = next((f for f in config["folders"] if f["id"] == folder_id), None)
    if not folder:
        raise HTTPException(404, f"文件夹配置不存在: {folder_id}")
    return folder


@router.get("/config")
def get_sync_config():
    """返回完整同步配置（隐藏服务器内部路径）"""
    config = load_sync_config()
    safe_folders = []
    for f in config.get("folders", []):
        safe_folders.append({k: v for k, v in f.items() if k != "path"})
    return {
        "version": config.get("version"),
        "server_ip": config.get("server_ip"),
        "global_settings": config.get("global_settings"),
        "folders": safe_folders,
    }


@router.get("/{folder_id}/manifest")
def get_folder_manifest(folder_id: str):
    """扫描指定文件夹并返回文件清单"""
    folder = get_folder_config(folder_id)
    folder_path = folder["path"]

    # 确保目录存在
    if not os.path.isdir(folder_path):
        os.makedirs(folder_path, exist_ok=True)
        return {}

    manifest = {}
    extensions = tuple(folder["extensions"])

    # 递归扫描目录
    for root, dirs, files in os.walk(folder_path):
        for filename in files:
            if filename.endswith(extensions):
                filepath = os.path.join(root, filename)
                rel_path = os.path.relpath(filepath, folder_path).replace("\\", "/")

                try:
                    manifest[rel_path] = {
                        "md5": compute_md5(filepath),
                        "size": os.path.getsize(filepath),
                        "url": f"{folder['download_base_url']}/{rel_path}"
                    }
                except Exception as e:
                    print(f"处理文件失败 {filepath}: {e}")
                    continue

    return manifest


@router.get("/{folder_id}/download/{filepath:path}")
def download_file(folder_id: str, filepath: str):
    """下载指定文件"""
    folder = get_folder_config(folder_id)
    abs_folder = os.path.abspath(folder["path"])

    # 安全检查：防止路径穿越攻击
    full_path = os.path.abspath(os.path.join(abs_folder, filepath))
    if not full_path.startswith(abs_folder):
        raise HTTPException(403, "非法路径访问")

    if not os.path.isfile(full_path):
        raise HTTPException(404, "文件不存在")

    # 提取文件名用于下载
    filename = os.path.basename(filepath)
    return FileResponse(full_path, filename=filename)
