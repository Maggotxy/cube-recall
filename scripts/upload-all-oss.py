"""
OSS 全量上传脚本
将所有 Minecraft/Forge 文件上传到雨云 S3，作为最终兜底下载源

上传目录结构:
  s3://cube/maven/...         <- libraries (jar 文件)
  s3://cube/assets/...        <- assets/objects (哈希资源文件)
  s3://cube/assets-indexes/... <- assets/indexes (索引 JSON)

用法: python scripts/upload-all-oss.py
"""

import os
import sys
import boto3
import mimetypes
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

# S3 配置
S3_ENDPOINT = "https://cn-nb1.rains3.com"
S3_ACCESS_KEY = "C6uP3ioKAknrR5eQ"
S3_SECRET_KEY = "Ce7tokDtpZ3DBmAkDdyWnzpyA5f7MU"
S3_BUCKET = "cube"

MAX_WORKERS = 16

MC_DIR = os.path.expanduser("~/.cuberecall/minecraft")

# 上传任务: (本地目录, S3前缀)
UPLOAD_TASKS = [
    (os.path.join(MC_DIR, "libraries"), "maven"),
    (os.path.join(MC_DIR, "assets", "objects"), "assets"),
    (os.path.join(MC_DIR, "assets", "indexes"), "assets-indexes"),
]


def get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=S3_ENDPOINT,
        aws_access_key_id=S3_ACCESS_KEY,
        aws_secret_access_key=S3_SECRET_KEY,
    )


def list_existing_keys(s3, prefix):
    keys = set()
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=S3_BUCKET, Prefix=prefix):
        for obj in page.get("Contents", []):
            keys.add(obj["Key"])
    return keys


def upload_file(s3, local_path, s3_key):
    content_type = mimetypes.guess_type(local_path)[0] or "application/octet-stream"
    s3.upload_file(
        local_path,
        S3_BUCKET,
        s3_key,
        ExtraArgs={"ContentType": content_type, "ACL": "public-read"},
    )
    return s3_key


def scan_files(local_dir, s3_prefix):
    files = []
    if not os.path.isdir(local_dir):
        print(f"  WARNING: {local_dir} not found, skipping")
        return files
    for root, dirs, filenames in os.walk(local_dir):
        for filename in filenames:
            local_path = os.path.join(root, filename)
            # 跳过 0 字节文件
            if os.path.getsize(local_path) == 0:
                continue
            rel_path = os.path.relpath(local_path, local_dir).replace("\\", "/")
            s3_key = f"{s3_prefix}/{rel_path}"
            files.append((local_path, s3_key))
    return files


def main():
    s3 = get_s3_client()

    # 收集所有文件
    all_files = []
    for local_dir, s3_prefix in UPLOAD_TASKS:
        print(f"\nScanning: {local_dir} -> s3://{S3_BUCKET}/{s3_prefix}/")
        files = scan_files(local_dir, s3_prefix)
        print(f"  Found {len(files)} files")
        all_files.extend(files)

    print(f"\nTotal: {len(all_files)} files")

    # 获取已存在的文件
    print("Checking existing files on S3...")
    existing = set()
    for _, s3_prefix in UPLOAD_TASKS:
        existing |= list_existing_keys(s3, s3_prefix)
    print(f"  {len(existing)} files already on S3")

    to_upload = [(lp, sk) for lp, sk in all_files if sk not in existing]
    skipped = len(all_files) - len(to_upload)

    if skipped > 0:
        print(f"  Skipping {skipped} already uploaded files")

    if not to_upload:
        print("\nAll files already uploaded!")
        return

    # 计算总大小
    total_size = sum(os.path.getsize(lp) for lp, _ in to_upload)
    print(f"\nUploading {len(to_upload)} files ({total_size / 1024 / 1024:.1f} MB), {MAX_WORKERS} concurrent...")

    uploaded = 0
    failed = 0
    failed_files = []

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(upload_file, get_s3_client(), lp, sk): (lp, sk)
            for lp, sk in to_upload
        }

        for future in as_completed(futures):
            lp, sk = futures[future]
            try:
                future.result()
                uploaded += 1
                if uploaded % 200 == 0 or uploaded == len(to_upload):
                    print(f"  Progress: {uploaded}/{len(to_upload)}")
            except Exception as e:
                failed += 1
                failed_files.append((sk, str(e)))
                print(f"  FAILED: {sk} - {e}")

    print(f"\nDone! Uploaded: {uploaded}, Failed: {failed}, Skipped: {skipped}")
    if failed_files:
        print("\nFailed files:")
        for sk, err in failed_files:
            print(f"  {sk}: {err}")


if __name__ == "__main__":
    main()
