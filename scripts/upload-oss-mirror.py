"""
OSS 镜像上传脚本
将本地 Minecraft/Forge 库文件上传到雨云 S3，作为最终兜底下载源

用法:
  python scripts/upload-oss-mirror.py

需要安装: pip install boto3
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
S3_PREFIX = "maven"  # 上传到 s3://cube/maven/... 下

# 本地 libraries 目录
LOCAL_LIBRARIES = os.path.expanduser("~/.cuberecall/minecraft/libraries")

# 并发上传数
MAX_WORKERS = 8


def get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=S3_ENDPOINT,
        aws_access_key_id=S3_ACCESS_KEY,
        aws_secret_access_key=S3_SECRET_KEY,
    )


def list_existing_keys(s3, prefix):
    """列出 S3 中已存在的文件"""
    keys = set()
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=S3_BUCKET, Prefix=prefix):
        for obj in page.get("Contents", []):
            keys.add(obj["Key"])
    return keys


def upload_file(s3, local_path, s3_key):
    """上传单个文件"""
    content_type = mimetypes.guess_type(local_path)[0] or "application/octet-stream"
    s3.upload_file(
        local_path,
        S3_BUCKET,
        s3_key,
        ExtraArgs={"ContentType": content_type, "ACL": "public-read"},
    )
    return s3_key


def main():
    if not os.path.isdir(LOCAL_LIBRARIES):
        print(f"ERROR: Libraries directory not found: {LOCAL_LIBRARIES}")
        sys.exit(1)

    s3 = get_s3_client()

    # 收集所有本地文件
    print(f"Scanning {LOCAL_LIBRARIES} ...")
    local_files = []
    for root, dirs, files in os.walk(LOCAL_LIBRARIES):
        for filename in files:
            local_path = os.path.join(root, filename)
            rel_path = os.path.relpath(local_path, LOCAL_LIBRARIES).replace("\\", "/")
            s3_key = f"{S3_PREFIX}/{rel_path}"
            local_files.append((local_path, s3_key))

    print(f"Found {len(local_files)} files")

    # 获取已上传的文件，跳过已存在的
    print("Checking existing files on S3...")
    existing = list_existing_keys(s3, S3_PREFIX)
    to_upload = [(lp, sk) for lp, sk in local_files if sk not in existing]
    skipped = len(local_files) - len(to_upload)

    if skipped > 0:
        print(f"Skipping {skipped} already uploaded files")

    if not to_upload:
        print("All files already uploaded!")
        return

    print(f"Uploading {len(to_upload)} files (max {MAX_WORKERS} concurrent)...")

    uploaded = 0
    failed = 0

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(upload_file, get_s3_client(), lp, sk): (lp, sk)
            for lp, sk in to_upload
        }

        for future in as_completed(futures):
            lp, sk = futures[future]
            try:
                result = future.result()
                uploaded += 1
                if uploaded % 50 == 0 or uploaded == len(to_upload):
                    print(f"  Progress: {uploaded}/{len(to_upload)}")
            except Exception as e:
                failed += 1
                print(f"  FAILED: {sk} - {e}")

    print(f"\nDone! Uploaded: {uploaded}, Failed: {failed}, Skipped: {skipped}")
    print(f"Public URL base: https://cube.cn-nb1.rains3.com/maven/")


if __name__ == "__main__":
    main()
