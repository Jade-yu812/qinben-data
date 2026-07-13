/**
 * 亲本靓丽 · 品牌运营中心体验平台
 * 多产品、可配置、可扩展的体验数据收集与分析系统
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const PLATFORM_DIR = __dirname;
const PRODUCTS_DIR = path.join(PLATFORM_DIR, 'products');
const CONFIG_FILE = path.join(PLATFORM_DIR, 'config.json');
const DATA_DIR = process.env.VERCEL ? '/tmp' : PLATFORM_DIR;

const MIME = {
  '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8',
  '.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8',
  '.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'
};

// ── Config ───────────────────────────────────────────
function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) return JSON.parse(fs.readFileSync(CONFIG_FILE,'utf-8'));
  const def = { brand:'亲本靓丽', logo:'logo-brand.png', primaryColor:'#B8453A', testerPool:['王佳钰','晴蘭','崋扬','邓婷','王家棋','唐贝贝','刘秀玲','李斐','陶维柏','郭雯浩'] };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(def,null,2));
  return def;
}

// ── Products ─────────────────────────────────────────
function listProducts() {
  if (!fs.existsSync(PRODUCTS_DIR)) return [];
  return fs.readdirSync(PRODUCTS_DIR).filter(d => {
    const sp = path.join(PRODUCTS_DIR, d);
    return fs.statSync(sp).isDirectory() && fs.existsSync(path.join(sp, 'schema.json'));
  }).map(d => {
    const schema = JSON.parse(fs.readFileSync(path.join(PRODUCTS_DIR, d, 'schema.json'), 'utf-8'));
    return { id:schema.id, name:schema.name, icon:schema.icon||'📋', color:schema.color||'#B87C31', description:schema.description||'', testerCount:schema.testerPool?.length||0, completionField:schema.completionField, completionLabel:schema.completionLabel };
  });
}

function getProductSchema(dirName) {
  const fp = path.join(PRODUCTS_DIR, dirName, 'schema.json');
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, 'utf-8'));
}

function getProductData(dirName) {
  const fp = path.join(DATA_DIR, 'data_' + dirName + '.json');
  if (fs.existsSync(fp)) return JSON.parse(fs.readFileSync(fp, 'utf-8'));
  return {};
}

function saveProductData(dirName, data) {
  const fp = path.join(DATA_DIR, 'data_' + dirName + '.json');
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8');
}

// ── Helpers ──────────────────────────────────────────
function sendJSON(res, data, code=200) {
  const body = JSON.stringify(data);
  res.writeHead(code, {'Content-Type':'application/json; charset=utf-8','Content-Length':Buffer.byteLength(body),'Access-Control-Allow-Origin':'*','Cache-Control':'no-cache'});
  res.end(body);
}
function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, {'Content-Type':MIME[ext]||'application/octet-stream','Content-Length':content.length,'Cache-Control':'no-cache, no-store, must-revalidate'});
    res.end(content);
  } catch(e) { res.writeHead(404); res.end('404'); }
}
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body=''; req.on('data',c=>body+=c); req.on('end',()=>{try{resolve(JSON.parse(body))}catch(e){reject(e)}});
  });
}
function getLocalIP() {
  const ifaces = require('os').networkInterfaces();
  for (const n of Object.keys(ifaces)) for (const i of ifaces[n]) if (i.family==='IPv4'&&!i.internal) return i.address;
  return '127.0.0.1';
}

// ── CSV Export ───────────────────────────────────────
function exportCSV(dirName) {
  const schema = getProductSchema(dirName);
  if (!schema) return '';
  const data = getProductData(dirName);
  const testers = schema.testerPool || [];
  const allFields = [];
  schema.sections.forEach(s => s.fields.forEach(f => {
    if (f.type === 'conditional') { allFields.push(f.id); f.subFields.forEach(sf => allFields.push(sf.id)); }
    else if (f.type === 'inline') { f.subFields.forEach(sf => allFields.push(sf.id)); }
    else allFields.push(f.id);
  }));
  let csv = '﻿' + allFields.map(f=>'"'+f+'"').join(',') + '\n';
  testers.forEach(name => {
    const d = data[name] || {};
    csv += allFields.map(f => '"'+String(d[f]||'').replace(/"/g,'""')+'"').join(',') + '\n';
  });
  return csv;
}

// ── Router ───────────────────────────────────────────
async function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;
  const method = req.method;

  try {
    // API: Platform info
    if (pathname === '/api/platform') {
      return sendJSON(res, { config: loadConfig(), products: listProducts() });
    }

    // API: Product schema
    if (pathname.startsWith('/api/schema/')) {
      const dirName = pathname.replace('/api/schema/', '');
      const schema = getProductSchema(dirName);
      return schema ? sendJSON(res, schema) : sendJSON(res, {error:'Not found'}, 404);
    }

    // API: Product data
    if (pathname.startsWith('/api/data/')) {
      const parts = pathname.replace('/api/data/', '').split('/');
      const dirName = parts[0];
      if (method === 'GET') {
        const data = getProductData(dirName);
        return sendJSON(res, data);
      }
      if (method === 'POST') {
        const payload = await parseBody(req);
        const { tester, fields } = payload;
        if (!tester) return sendJSON(res, {ok:false,error:'缺少 tester'}, 400);
        const allData = getProductData(dirName);
        if (!allData[tester]) allData[tester] = {};
        Object.assign(allData[tester], fields);
        saveProductData(dirName, allData);
        return sendJSON(res, {ok:true, tester, product:dirName});
      }
    }

    // API: Delete tester data
    if (pathname.startsWith('/api/delete/')) {
      const parts = pathname.replace('/api/delete/', '').split('/');
      const dirName = parts[0];
      if (method === 'POST') {
        const payload = await parseBody(req);
        const { tester } = payload;
        const allData = getProductData(dirName);
        if (allData[tester]) { delete allData[tester]; saveProductData(dirName, allData); }
        return sendJSON(res, {ok:true});
      }
    }

    // API: Export CSV
    if (pathname.startsWith('/api/export/')) {
      const dirName = pathname.replace('/api/export/', '');
      const csv = exportCSV(dirName);
      const buf = Buffer.from(csv, 'utf-8');
      res.writeHead(200, {'Content-Type':'text/csv; charset=utf-8','Content-Length':buf.length,'Content-Disposition':'attachment; filename="'+dirName+'.csv"','Cache-Control':'no-cache'});
      return res.end(buf);
    }

    // API: Batch export all products
    if (pathname === '/api/export-all') {
      const products = listProducts();
      let allCSV = '';
      for (const p of products) {
        allCSV += '=== ' + p.name + ' ===\n';
        allCSV += exportCSV(p.name) + '\n\n';
      }
      const buf = Buffer.from(allCSV, 'utf-8');
      res.writeHead(200, {'Content-Type':'text/csv; charset=utf-8','Content-Length':buf.length,'Content-Disposition':'attachment; filename="qinben_all_data.csv"','Cache-Control':'no-cache'});
      return res.end(buf);
    }

    // API: Progress
    if (pathname.startsWith('/api/progress/')) {
      const dirName = pathname.replace('/api/progress/', '');
      const schema = getProductSchema(dirName);
      if (!schema) return sendJSON(res, {error:'Not found'}, 404);
      const data = getProductData(dirName);
      const testers = schema.testerPool || [];
      const cf = schema.completionField;
      const total = testers.length;
      const filled = testers.filter(t => data[t] && data[t][cf]).length;
      return sendJSON(res, {total, filled, testers: Object.fromEntries(testers.map(t=>[t,!!(data[t]&&data[t][cf])]))});
    }

    // Static files
    let filePath = path.join(PLATFORM_DIR, pathname === '/' ? 'index.html' : pathname.replace(/^\//, ''));
    if (!filePath.startsWith(PLATFORM_DIR)) { res.writeHead(403); return res.end('403'); }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) return sendFile(res, filePath);
    sendFile(res, path.join(PLATFORM_DIR, 'index.html'));

  } catch(e) {
    console.error('Error:', e.message);
    sendJSON(res, {ok:false, error:e.message}, 500);
  }
}

module.exports = handleRequest;

if (!process.env.VERCEL) {
  const server = http.createServer(handleRequest);
  server.listen(PORT, '0.0.0.0', () => {
    console.log('\n  🏢 亲本靓丽 · 品牌体验平台');
    console.log(`  📡 http://${getLocalIP()}:${PORT}`);
    console.log(`  📦 ${listProducts().length} 个产品已加载\n`);
  });
}
