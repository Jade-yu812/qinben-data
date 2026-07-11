/**
 * 亲本靓丽 · 产品体验数据收集服务器
 * 启动后体验者在手机浏览器打开链接即可填写，数据统一存到 data.json
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 8080;
const SERVER_DIR = __dirname;
const DATA_FILE = process.env.VERCEL ? '/tmp/data.json' : path.join(SERVER_DIR, 'data.json');

// ── MIME ───────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// ── 数据操作 ───────────────────────────────────────────
function loadAllData() {
  if (fs.existsSync(DATA_FILE)) {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  }
  return { A: {}, B: {}, _profile: {} };
}

function saveAllData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// ── CSV 导出 ──────────────────────────────────────────
function generateCSV() {
  const testers = [
    '王佳钰', '晴蘭', '崋扬', '邓婷', '王家棋',
    '唐贝贝', '刘秀玲', '李斐', '陶维柏', '郭雯浩'
  ];
  const all = loadAllData();
  const profile = all._profile || {};

  const mergeData = (product, tester) => {
    const pd = (all[product] && all[product][tester]) ? all[product][tester] : {};
    const pf = profile[tester] || {};
    return { ...pd, ...pf };
  };

  let csv = '﻿=== 产品A · 活体验报告 ===\n';
  csv += '姓名,年龄,性别,日期,饮用月,饮用日,饮用时,饮用分,空腹时长(h),是否酸甜,是否苦涩,是否顺滑,是否有异物感,其他口感,余味,接受度,是否发热,发热部位,发热强度,是否发红,发红部位,发红程度,是否发痒,发痒部位,发痒强度,是否有痛感,痛感部位,痛感强度,痛感持续性,是否发麻,发麻部位,发麻强度,是否出汗,是否心跳变化,其他体感,体感综合强度,舒适度,痛感/发麻可接受度,补充建议\n';
  testers.forEach(name => {
    const d = mergeData('A', name);
    const row = [d.name||name,d.age||'',d.gender||'',d.date||'',d.drinkMonth||'',d.drinkDay||'',d.drinkHour||'',d.drinkMin||'',d.fastingHours||'',
      d.sourSweet||'',d.bitter||'',d.smooth||'',d.foreignBody||'',d.tasteOther||'',d.aftertaste||'',d.acceptance||'',
      d.fever||'',d.feverPart||'',d.feverIntensity||'',d.redness||'',d.rednessPart||'',d.rednessDegree||'',
      d.itching||'',d.itchingPart||'',d.itchingIntensity||'',d.pain||'',d.painPart||'',d.painIntensity||'',d.painDuration||'',
      d.numbness||'',d.numbnessPart||'',d.numbnessIntensity||'',d.sweat||'',d.heartbeat||'',d.bodyOther||'',
      d.bodyIntensity||'',d.comfort||'',d.painAcceptable||'',d.suggestion||''];
    csv += row.map(c => '"' + String(c).replace(/"/g,'""') + '"').join(',') + '\n';
  });

  csv += '\n=== 产品B · 润体验报告 ===\n';
  csv += '姓名,年龄,性别,日期,饮用月,饮用日,饮用时,饮用分,吸烟前N分钟,吸烟M支,是否顺滑,是否呛喉,呛喉强度,其他口感,是否回甘,接受度,咽喉干涩缓解(1-5),呼吸顺畅提升(1-5),清凉/滋润感,清凉强度,是否生津,痰感变化,舒适感持续(分钟),30分钟后喉咙,满意度(1-5),是否愿意再次使用,最满意,最不满意,其他建议\n';
  testers.forEach(name => {
    const d = mergeData('B', name);
    const row = [d.name||name,d.age||'',d.gender||'',d.date||'',d.drinkMonth||'',d.drinkDay||'',d.drinkHour||'',d.drinkMin||'',d.smokeMinutes||'',d.smokeCount||'',
      d.smoothB||'',d.throatIrritation||'',d.throatIrritationIntensity||'',d.tasteOtherB||'',d.sweetAfter||'',d.acceptanceB||'',
      d.throatRelief||'',d.breathImprove||'',d.coolFeeling||'',d.coolFeelingIntensity||'',
      d.salivaIncrease||'',d.phlegmChange||'',d.comfortDuration||'',d.after30minThroat||'',
      d.satisfaction||'',d.reuseWilling||'',d.bestPart||'',d.worstPart||'',d.suggestionB||''];
    csv += row.map(c => '"' + String(c).replace(/"/g,'""') + '"').join(',') + '\n';
  });

  return csv;
}

function getProgress() {
  const testers = [
    '王佳钰', '晴蘭', '崋扬', '邓婷', '王家棋',
    '唐贝贝', '刘秀玲', '李斐', '陶维柏', '郭雯浩'
  ];
  const allData = loadAllData();
  const result = {};
  for (const p of ['A', 'B']) {
    const productData = allData[p] || {};
    result[p] = {
      total: 10,
      filled: testers.filter(t => {
        const d = productData[t];
        return d && (d.suggestion || d.suggestionB);
      }).length,
      testers: Object.fromEntries(testers.map(t => [t, !!productData[t]]))
    };
  }
  return result;
}

// ── 响应工具 ───────────────────────────────────────────
function sendJSON(res, data, code = 200) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*'
  });
  res.end(body);
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';
  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': content.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(content);
  } catch (e) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

// ── 路由 ───────────────────────────────────────────────
async function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const method = req.method;
  const pathname = url.pathname;

  console.log(`  ${method === 'POST' ? '📥' : '📤'} ${method} ${pathname}`);

  try {
    // ── API ──
    if (pathname === '/api/data') {
      const all = loadAllData();
      // Merge profile data into each product's tester data for client compatibility
      const profile = all._profile || {};
      const result = { A: {}, B: {}, _profile: profile };
      for (const p of ['A', 'B']) {
        const productData = all[p] || {};
        for (const tester of Object.keys({...productData, ...profile})) {
          result[p][tester] = { ...(productData[tester] || {}), ...(profile[tester] || {}) };
        }
      }
      return sendJSON(res, result);
    }
    if (pathname === '/api/data/product-a') {
      const all = loadAllData();
      return sendJSON(res, all.A || {});
    }
    if (pathname === '/api/data/product-b') {
      const all = loadAllData();
      return sendJSON(res, all.B || {});
    }
    if (pathname === '/api/progress') {
      return sendJSON(res, getProgress());
    }
    if (pathname === '/api/export-csv') {
      const csv = generateCSV();
      const buf = Buffer.from(csv, 'utf-8');
      const filename = 'qinben_data_' + new Date().toISOString().split('T')[0] + '.csv';
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Length': buf.length,
        'Content-Disposition': 'attachment; filename="' + filename + '"',
        'Cache-Control': 'no-cache'
      });
      res.end(buf);
      console.log('     📥 CSV 已下载');
      return;
    }

    if (method === 'POST' && pathname === '/api/save') {
      const payload = await parseBody(req);
      const { product, tester, data } = payload;
      if (!product || !tester || !data) {
        return sendJSON(res, { ok: false, error: '缺少 product/tester/data' }, 400);
      }
      const all = loadAllData();
      // New format: data = { profile: {...}, product: {...} }
      if (data.profile) {
        if (!all._profile) all._profile = {};
        all._profile[tester] = data.profile;
      }
      if (data.product) {
        if (!all[product]) all[product] = {};
        all[product][tester] = data.product;
      } else {
        // Legacy format: data = product fields directly
        if (!all[product]) all[product] = {};
        all[product][tester] = data;
      }
      saveAllData(all);
      console.log(`     💾 已保存: 产品${product} - ${tester}`);
      return sendJSON(res, { ok: true, tester, product });
    }

    if (method === 'POST' && pathname === '/api/save-profile') {
      const payload = await parseBody(req);
      const { tester, field, value } = payload;
      if (!tester) {
        return sendJSON(res, { ok: false, error: '缺少 tester' }, 400);
      }
      const all = loadAllData();
      if (!all._profile) all._profile = {};
      if (!all._profile[tester]) all._profile[tester] = {};
      all._profile[tester][field] = value;
      saveAllData(all);
      return sendJSON(res, { ok: true });
    }

    if (method === 'POST' && pathname === '/api/delete') {
      const payload = await parseBody(req);
      const { product, tester } = payload;
      if (!product || !tester) {
        return sendJSON(res, { ok: false, error: '缺少 product/tester' }, 400);
      }
      const all = loadAllData();
      if (all[product] && all[product][tester]) {
        delete all[product][tester];
        saveAllData(all);
      }
      return sendJSON(res, { ok: true });
    }

    if (method === 'POST' && pathname === '/api/reset') {
      if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE);
      console.log('     🗑️  数据已清空');
      return sendJSON(res, { ok: true, message: '数据已清空' });
    }

    // ── Static files ──
    let filePath = path.join(SERVER_DIR, pathname === '/' ? 'index.html' : pathname.replace(/^\//, ''));
    // Security: stay within SERVER_DIR
    if (!filePath.startsWith(SERVER_DIR)) {
      res.writeHead(403);
      return res.end('403 Forbidden');
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return sendFile(res, filePath);
    }
    // Fallback to index.html for SPA-style routing
    sendFile(res, path.join(SERVER_DIR, 'index.html'));

  } catch (e) {
    console.error('  ❌ 错误:', e.message);
    sendJSON(res, { ok: false, error: e.message }, 500);
  }
}

// ── 启动 ───────────────────────────────────────────────
function getLocalIP() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const localIP = getLocalIP();

console.log('');
console.log('  ╔══════════════════════════════════════════╗');
console.log('  ║    🏢 亲本靓丽 · 体验数据收集服务器      ║');
console.log('  ╠══════════════════════════════════════════╣');
console.log(`  ║  本机访问:  http://localhost:${PORT}        `);
console.log(`  ║  局域网:    http://${localIP}:${PORT}       `);
console.log('  ║                                          ║');
console.log('  ║  📱 手机连接同一WiFi，微信打开局域网地址  ║');
console.log('  ║  💾 数据文件: data.json                  ║');
console.log('  ║  🛑 按 Ctrl+C 停止服务器                 ║');
console.log('  ╚══════════════════════════════════════════╝');
console.log('');

// Export for Vercel serverless
module.exports = handleRequest;

// Standalone mode (not on Vercel)
if (!process.env.VERCEL) {
  const server = http.createServer(handleRequest);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`  ✅ 服务器已启动，等待连接...\n`);
  });
}
