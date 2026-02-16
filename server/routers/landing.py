from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter(tags=["官网"])


@router.get("/", response_class=HTMLResponse)
def landing_page():
    return LANDING_HTML


LANDING_HTML = r"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>方块回召 Cube Recall - Minecraft 枪械战争服</title>
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap" rel="stylesheet">
<style>
:root{
  --mc-dirt:#866043;--mc-dirt-dark:#593D29;--mc-dirt-light:#9B7653;
  --mc-grass:#5D8C32;--mc-grass-light:#7EC850;--mc-grass-dark:#3B5E1F;
  --mc-stone:#8B8B8B;--mc-stone-dark:#6B6B6B;--mc-stone-light:#AAAAAA;
  --mc-diamond:#5DECF2;--mc-gold:#FCDB05;--mc-redstone:#FF3333;
  --mc-obsidian:#1D1026;
  --bg:#2C2C2C;--bg-card:#393939;
  --text:#E8E8E8;--text-dim:#A0A0A0;
  --pixel:3px;--font-h:'Press Start 2P',monospace;--font-b:'VT323',monospace;
  --mil-olive:#4A5D23;--mil-dark:#1C2410;--mil-gold:#C8A832;
}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:var(--font-b);font-size:20px;background:var(--bg);color:var(--text);image-rendering:pixelated;-webkit-font-smoothing:none;overflow-x:hidden}
::-webkit-scrollbar{width:8px}
::-webkit-scrollbar-track{background:var(--bg)}
::-webkit-scrollbar-thumb{background:var(--mc-stone-dark);border:2px solid var(--bg)}
a{color:var(--mc-diamond);text-decoration:none}
a:hover{text-decoration:underline}

