import datetime
import json
import os
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Body
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, Dict, Any

from database import get_db
from models import User, MachineBinding, LoginToken, Announcement, AntiCheatLog
from config import ADMIN_TOKEN, SYNC_CONFIG_FILE

router = APIRouter(prefix="/admin", tags=["管理后台"])


def verify_admin(authorization: str = Header(None)):
    if not ADMIN_TOKEN:
        raise HTTPException(503, "未配置 ADMIN_TOKEN")
    if not authorization or authorization != f"Bearer {ADMIN_TOKEN}":
        raise HTTPException(403, "无权限")


# ========== API ==========

@router.get("/api/stats", dependencies=[Depends(verify_admin)])
def get_stats(db: Session = Depends(get_db)):
    now = datetime.datetime.utcnow()
    return {
        "users": db.query(func.count(User.id)).scalar(),
        "machines": db.query(func.count(func.distinct(MachineBinding.machine_id))).scalar(),
        "active_tokens": db.query(func.count(LoginToken.id)).filter(LoginToken.expires_at > now).scalar(),
        "announcements": db.query(func.count(Announcement.id)).filter(Announcement.active == 1).scalar(),
        "anticheat_logs": db.query(func.count(AntiCheatLog.id)).scalar(),
    }


@router.get("/api/users", dependencies=[Depends(verify_admin)])
def list_users(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: str = Query(""),
    db: Session = Depends(get_db),
):
    q = db.query(User)
    if search:
        q = q.filter(User.username.contains(search))
    total = q.count()
    users = q.order_by(User.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return {
        "total": total,
        "users": [
            {
                "id": u.id,
                "username": u.username,
                "machine_id": u.machine_id,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ],
    }


@router.delete("/api/users/{user_id}", dependencies=[Depends(verify_admin)])
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "用户不存在")
    db.query(MachineBinding).filter(MachineBinding.username == user.username).delete()
    db.query(LoginToken).filter(LoginToken.user_id == user.id).delete()
    db.delete(user)
    db.commit()
    return {"message": f"用户 {user.username} 已删除"}


@router.get("/api/tokens", dependencies=[Depends(verify_admin)])
def list_tokens(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    now = datetime.datetime.utcnow()
    q = db.query(LoginToken).filter(LoginToken.expires_at > now)
    total = q.count()
    tokens = q.order_by(LoginToken.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return {
        "total": total,
        "tokens": [
            {
                "id": t.id,
                "username": t.user.username if t.user else "?",
                "client_ip": t.client_ip,
                "created_at": t.created_at.isoformat() if t.created_at else None,
                "expires_at": t.expires_at.isoformat() if t.expires_at else None,
            }
            for t in tokens
        ],
    }


@router.get("/api/machines", dependencies=[Depends(verify_admin)])
def list_machines(db: Session = Depends(get_db)):
    bindings = db.query(MachineBinding).order_by(MachineBinding.created_at.desc()).all()
    grouped = {}
    for b in bindings:
        if b.machine_id not in grouped:
            grouped[b.machine_id] = []
        grouped[b.machine_id].append(b.username)
    return {
        "total": len(grouped),
        "machines": [
            {"machine_id": mid, "usernames": names, "count": len(names)}
            for mid, names in grouped.items()
        ],
    }


@router.delete("/api/machines/{machine_id}", dependencies=[Depends(verify_admin)])
def delete_machine_bindings(machine_id: str, db: Session = Depends(get_db)):
    count = db.query(MachineBinding).filter(MachineBinding.machine_id == machine_id).delete()
    db.commit()
    return {"message": f"已删除 {count} 条绑定记录"}


@router.get("/api/announcements", dependencies=[Depends(verify_admin)])
def list_all_announcements(db: Session = Depends(get_db)):
    items = db.query(Announcement).order_by(Announcement.created_at.desc()).limit(50).all()
    return {
        "announcements": [
            {
                "id": a.id,
                "title": a.title,
                "content": a.content,
                "important": bool(a.important),
                "active": bool(a.active),
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in items
        ],
    }


@router.get("/api/anticheat", dependencies=[Depends(verify_admin)])
def list_anticheat(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    username: str = Query(""),
    db: Session = Depends(get_db),
):
    q = db.query(AntiCheatLog)
    if username:
        q = q.filter(AntiCheatLog.username.contains(username))
    total = q.count()
    logs = q.order_by(AntiCheatLog.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return {
        "total": total,
        "logs": [
            {
                "id": l.id,
                "username": l.username,
                "client_ip": l.client_ip,
                "violation_count": l.violation_count,
                "reason": l.reason,
                "created_at": l.created_at.isoformat() if l.created_at else None,
            }
            for l in logs
        ],
    }


# ========== 同步配置管理 API ==========

def _load_sync_config() -> Dict[str, Any]:
    if not os.path.isfile(SYNC_CONFIG_FILE):
        return {"version": "1.0.0", "server_ip": "", "global_settings": {}, "folders": []}
    with open(SYNC_CONFIG_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_sync_config(config: Dict[str, Any]):
    with open(SYNC_CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)


@router.get("/api/sync-config", dependencies=[Depends(verify_admin)])
def get_sync_config():
    return _load_sync_config()


@router.put("/api/sync-config", dependencies=[Depends(verify_admin)])
def update_sync_global(body: Dict[str, Any] = Body(...)):
    config = _load_sync_config()
    if "server_ip" in body:
        config["server_ip"] = body["server_ip"]
    if "global_settings" in body:
        config["global_settings"] = body["global_settings"]
    _save_sync_config(config)
    return {"message": "全局配置已更新"}


@router.post("/api/sync-folders", dependencies=[Depends(verify_admin)])
def add_sync_folder(body: Dict[str, Any] = Body(...)):
    config = _load_sync_config()
    required = ["id", "display_name", "path", "extensions"]
    for key in required:
        if key not in body:
            raise HTTPException(400, f"缺少必填字段: {key}")
    # 检查 ID 唯一
    if any(f["id"] == body["id"] for f in config["folders"]):
        raise HTTPException(409, f"文件夹 ID 已存在: {body['id']}")
    folder = {
        "id": body["id"],
        "display_name": body["display_name"],
        "path": body["path"],
        "extensions": body["extensions"],
        "priority": body.get("priority", len(config["folders"]) + 1),
        "download_base_url": body.get("download_base_url", ""),
    }
    config["folders"].append(folder)
    _save_sync_config(config)
    return {"message": f"文件夹 {folder['id']} 已添加"}


@router.put("/api/sync-folders/{folder_id}", dependencies=[Depends(verify_admin)])
def update_sync_folder(folder_id: str, body: Dict[str, Any] = Body(...)):
    config = _load_sync_config()
    folder = next((f for f in config["folders"] if f["id"] == folder_id), None)
    if not folder:
        raise HTTPException(404, f"文件夹不存在: {folder_id}")
    for key in ["display_name", "path", "extensions", "priority", "download_base_url"]:
        if key in body:
            folder[key] = body[key]
    _save_sync_config(config)
    return {"message": f"文件夹 {folder_id} 已更新"}


@router.delete("/api/sync-folders/{folder_id}", dependencies=[Depends(verify_admin)])
def delete_sync_folder(folder_id: str):
    config = _load_sync_config()
    before = len(config["folders"])
    config["folders"] = [f for f in config["folders"] if f["id"] != folder_id]
    if len(config["folders"]) == before:
        raise HTTPException(404, f"文件夹不存在: {folder_id}")
    _save_sync_config(config)
    return {"message": f"文件夹 {folder_id} 已删除"}


# ========== HTML 页面 ==========

@router.get("", response_class=HTMLResponse)
def admin_page():
    return ADMIN_HTML


ADMIN_HTML = r"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Cube Recall - 指挥部</title>
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap" rel="stylesheet">
<style>
:root{
  --mc-dirt:#866043;--mc-dirt-dark:#593D29;--mc-dirt-light:#9B7653;
  --mc-grass:#5D8C32;--mc-grass-light:#7EC850;--mc-grass-dark:#3B5E1F;
  --mc-stone:#8B8B8B;--mc-stone-dark:#6B6B6B;--mc-stone-light:#AAAAAA;
  --mc-diamond:#5DECF2;--mc-gold:#FCDB05;--mc-redstone:#FF3333;
  --mc-obsidian:#1D1026;
  --bg-primary:#2C2C2C;--bg-card:#393939;--bg-input:#1A1A1A;
  --text-primary:#E8E8E8;--text-secondary:#A0A0A0;
  --pixel:3px;--font-h:'Press Start 2P',monospace;--font-b:'VT323',monospace;
  --mil-olive:#4A5D23;--mil-dark:#1C2410;--mil-gold:#C8A832;--mil-red:#8B3333;
}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:var(--font-b);font-size:18px;background:var(--bg-primary);color:var(--text-primary);min-height:100vh;image-rendering:pixelated}
/* 滚动条 */
::-webkit-scrollbar{width:8px}
::-webkit-scrollbar-track{background:var(--bg-primary)}
::-webkit-scrollbar-thumb{background:var(--mc-stone-dark);border:2px solid var(--bg-primary)}
/* 登录 */
.login-wrap{display:flex;align-items:center;justify-content:center;min-height:100vh;background:var(--mc-dirt);background-image:repeating-conic-gradient(var(--mc-dirt-dark) 0% 25%,transparent 0% 50%) 0 0/8px 8px,repeating-conic-gradient(var(--mc-dirt-light) 0% 25%,transparent 0% 50%) 4px 4px/8px 8px}
.login-box{background:var(--bg-card);border:var(--pixel) solid #000;box-shadow:inset -3px -3px 0 0 #222,inset 3px 3px 0 0 #555;padding:40px;width:380px;text-align:center}
.login-box h1{font-family:var(--font-h);color:var(--mc-gold);font-size:13px;margin-bottom:8px;text-shadow:2px 2px 0 #000;letter-spacing:1px}
.login-box .subtitle{font-family:var(--font-b);color:var(--mc-redstone);font-size:18px;margin-bottom:24px}
.login-box input{width:100%;padding:8px 12px;font-family:var(--font-b);font-size:20px;color:var(--text-primary);background:#000;border:var(--pixel) solid #000;box-shadow:inset 3px 3px 0 0 #222,inset -3px -3px 0 0 #444;outline:none;margin-bottom:16px}
.login-box input:focus{box-shadow:inset 3px 3px 0 0 #222,inset -3px -3px 0 0 #444,0 0 0 3px var(--mc-diamond)}
.mc-btn{display:inline-flex;align-items:center;justify-content:center;padding:8px 24px;min-height:40px;font-family:var(--font-h);font-size:10px;color:var(--text-primary);background:var(--mc-stone);border:var(--pixel) solid #000;box-shadow:inset -3px -3px 0 0 #555,inset 3px 3px 0 0 #C6C6C6;cursor:pointer;text-shadow:2px 2px 0 rgba(0,0,0,.4);letter-spacing:1px;user-select:none;width:100%}
.mc-btn:hover{background:#A5A5D4;box-shadow:inset -3px -3px 0 0 #6B6BA0,inset 3px 3px 0 0 #D0D0FF}
.mc-btn:active{background:var(--mc-stone-dark);box-shadow:inset 3px 3px 0 0 #555,inset -3px -3px 0 0 #888}
.mc-btn-grass{background:var(--mc-grass);box-shadow:inset -3px -3px 0 0 var(--mc-grass-dark),inset 3px 3px 0 0 var(--mc-grass-light)}
.mc-btn-grass:hover{background:#6DA83C}
.mc-btn-red{background:var(--mil-red);box-shadow:inset -3px -3px 0 0 #5A1A1A,inset 3px 3px 0 0 #BB5555}
.mc-btn-red:hover{background:#A03030}
.mc-btn-olive{background:var(--mil-olive);box-shadow:inset -3px -3px 0 0 var(--mil-dark),inset 3px 3px 0 0 #6B8A30}
.mc-btn-olive:hover{background:#5A7028}
.mc-btn-sm{padding:4px 14px;min-height:28px;font-size:8px;width:auto}
/* 主布局 */
.app{display:none}
.sidebar{position:fixed;left:0;top:0;bottom:0;width:220px;background:var(--bg-card);border-right:var(--pixel) solid #000;box-shadow:inset -3px 0 0 0 #222;overflow-y:auto;z-index:10}
.sidebar-header{padding:16px;border-bottom:var(--pixel) solid #000;text-align:center;background:var(--mil-dark)}
.sidebar-header h2{font-family:var(--font-h);color:var(--mc-gold);font-size:10px;text-shadow:2px 2px 0 #000;margin-bottom:4px}
.sidebar-header .tagline{font-family:var(--font-b);color:var(--mc-redstone);font-size:16px}
.sidebar-nav{padding:8px 0}
.sidebar-nav a{display:flex;align-items:center;gap:10px;padding:10px 16px;color:var(--text-secondary);text-decoration:none;font-family:var(--font-b);font-size:20px;cursor:pointer;border-left:4px solid transparent;transition:none}
.sidebar-nav a:hover{background:rgba(255,255,255,.05);color:var(--text-primary);border-left-color:var(--mc-stone)}
.sidebar-nav a.active{background:rgba(93,140,50,.15);color:var(--mc-grass-light);border-left-color:var(--mc-grass-light)}
.sidebar-nav a .icon{font-size:16px;width:20px;text-align:center}
.sidebar-footer{position:absolute;bottom:0;left:0;right:0;padding:12px 16px;border-top:var(--pixel) solid #000;background:var(--bg-card)}
.sidebar-footer a{display:block;text-align:center;color:var(--mc-redstone);font-family:var(--font-b);font-size:18px;cursor:pointer;text-decoration:none}
.sidebar-footer a:hover{color:#FF6666}
/* 主内容 */
.main{margin-left:220px;padding:24px;min-height:100vh;background:var(--bg-primary)}
.main h2{font-family:var(--font-h);color:var(--mc-gold);font-size:12px;text-shadow:2px 2px 0 #000;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid var(--mc-stone-dark)}
.main h2 .crosshair{color:var(--mc-redstone);margin-right:6px}
/* 统计卡片 */
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:16px;margin-bottom:24px}
.stat-card{background:var(--bg-card);border:var(--pixel) solid #000;box-shadow:inset -3px -3px 0 0 #222,inset 3px 3px 0 0 #555;padding:16px;text-align:center;position:relative;overflow:hidden}
.stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,var(--mc-grass) 0%,var(--mc-grass) 33%,var(--mc-grass-dark) 33%,var(--mc-grass-dark) 66%,var(--mc-grass-light) 66%)}
.stat-card .num{font-family:var(--font-h);font-size:20px;color:var(--mc-gold);text-shadow:2px 2px 0 #000}
.stat-card .label{font-family:var(--font-b);font-size:18px;color:var(--text-secondary);margin-top:6px}
/* 表格 */
table{width:100%;border-collapse:collapse;background:var(--bg-card);border:var(--pixel) solid #000;box-shadow:inset -3px -3px 0 0 #222,inset 3px 3px 0 0 #555}
th,td{padding:8px 12px;text-align:left;border-bottom:2px solid #222;font-family:var(--font-b);font-size:18px}
th{background:var(--mil-dark);color:var(--mc-grass-light);font-family:var(--font-h);font-size:8px;text-shadow:1px 1px 0 #000;letter-spacing:.5px;text-transform:uppercase;padding:10px 12px}
tr:hover{background:rgba(93,140,50,.08)}
/* 工具栏 */
.toolbar{display:flex;gap:8px;margin-bottom:16px;align-items:center}
.toolbar input{flex:1;max-width:280px;padding:6px 10px;font-family:var(--font-b);font-size:18px;color:var(--text-primary);background:#000;border:var(--pixel) solid #000;box-shadow:inset 2px 2px 0 0 #222,inset -2px -2px 0 0 #444;outline:none}
.toolbar input:focus{box-shadow:inset 2px 2px 0 0 #222,inset -2px -2px 0 0 #444,0 0 0 2px var(--mc-diamond)}
/* 分页 */
.pager{display:flex;gap:8px;margin-top:12px;align-items:center;font-family:var(--font-b);font-size:18px;color:var(--text-secondary)}
.pager button{padding:4px 14px;font-family:var(--font-b);font-size:18px;color:var(--text-primary);background:var(--mc-stone);border:2px solid #000;box-shadow:inset -2px -2px 0 0 #555,inset 2px 2px 0 0 #C6C6C6;cursor:pointer}
.pager button:hover{background:#A5A5D4}
.pager button:disabled{opacity:.4;cursor:default;background:#555}
/* 弹窗 */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:100}
.modal{background:var(--bg-card);border:var(--pixel) solid #000;box-shadow:inset -3px -3px 0 0 #222,inset 3px 3px 0 0 #555;padding:24px;width:440px}
.modal h3{font-family:var(--font-h);color:var(--mc-gold);font-size:10px;text-shadow:2px 2px 0 #000;margin-bottom:16px}
.modal input,.modal textarea{width:100%;padding:8px 10px;font-family:var(--font-b);font-size:18px;color:var(--text-primary);background:#000;border:var(--pixel) solid #000;box-shadow:inset 2px 2px 0 0 #222,inset -2px -2px 0 0 #444;outline:none;margin-bottom:12px}
.modal textarea{height:80px;resize:vertical}
.modal label{display:flex;align-items:center;gap:8px;font-family:var(--font-b);font-size:18px;margin-bottom:12px;cursor:pointer}
.modal-btns{display:flex;gap:8px;justify-content:flex-end}
/* 标签 */
.tag{display:inline-block;padding:2px 8px;font-family:var(--font-h);font-size:7px;letter-spacing:.5px;border:2px solid #000}
.tag-active{background:var(--mc-grass);color:#fff;box-shadow:inset -1px -1px 0 0 var(--mc-grass-dark),inset 1px 1px 0 0 var(--mc-grass-light)}
.tag-inactive{background:#555;color:#999;box-shadow:inset -1px -1px 0 0 #333,inset 1px 1px 0 0 #777}
.tag-important{background:var(--mc-redstone);color:#fff;box-shadow:inset -1px -1px 0 0 #CC2222,inset 1px 1px 0 0 #FF6666}
/* 草地顶部装饰 */
.grass-stripe{height:8px;background:repeating-linear-gradient(90deg,var(--mc-grass) 0px,var(--mc-grass) 4px,var(--mc-grass-dark) 4px,var(--mc-grass-dark) 8px);image-rendering:pixelated}
</style>
</head>
<body>

<div class="login-wrap" id="loginWrap">
  <div class="login-box">
    <h1>CUBE RECALL</h1>
    <div class="subtitle">// COMMAND CENTER //</div>
    <input id="tokenInput" type="password" placeholder="输入指挥官密钥..." />
    <button class="mc-btn mc-btn-olive" onclick="doLogin()">ACCESS GRANTED</button>
    <p id="loginErr" style="color:var(--mc-redstone);margin-top:12px;font-family:var(--font-b);font-size:18px"></p>
  </div>
</div>

<div class="app" id="app">
  <div class="sidebar">
    <div class="sidebar-header">
      <h2>CUBE RECALL</h2>
      <div class="tagline">// 指挥部 //</div>
    </div>
    <div class="sidebar-nav">
      <a onclick="showTab('dashboard')" id="tab-dashboard" class="active"><span class="icon">[+]</span>作战总览</a>
      <a onclick="showTab('users')" id="tab-users"><span class="icon">[U]</span>士兵管理</a>
      <a onclick="showTab('tokens')" id="tab-tokens"><span class="icon">[T]</span>通行令牌</a>
      <a onclick="showTab('machines')" id="tab-machines"><span class="icon">[M]</span>装备绑定</a>
      <a onclick="showTab('announcements')" id="tab-announcements"><span class="icon">[!]</span>战报公告</a>
      <a onclick="showTab('anticheat')" id="tab-anticheat"><span class="icon">[X]</span>违规侦察</a>
      <a onclick="showTab('sync')" id="tab-sync"><span class="icon">[S]</span>同步管理</a>
    </div>
    <div class="sidebar-footer">
      <a onclick="doLogout()">[EXIT] 撤离指挥部</a>
    </div>
  </div>
  <div class="main" id="mainContent"></div>
</div>

<script>
let TOKEN = localStorage.getItem('admin_token') || '';
const API = '/admin/api';
const tabs = ['dashboard','users','tokens','machines','announcements','anticheat','sync'];
let currentTab = 'dashboard';
let pageState = {};

function headers() { return { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' }; }

async function api(path, opts = {}) {
  const res = await fetch(API + path, { headers: headers(), ...opts });
  if (res.status === 403) { doLogout(); throw new Error('Token无效'); }
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || '请求失败'); }
  return res.json();
}

async function doLogin() {
  TOKEN = document.getElementById('tokenInput').value.trim();
  if (!TOKEN) return;
  try {
    await api('/stats');
    localStorage.setItem('admin_token', TOKEN);
    document.getElementById('loginWrap').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    showTab('dashboard');
  } catch(e) {
    document.getElementById('loginErr').textContent = '登录失败：Token无效';
    TOKEN = '';
  }
}

function doLogout() {
  TOKEN = '';
  localStorage.removeItem('admin_token');
  document.getElementById('app').style.display = 'none';
  document.getElementById('loginWrap').style.display = 'flex';
  document.getElementById('tokenInput').value = '';
}

function showTab(tab) {
  currentTab = tab;
  tabs.forEach(t => {
    const el = document.getElementById('tab-' + t);
    if (el) el.className = t === tab ? 'active' : '';
  });
  pageState = { page: 1, search: '' };
  render();
}

async function render() {
  const m = document.getElementById('mainContent');
  try {
    if (currentTab === 'dashboard') await renderDashboard(m);
    else if (currentTab === 'users') await renderUsers(m);
    else if (currentTab === 'tokens') await renderTokens(m);
    else if (currentTab === 'machines') await renderMachines(m);
    else if (currentTab === 'announcements') await renderAnnouncements(m);
    else if (currentTab === 'anticheat') await renderAnticheat(m);
    else if (currentTab === 'sync') await renderSync(m);
  } catch(e) { m.innerHTML = '<p style="color:#e94560">加载失败: ' + e.message + '</p>'; }
}

async function renderDashboard(m) {
  const s = await api('/stats');
  m.innerHTML = '<h2><span class="crosshair">[+]</span> 作战总览</h2><div class="stats">'
    + card(s.users, '注册士兵') + card(s.machines, '绑定装备')
    + card(s.active_tokens, '活跃令牌') + card(s.announcements, '战报公告')
    + card(s.anticheat_logs, '违规记录')
    + '</div><div class="grass-stripe"></div>';
}
function card(n, l) { return '<div class="stat-card"><div class="num">' + n + '</div><div class="label">' + l + '</div></div>'; }

async function renderUsers(m) {
  const p = pageState.page || 1;
  const s = pageState.search || '';
  const d = await api('/users?page=' + p + '&size=20&search=' + encodeURIComponent(s));
  let h = '<h2><span class="crosshair">[U]</span> 士兵管理</h2><div class="toolbar"><input placeholder="搜索代号..." value="' + esc(s) + '" onkeyup="if(event.key===\'Enter\'){pageState.search=this.value;pageState.page=1;render()}" /><button class="mc-btn mc-btn-olive mc-btn-sm" onclick="pageState.search=this.previousElementSibling.value;pageState.page=1;render()">SEARCH</button></div>';
  h += '<table><tr><th>ID</th><th>代号</th><th>装备码</th><th>入伍时间</th><th>操作</th></tr>';
  d.users.forEach(u => {
    h += '<tr><td>' + u.id + '</td><td>' + esc(u.username) + '</td><td title="' + esc(u.machine_id) + '">' + esc(u.machine_id).slice(0,12) + '...</td><td>' + fmtTime(u.created_at) + '</td><td><button class="mc-btn mc-btn-red mc-btn-sm" onclick="delUser(' + u.id + ',\'' + esc(u.username) + '\')">KICK</button></td></tr>';
  });
  h += '</table>' + pager(d.total, p, 20);
  m.innerHTML = h;
}

async function delUser(id, name) {
  if (!confirm('确定开除士兵 ' + name + '？将同时删除其绑定和令牌。')) return;
  await api('/users/' + id, { method: 'DELETE' });
  render();
}

async function renderTokens(m) {
  const p = pageState.page || 1;
  const d = await api('/tokens?page=' + p + '&size=20');
  let h = '<h2><span class="crosshair">[T]</span> 通行令牌</h2><table><tr><th>ID</th><th>代号</th><th>IP坐标</th><th>签发时间</th><th>失效时间</th></tr>';
  d.tokens.forEach(t => {
    h += '<tr><td>' + t.id + '</td><td>' + esc(t.username) + '</td><td>' + esc(t.client_ip) + '</td><td>' + fmtTime(t.created_at) + '</td><td>' + fmtTime(t.expires_at) + '</td></tr>';
  });
  h += '</table>' + pager(d.total, p, 20);
  m.innerHTML = h;
}

async function renderMachines(m) {
  const d = await api('/machines');
  let h = '<h2><span class="crosshair">[M]</span> 装备绑定 (' + d.total + ')</h2><table><tr><th>装备码</th><th>绑定士兵</th><th>数量</th><th>操作</th></tr>';
  d.machines.forEach(mc => {
    h += '<tr><td title="' + esc(mc.machine_id) + '">' + esc(mc.machine_id).slice(0,16) + '...</td><td>' + mc.usernames.map(esc).join(', ') + '</td><td>' + mc.count + '</td><td><button class="mc-btn mc-btn-red mc-btn-sm" onclick="delMachine(\'' + esc(mc.machine_id) + '\')">UNBIND</button></td></tr>';
  });
  h += '</table>';
  m.innerHTML = h;
}

async function delMachine(mid) {
  if (!confirm('确定解除该装备的所有绑定？')) return;
  await api('/machines/' + encodeURIComponent(mid), { method: 'DELETE' });
  render();
}

async function renderAnnouncements(m) {
  const d = await api('/announcements');
  let h = '<h2><span class="crosshair">[!]</span> 战报公告</h2><div class="toolbar"><button class="mc-btn mc-btn-grass mc-btn-sm" onclick="showNewAnnouncement()">NEW DISPATCH</button></div>';
  h += '<table><tr><th>ID</th><th>标题</th><th>状态</th><th>优先级</th><th>发布时间</th><th>操作</th></tr>';
  d.announcements.forEach(a => {
    const st = a.active ? '<span class="tag tag-active">LIVE</span>' : '<span class="tag tag-inactive">OFF</span>';
    const imp = a.important ? '<span class="tag tag-important">URGENT</span>' : '-';
    h += '<tr><td>' + a.id + '</td><td>' + esc(a.title) + '</td><td>' + st + '</td><td>' + imp + '</td><td>' + fmtTime(a.created_at) + '</td><td>' + (a.active ? '<button class="mc-btn mc-btn-red mc-btn-sm" onclick="delAnnouncement(' + a.id + ')">HIDE</button>' : '') + '</td></tr>';
  });
  h += '</table>';
  m.innerHTML = h;
}

function showNewAnnouncement() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = '<div class="modal"><h3>[!] 发布战报</h3><input id="annTitle" placeholder="战报标题..." /><textarea id="annContent" placeholder="战报内容（可选）..."></textarea><label><input type="checkbox" id="annImportant" /> 标记为紧急战报</label><div class="modal-btns"><button class="mc-btn mc-btn-sm" onclick="this.closest(\'.modal-overlay\').remove()">CANCEL</button><button class="mc-btn mc-btn-grass mc-btn-sm" onclick="createAnnouncement()">DISPATCH</button></div></div>';
  document.body.appendChild(overlay);
}

async function createAnnouncement() {
  const title = document.getElementById('annTitle').value.trim();
  const content = document.getElementById('annContent').value.trim();
  const important = document.getElementById('annImportant').checked;
  if (!title) return alert('请输入战报标题');
  await fetch('/announcements/', { method: 'POST', headers: headers(), body: JSON.stringify({ title, content: content || null, important }) });
  document.querySelector('.modal-overlay')?.remove();
  render();
}

async function delAnnouncement(id) {
  if (!confirm('确定撤回该战报？')) return;
  await fetch('/announcements/' + id, { method: 'DELETE', headers: headers() });
  render();
}

async function renderAnticheat(m) {
  const p = pageState.page || 1;
  const s = pageState.search || '';
  const d = await api('/anticheat?page=' + p + '&size=20&username=' + encodeURIComponent(s));
  let h = '<h2><span class="crosshair">[X]</span> 违规侦察</h2><div class="toolbar"><input placeholder="搜索代号..." value="' + esc(s) + '" onkeyup="if(event.key===\'Enter\'){pageState.search=this.value;pageState.page=1;render()}" /><button class="mc-btn mc-btn-olive mc-btn-sm" onclick="pageState.search=this.previousElementSibling.value;pageState.page=1;render()">SEARCH</button></div>';
  h += '<table><tr><th>ID</th><th>代号</th><th>IP坐标</th><th>违规次数</th><th>原因</th><th>时间</th></tr>';
  d.logs.forEach(l => {
    h += '<tr><td>' + l.id + '</td><td>' + esc(l.username) + '</td><td>' + esc(l.client_ip) + '</td><td style="color:var(--mc-redstone)">' + l.violation_count + '</td><td>' + esc(l.reason) + '</td><td>' + fmtTime(l.created_at) + '</td></tr>';
  });
  h += '</table>' + pager(d.total, p, 20);
  m.innerHTML = h;
}

async function renderSync(m) {
  const d = await api('/sync-config');
  let h = '<h2><span class="crosshair">[S]</span> 同步管理</h2>';
  // 全局配置
  h += '<div style="margin-bottom:16px;padding:16px;background:var(--bg-card);border:var(--pixel) solid #000;box-shadow:inset -3px -3px 0 0 #222,inset 3px 3px 0 0 #555">';
  h += '<div style="font-family:var(--font-h);font-size:9px;color:var(--mc-diamond);margin-bottom:10px">GLOBAL CONFIG</div>';
  h += '<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">';
  h += '<label style="font-family:var(--font-b);font-size:18px;color:var(--text-secondary)">服务器 IP:</label>';
  h += '<input id="syncServerIp" value="' + esc(d.server_ip || '') + '" style="flex:1;min-width:180px;padding:6px 10px;font-family:var(--font-b);font-size:18px;color:var(--text-primary);background:#000;border:var(--pixel) solid #000;box-shadow:inset 2px 2px 0 0 #222,inset -2px -2px 0 0 #444;outline:none" />';
  h += '<button class="mc-btn mc-btn-olive mc-btn-sm" onclick="saveGlobalSync()">SAVE</button>';
  h += '</div></div>';
  // 文件夹列表
  h += '<div class="toolbar"><button class="mc-btn mc-btn-grass mc-btn-sm" onclick="showAddFolder()">+ ADD FOLDER</button></div>';
  h += '<table><tr><th>ID</th><th>名称</th><th>路径</th><th>扩展名</th><th>优先级</th><th>操作</th></tr>';
  (d.folders || []).forEach(f => {
    h += '<tr><td>' + esc(f.id) + '</td><td>' + esc(f.display_name) + '</td><td title="' + esc(f.path) + '">' + esc(f.path).slice(0,30) + (f.path.length > 30 ? '...' : '') + '</td><td>' + esc((f.extensions||[]).join(', ')) + '</td><td>' + (f.priority||'-') + '</td>';
    h += '<td style="display:flex;gap:4px"><button class="mc-btn mc-btn-olive mc-btn-sm" onclick=\'showEditFolder(' + JSON.stringify(f).replace(/'/g,"&#39;") + ')\'>EDIT</button>';
    h += '<button class="mc-btn mc-btn-red mc-btn-sm" onclick="delFolder(\'' + esc(f.id) + '\')">DEL</button></td></tr>';
  });
  h += '</table>';
  m.innerHTML = h;
}

async function saveGlobalSync() {
  const ip = document.getElementById('syncServerIp').value.trim();
  await api('/sync-config', { method: 'PUT', body: JSON.stringify({ server_ip: ip }) });
  alert('全局配置已保存');
  render();
}

function showAddFolder() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = '<div class="modal"><h3>[+] 添加同步文件夹</h3>'
    + '<input id="sfId" placeholder="文件夹 ID（英文，如 mods）" />'
    + '<input id="sfName" placeholder="显示名称（如 模组文件）" />'
    + '<input id="sfPath" placeholder="服务器路径（如 ../mcserver/mods）" />'
    + '<input id="sfExt" placeholder="扩展名（逗号分隔，如 .jar,.zip）" />'
    + '<input id="sfPriority" placeholder="优先级（数字，越小越先同步）" value="5" />'
    + '<input id="sfUrl" placeholder="下载基础 URL（如 http://mc.sivita.xyz:5806/sync/mods/download）" />'
    + '<div class="modal-btns"><button class="mc-btn mc-btn-sm" onclick="this.closest(\'.modal-overlay\').remove()">CANCEL</button>'
    + '<button class="mc-btn mc-btn-grass mc-btn-sm" onclick="doAddFolder()">ADD</button></div></div>';
  document.body.appendChild(overlay);
}

async function doAddFolder() {
  const id = document.getElementById('sfId').value.trim();
  const display_name = document.getElementById('sfName').value.trim();
  const p = document.getElementById('sfPath').value.trim();
  const ext = document.getElementById('sfExt').value.trim();
  const priority = parseInt(document.getElementById('sfPriority').value) || 5;
  const url = document.getElementById('sfUrl').value.trim();
  if (!id || !display_name || !p || !ext) return alert('请填写所有必填字段');
  const extensions = ext.split(',').map(e => e.trim()).filter(Boolean);
  await api('/sync-folders', { method: 'POST', body: JSON.stringify({ id, display_name, path: p, extensions, priority, download_base_url: url }) });
  document.querySelector('.modal-overlay')?.remove();
  render();
}

function showEditFolder(f) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = '<div class="modal"><h3>[E] 编辑: ' + esc(f.id) + '</h3>'
    + '<input id="sfName" placeholder="显示名称" value="' + esc(f.display_name) + '" />'
    + '<input id="sfPath" placeholder="服务器路径" value="' + esc(f.path) + '" />'
    + '<input id="sfExt" placeholder="扩展名" value="' + esc((f.extensions||[]).join(', ')) + '" />'
    + '<input id="sfPriority" placeholder="优先级" value="' + (f.priority||5) + '" />'
    + '<input id="sfUrl" placeholder="下载基础 URL" value="' + esc(f.download_base_url||'') + '" />'
    + '<div class="modal-btns"><button class="mc-btn mc-btn-sm" onclick="this.closest(\'.modal-overlay\').remove()">CANCEL</button>'
    + '<button class="mc-btn mc-btn-grass mc-btn-sm" onclick="doEditFolder(\'' + esc(f.id) + '\')">SAVE</button></div></div>';
  document.body.appendChild(overlay);
}

async function doEditFolder(id) {
  const display_name = document.getElementById('sfName').value.trim();
  const p = document.getElementById('sfPath').value.trim();
  const ext = document.getElementById('sfExt').value.trim();
  const priority = parseInt(document.getElementById('sfPriority').value) || 5;
  const url = document.getElementById('sfUrl').value.trim();
  const extensions = ext.split(',').map(e => e.trim()).filter(Boolean);
  await api('/sync-folders/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify({ display_name, path: p, extensions, priority, download_base_url: url }) });
  document.querySelector('.modal-overlay')?.remove();
  render();
}

async function delFolder(id) {
  if (!confirm('确定删除同步文件夹 ' + id + '？')) return;
  await api('/sync-folders/' + encodeURIComponent(id), { method: 'DELETE' });
  render();
}

function pager(total, page, size) {
  const pages = Math.ceil(total / size) || 1;
  return '<div class="pager"><button class="mc-btn mc-btn-sm" ' + (page <= 1 ? 'disabled' : 'onclick="pageState.page--;render()"') + '>&lt; PREV</button><span>[ ' + page + ' / ' + pages + ' ] 共 ' + total + ' 条</span><button class="mc-btn mc-btn-sm" ' + (page >= pages ? 'disabled' : 'onclick="pageState.page++;render()"') + '>NEXT &gt;</button></div>';
}

function esc(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function fmtTime(s) { if (!s) return '-'; const d = new Date(s + 'Z'); return d.toLocaleString('zh-CN', {timeZone:'Asia/Shanghai'}); }

// 自动登录
if (TOKEN) {
  api('/stats').then(() => {
    document.getElementById('loginWrap').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    showTab('dashboard');
  }).catch(() => { TOKEN = ''; localStorage.removeItem('admin_token'); });
}

document.getElementById('tokenInput').addEventListener('keyup', e => { if (e.key === 'Enter') doLogin(); });
</script>
</body>
</html>"""