/* ===== NAV ===== */
.nav{position:fixed;top:0;left:0;right:0;z-index:50;background:rgba(44,44,44,.95);border-bottom:var(--pixel) solid #000;box-shadow:0 2px 0 0 #1a1a1a;backdrop-filter:blur(4px)}
.nav-inner{max-width:1100px;margin:0 auto;padding:0 24px;display:flex;align-items:center;justify-content:space-between;height:56px}
.nav-logo{font-family:var(--font-h);font-size:11px;color:var(--mc-gold);text-shadow:2px 2px 0 #000;letter-spacing:1px}
.nav-logo span{color:var(--mc-redstone);font-size:9px;margin-left:6px}
.nav-links{display:flex;gap:24px;align-items:center}
.nav-links a{font-family:var(--font-b);font-size:20px;color:var(--text-dim);text-decoration:none}
.nav-links a:hover{color:var(--mc-grass-light)}

/* ===== MC BUTTON ===== */
.mc-btn{display:inline-flex;align-items:center;justify-content:center;padding:10px 28px;min-height:44px;font-family:var(--font-h);font-size:11px;color:var(--text);background:var(--mc-stone);border:var(--pixel) solid #000;box-shadow:inset -3px -3px 0 0 #555,inset 3px 3px 0 0 #C6C6C6;cursor:pointer;text-shadow:2px 2px 0 rgba(0,0,0,.4);letter-spacing:1px;user-select:none;text-decoration:none}
.mc-btn:hover{background:#A5A5D4;box-shadow:inset -3px -3px 0 0 #6B6BA0,inset 3px 3px 0 0 #D0D0FF;text-decoration:none}
.mc-btn:active{background:var(--mc-stone-dark);box-shadow:inset 3px 3px 0 0 #555,inset -3px -3px 0 0 #888}
.mc-btn-grass{background:var(--mc-grass);box-shadow:inset -3px -3px 0 0 var(--mc-grass-dark),inset 3px 3px 0 0 var(--mc-grass-light)}
.mc-btn-grass:hover{background:#6DA83C}
.mc-btn-big{padding:14px 40px;font-size:13px;min-height:52px}

/* ===== HERO ===== */
.hero{position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;overflow:hidden;background:linear-gradient(180deg,#1a1a1a 0%,var(--bg) 40%,var(--mc-dirt-dark) 90%,var(--mc-dirt) 100%)}
.hero::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0px,transparent 2px,rgba(0,0,0,.03) 2px,rgba(0,0,0,.03) 4px);pointer-events:none}
.hero-content{position:relative;z-index:2;padding:0 24px}
.hero-badge{display:inline-block;font-family:var(--font-h);font-size:8px;color:var(--mc-redstone);background:rgba(255,51,51,.15);border:2px solid var(--mc-redstone);padding:4px 12px;margin-bottom:20px;letter-spacing:2px}
.hero h1{font-family:var(--font-h);font-size:clamp(20px,5vw,36px);color:var(--mc-gold);text-shadow:3px 3px 0 #000,6px 6px 0 rgba(0,0,0,.3);margin-bottom:12px;letter-spacing:2px}
.hero h1 .cn{display:block;font-size:clamp(14px,3vw,20px);color:var(--mc-grass-light);margin-top:8px;text-shadow:2px 2px 0 #000}
.hero-sub{font-family:var(--font-b);font-size:28px;color:var(--text-dim);margin-bottom:32px;text-shadow:1px 1px 0 #000}
.hero-buttons{display:flex;gap:16px;justify-content:center;flex-wrap:wrap}
.hero-ip{margin-top:24px;font-family:var(--font-h);font-size:10px;color:var(--mc-diamond);text-shadow:2px 2px 0 #000;cursor:pointer;padding:8px 20px;border:2px dashed var(--mc-diamond);display:inline-block}
.hero-ip:hover{background:rgba(93,236,242,.1)}
.hero-ip .copied{display:none;color:var(--mc-grass-light)}

/* 像素粒子 */
.particles{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.particle{position:absolute;width:4px;height:4px;image-rendering:pixelated;animation:float linear infinite}
@keyframes float{0%{transform:translateY(100vh) rotate(0deg);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translateY(-20px) rotate(360deg);opacity:0}}

/* ===== GRASS DIVIDER ===== */
.grass-div{height:12px;background:repeating-linear-gradient(90deg,var(--mc-grass) 0px,var(--mc-grass) 4px,var(--mc-grass-dark) 4px,var(--mc-grass-dark) 8px,var(--mc-grass-light) 8px,var(--mc-grass-light) 12px);image-rendering:pixelated;border-top:var(--pixel) solid #000;border-bottom:var(--pixel) solid #000}

/* ===== SECTIONS ===== */
.section{padding:80px 24px;max-width:1100px;margin:0 auto}
.section-title{font-family:var(--font-h);font-size:14px;color:var(--mc-gold);text-shadow:2px 2px 0 #000;text-align:center;margin-bottom:12px;letter-spacing:1px}
.section-sub{font-family:var(--font-b);font-size:22px;color:var(--text-dim);text-align:center;margin-bottom:48px}

/* ===== FEATURES ===== */
.features{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}
.feature-card{background:var(--bg-card);border:var(--pixel) solid #000;box-shadow:inset -3px -3px 0 0 #222,inset 3px 3px 0 0 #555;padding:24px;position:relative;overflow:hidden}
.feature-card::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,var(--mc-grass),var(--mc-grass-dark),var(--mc-grass-light))}
.feature-icon{font-family:var(--font-h);font-size:24px;margin-bottom:12px}
.feature-card h3{font-family:var(--font-h);font-size:10px;color:var(--mc-grass-light);text-shadow:1px 1px 0 #000;margin-bottom:8px;letter-spacing:.5px}
.feature-card p{font-family:var(--font-b);font-size:20px;color:var(--text-dim);line-height:1.4}

/* ===== HOW TO JOIN ===== */
.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px;counter-reset:step}
.step{background:var(--bg-card);border:var(--pixel) solid #000;box-shadow:inset -3px -3px 0 0 #222,inset 3px 3px 0 0 #555;padding:24px;text-align:center;counter-increment:step;position:relative}
.step::before{content:counter(step);font-family:var(--font-h);font-size:28px;color:var(--mc-gold);text-shadow:2px 2px 0 #000;display:block;margin-bottom:12px}
.step h3{font-family:var(--font-h);font-size:9px;color:var(--mc-diamond);text-shadow:1px 1px 0 #000;margin-bottom:8px}
.step p{font-family:var(--font-b);font-size:20px;color:var(--text-dim);line-height:1.4}
.step .arrow{position:absolute;right:-16px;top:50%;transform:translateY(-50%);font-family:var(--font-h);font-size:16px;color:var(--mc-stone);z-index:2}

/* ===== SERVER INFO ===== */
.server-info{background:var(--bg-card);border:var(--pixel) solid #000;box-shadow:inset -3px -3px 0 0 #222,inset 3px 3px 0 0 #555;padding:32px;text-align:center;max-width:600px;margin:0 auto}
.server-info .ip-display{font-family:var(--font-h);font-size:16px;color:var(--mc-diamond);text-shadow:2px 2px 0 #000;margin:16px 0;padding:12px;background:#000;border:var(--pixel) solid #000;box-shadow:inset 2px 2px 0 0 #222,inset -2px -2px 0 0 #444}
.server-info .version{font-family:var(--font-b);font-size:22px;color:var(--mc-grass-light)}

/* ===== FOOTER ===== */
.footer{background:var(--mc-dirt);background-image:repeating-conic-gradient(var(--mc-dirt-dark) 0% 25%,transparent 0% 50%) 0 0/8px 8px,repeating-conic-gradient(var(--mc-dirt-light) 0% 25%,transparent 0% 50%) 4px 4px/8px 8px;border-top:var(--pixel) solid #000;padding:32px 24px;text-align:center}
.footer p{font-family:var(--font-b);font-size:18px;color:var(--mc-dirt-light);text-shadow:1px 1px 0 rgba(0,0,0,.5)}
.footer .brand{font-family:var(--font-h);font-size:9px;color:var(--mc-gold);text-shadow:2px 2px 0 #000;margin-bottom:8px}

/* ===== DARK BG SECTIONS ===== */
.bg-dark{background:var(--mc-obsidian)}
.bg-dirt{background:var(--mc-dirt);background-image:repeating-conic-gradient(var(--mc-dirt-dark) 0% 25%,transparent 0% 50%) 0 0/8px 8px,repeating-conic-gradient(var(--mc-dirt-light) 0% 25%,transparent 0% 50%) 4px 4px/8px 8px}

/* ===== RESPONSIVE ===== */
@media(max-width:768px){
  .nav-links{gap:12px}
  .nav-links a{font-size:16px}
  .hero h1{font-size:20px}
  .step .arrow{display:none}
  .section{padding:48px 16px}
}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important}}
</style>
</head>
<body>

<!-- NAV -->
<nav class="nav">
  <div class="nav-inner">
    <div class="nav-logo">CUBE RECALL <span>// WAR</span></div>
    <div class="nav-links">
      <a href="#features">特色</a>
      <a href="#howto">加入</a>
      <a href="#server">服务器</a>
    </div>
  </div>
</nav>

<!-- HERO -->
<section class="hero">
  <div class="particles" id="particles"></div>
  <div class="hero-content">
    <div class="hero-badge">MINECRAFT FORGE 1.20.1 // TACTICAL WARFARE</div>
    <h1>
      CUBE RECALL
      <span class="cn">方 块 回 召</span>
    </h1>
    <p class="hero-sub">枪林弹雨，方块战场 —— 硬核枪械战争生存服</p>
    <div class="hero-buttons">
      <a class="mc-btn mc-btn-grass mc-btn-big" href="#download" id="dlBtn">DOWNLOAD LAUNCHER</a>
      <a class="mc-btn mc-btn-big" href="#howto">HOW TO JOIN</a>
    </div>
    <div class="hero-ip" onclick="copyIP(this)" title="点击复制">
      SERVER IP: mc.sivita.xyz
      <span class="copied"> - COPIED!</span>
    </div>
  </div>
</section>

<div class="grass-div"></div>

<!-- FEATURES -->
<section class="section" id="features">
  <div class="section-title">[+] FEATURES</div>
  <div class="section-sub">// 服务器特色 //</div>
  <div class="features">
    <div class="feature-card">
      <div class="feature-icon">[GUN]</div>
      <h3>TACZ 枪械模组</h3>
      <p>数十种真实枪械，从手枪到狙击步枪，配件自由搭配，弹道物理模拟，体验硬核射击手感</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">[MOD]</div>
      <h3>自动模组同步</h3>
      <p>专属启动器一键同步服务器模组、配置和资源包，无需手动安装，开箱即玩</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">[ID]</div>
      <h3>账号安全体系</h3>
      <p>独立账号系统 + 机器码绑定 + 登录令牌验证，杜绝盗号和非法登录</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">[AC]</div>
      <h3>反作弊系统</h3>
      <p>服务端反作弊检测，实时监控异常行为，维护公平竞技环境</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">[WAR]</div>
      <h3>战争生存玩法</h3>
      <p>资源争夺、据点攻防、团队协作，在方块世界中展开真实战术对抗</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">[UP]</div>
      <h3>持续更新</h3>
      <p>定期更新武器、地图和玩法，活跃的社区和管理团队，不断带来新鲜体验</p>
    </div>
  </div>
</section>

<div class="grass-div"></div>

<!-- HOW TO JOIN -->
<div class="bg-dark">
<section class="section" id="howto">
  <div class="section-title">[>] HOW TO JOIN</div>
  <div class="section-sub">// 如何加入战场 //</div>
  <div class="steps">
    <div class="step">
      <h3>DOWNLOAD</h3>
      <p>下载 Cube Recall 专属启动器</p>
      <span class="arrow">></span>
    </div>
    <div class="step">
      <h3>REGISTER</h3>
      <p>打开启动器，注册你的战斗代号</p>
      <span class="arrow">></span>
    </div>
    <div class="step">
      <h3>SYNC</h3>
      <p>启动器自动同步模组和配置</p>
      <span class="arrow">></span>
    </div>
    <div class="step">
      <h3>FIGHT!</h3>
      <p>点击启动，进入方块战场！</p>
    </div>
  </div>
  <div style="text-align:center;margin-top:32px" id="download">
    <a class="mc-btn mc-btn-grass mc-btn-big" href="#" id="dlBtn2">DOWNLOAD LAUNCHER</a>
    <p style="margin-top:12px;font-size:18px;color:var(--text-dim)">Windows 64-bit | 约 73MB | 免安装便携版</p>
  </div>
</section>
</div>

<div class="grass-div"></div>

<!-- SERVER INFO -->
<section class="section" id="server">
  <div class="section-title">[S] SERVER</div>
  <div class="section-sub">// 服务器信息 //</div>
  <div class="server-info">
    <div class="version">Minecraft Forge 1.20.1</div>
    <div class="ip-display">mc.sivita.xyz</div>
    <p style="color:var(--text-dim);font-size:20px;margin-bottom:16px">
      使用 Cube Recall 启动器登录后自动连接服务器
    </p>
    <button class="mc-btn" onclick="copyIP(document.querySelector('.hero-ip'))">COPY SERVER IP</button>
  </div>
</section>

<!-- FOOTER -->
<div class="grass-div"></div>
<footer class="footer">
  <div class="brand">CUBE RECALL // 方块回召</div>
  <p>Minecraft Forge 1.20.1 枪械战争服</p>
  <p style="margin-top:8px;font-size:16px;color:var(--mc-stone-dark)">Minecraft is a trademark of Mojang AB. This server is not affiliated with Mojang.</p>
</footer>

<script>
// 复制IP
function copyIP(el) {
  navigator.clipboard.writeText('mc.sivita.xyz').then(() => {
    const sp = el.querySelector('.copied');
    if (sp) { sp.style.display = 'inline'; setTimeout(() => sp.style.display = 'none', 2000); }
  });
}

// 像素粒子
(function(){
  const c = document.getElementById('particles');
  const colors = ['#7EC850','#5D8C32','#FCDB05','#FF3333','#5DECF2','#866043'];
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random()*100 + '%';
    p.style.background = colors[Math.floor(Math.random()*colors.length)];
    p.style.animationDuration = (8 + Math.random()*12) + 's';
    p.style.animationDelay = Math.random()*10 + 's';
    p.style.width = p.style.height = (2 + Math.random()*4) + 'px';
    c.appendChild(p);
  }
})();

// 平滑滚动
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const t = document.querySelector(a.getAttribute('href'));
    if (t) { e.preventDefault(); t.scrollIntoView({behavior:'smooth'}); }
  });
});
</script>
</body>
</html>"""
