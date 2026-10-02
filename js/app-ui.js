/* ============================================================
   app-ui.js — 界面交互层
   配色面板 · 数据表格 · 导入导出 · 事件绑定 · 启动
   ============================================================ */
(function (global) {
  'use strict';

  const P = global.Palettes;
  const D = global.Dataset;
  const C = global.ChartCore;
  const CT = C.CT;
  const A = global.APP;
  const S = A.state;

  const STORE_KEY = 'control-echarts-v1';
  const REPO_URL = 'https://github.com/yxpil/ControlEcharts';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.prototype.slice.call(document.querySelectorAll(sel));

  /* ============================================================
     Toast
     ============================================================ */
  const ICONS = { ok: 'i-check', err: 'i-close', warn: 'i-sparkles', info: 'i-sparkles' };

  function toast(msg, kind, ms) {
    const box = $('#toasts');
    if (!box) return;
    const k = kind || 'info';
    const el = document.createElement('div');
    el.className = 'toast ' + k;
    el.innerHTML = '<svg viewBox="0 0 24 24"><use href="#' + (ICONS[k] || ICONS.info) + '"/></svg><span>' + A.esc(msg) + '</span>';
    box.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 220);
    }, ms || 2600);
  }

  /* ============================================================
     模态框
     ============================================================ */
  function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('open');
  }
  function closeModal(el) {
    const m = el ? (el.closest ? el.closest('.modal') : null) : null;
    if (m) m.classList.remove('open');
  }
  function closeAllModals() { $$('.modal').forEach((m) => m.classList.remove('open')); }

  /* ============================================================
     图表类型画廊
     ============================================================ */
  function renderTypes(keyword) {
    const box = $('#chart-types');
    if (!box) return;
    const kw = String(keyword || '').trim().toLowerCase();
    let html = '';
    let hit = 0;

    CT.groups.forEach((g) => {
      const items = g.items.filter((it) => {
        if (!kw) return true;
        return (it.name + it.id + it.group + (it.shape || '')).toLowerCase().indexOf(kw) !== -1;
      });
      if (!items.length) return;
      hit += items.length;
      html += '<div class="type-group"><div class="type-group-title">' + A.esc(g.name) + '</div><div class="type-grid">';
      items.forEach((it) => {
        html += '<button class="type-card' + (it.id === S.chartType ? ' active' : '') + '" data-type="' + it.id + '" title="' +
          A.esc(it.name + ' · 数据形态：' + (it.shape || '通用')) + '">' +
          '<svg viewBox="0 0 24 24"><use href="#' + it.icon + '"/></svg>' +
          '<span>' + A.esc(it.name) + '</span></button>';
      });
      html += '</div></div>';
    });

    if (!hit) html = '<div class="no-result">未找到匹配的图表类型<br>试试「柱状」「折线」「饼图」</div>';
    box.innerHTML = html;
  }

  function setChartType(id) {
    const def = CT.map[id];
    if (!def) return;
    S.chartType = id;
    A.ensureCfg();
    A.applyPreset(def);
    $$('.type-card').forEach((c) => c.classList.toggle('active', c.dataset.type === id));
    A.renderConfig();
    syncControls();
    A.render();
    save();
  }

  /* ============================================================
     配色面板
     ============================================================ */
  function renderColorPanel() {
    // 单色基础色
    const monoBox = $('#mono-bases');
    if (monoBox) {
      monoBox.innerHTML = P.MONO_BASES.map((b) =>
        '<button class="swatch' + (b.id === S.colors.monoBase ? ' active' : '') + '" data-mono="' + b.id +
        '" style="background:' + b.hex + '" title="' + A.esc(b.name + ' ' + b.hex) + '"></button>'
      ).join('');
    }
    // 多色方案
    const multiBox = $('#multi-list');
    if (multiBox) {
      multiBox.innerHTML = P.MULTI_PALETTES.map((p) =>
        '<div class="palette-item' + (p.id === S.colors.multiId ? ' active' : '') + '" data-multi="' + p.id + '">' +
        '<div class="palette-name"><span>' + A.esc(p.name) + '</span><small>' + p.colors.length + ' 色</small></div>' +
        '<div class="palette-bar">' + p.colors.map((c) => '<i style="background:' + c + '"></i>').join('') + '</div>' +
        '</div>'
      ).join('');
    }
    renderCustomColors();
    syncControls();
  }

  function renderCustomColors() {
    const box = $('#custom-colors');
    if (!box) return;
    if (!S.colors.custom.length) {
      box.innerHTML = '<div class="pane-hint">尚未添加自定义颜色，点击下方按钮开始添加。</div>';
      return;
    }
    box.innerHTML = S.colors.custom.map((c, i) =>
      '<div class="custom-color-row">' +
      '<input type="color" data-ccolor="' + i + '" value="' + (P.normHex(c) || '#4c8dff') + '">' +
      '<input type="text" data-ctext="' + i + '" value="' + A.esc(c) + '" spellcheck="false">' +
      '<button class="del" data-cdel="' + i + '" title="删除该颜色"><svg viewBox="0 0 24 24"><use href="#i-close"/></svg></button>' +
      '</div>'
    ).join('');
  }

  /* ============================================================
     控件同步
     ============================================================ */
  function syncControls() {
    $$('#color-mode button').forEach((b) => b.classList.toggle('active', b.dataset.mode === S.colors.mode));
    $$('[data-colorpanel]').forEach((p) => p.classList.toggle('hidden', p.dataset.colorpanel !== S.colors.mode));

    const monoMode = $('#mono-mode');
    if (monoMode) monoMode.value = S.colors.monoMode;
    const repeat = $('#multi-repeat');
    if (repeat) repeat.value = S.colors.multiRepeat;
    const op = $('#color-opacity');
    if (op) { op.value = S.colors.opacity; op.style.setProperty('--pct', S.colors.opacity + '%'); }
    const opv = $('#opacity-val');
    if (opv) opv.textContent = S.colors.opacity + '%';
    const jt = $('#color-jitter');
    if (jt) { jt.value = S.colors.jitter; jt.style.setProperty('--pct', (S.colors.jitter / 40 * 100) + '%'); }
    const jtv = $('#jitter-val');
    if (jtv) jtv.textContent = S.colors.jitter;
    const grad = $('#mono-gradient');
    if (grad) grad.checked = S.cfg.fillMode === 'gradient';
    const bg = $('#chart-bg');
    if (bg) bg.value = S.cfg.chartBg || 'transparent';

    A.updateChips();
  }

  /* ============================================================
     数据表格
     ============================================================ */
  const MAX_ROWS_RENDER = 3000;

  function renderTable() {
    const t = $('#data-table');
    if (!t) return;
    const ds = S.dataset;
    const cols = ds.columns || [];
    const rows = ds.rows || [];

    let html = '<thead><tr><th class="rownum">#</th>';
    cols.forEach((c, i) => {
      html += '<th><div class="cell-head">' +
        '<input value="' + A.esc(c) + '" data-colname="' + i + '" spellcheck="false" title="点击重命名列">' +
        '<button class="col-del" data-delcol="' + i + '" title="删除该列"><svg viewBox="0 0 24 24"><use href="#i-close"/></svg></button>' +
        '</div></th>';
    });
    html += '<th class="rownum" style="min-width:34px"></th></tr></thead><tbody>';

    rows.slice(0, MAX_ROWS_RENDER).forEach((r, ri) => {
      html += '<tr><td class="rownum">' + (ri + 1) + '</td>';
      cols.forEach((c, ci) => {
        const v = r[ci] === undefined || r[ci] === null ? '' : r[ci];
        const isnum = typeof v === 'number';
        html += '<td class="' + (isnum ? 'is-number' : '') + '">' +
          '<input value="' + A.esc(v) + '" data-cell="' + ri + '_' + ci + '" spellcheck="false"></td>';
      });
      html += '<td class="row-del-cell"><button data-delrow="' + ri + '" title="删除该行"><svg viewBox="0 0 24 24"><use href="#i-close"/></svg></button></td></tr>';
    });
    html += '</tbody>';
    t.innerHTML = html;

    const stat = $('#data-stat');
    if (stat) {
      let extra = rows.length > MAX_ROWS_RENDER ? '（仅显示前 ' + MAX_ROWS_RENDER + ' 行）' : '';
      stat.textContent = rows.length + ' 行 x ' + cols.length + ' 列' + extra;
    }
  }

  function ensureShape() {
    const ds = S.dataset;
    if (!ds.columns.length) ds.columns = ['类别'];
    ds.rows.forEach((r) => { while (r.length < ds.columns.length) r.push(''); });
    ds.rows = ds.rows.map((r) => r.slice(0, ds.columns.length));
  }

  function setCell(ri, ci, raw) {
    const ds = S.dataset;
    if (!ds.rows[ri]) return;
    ds.rows[ri][ci] = D.coerce(raw);
  }

  /* ============================================================
     载入数据
     ============================================================ */
  function loadDataset(ds, opts) {
    const o = opts || {};
    S.dataset = { columns: ds.columns.slice(), rows: ds.rows.map((r) => r.slice()) };
    ensureShape();
    if (o.chartType && CT.map[o.chartType]) {
      S.chartType = o.chartType;
      A.ensureCfg();
      A.applyPreset(CT.map[o.chartType]);
      A.renderConfig();
    }
    if (o.title !== undefined) S.cfg.title = o.title;
    renderTable();
    renderTypes($('#type-search') ? $('#type-search').value : '');
    A.render();
    save();
  }

  /* ============================================================
     导入
     ============================================================ */
  function importText(text, opts) {
    const o = opts || {};
    const parsed = D.parseText(text, { delimiter: o.delimiter || 'auto', header: o.header !== false });
    if (!parsed.columns.length || !parsed.rows.length) {
      toast('未解析到有效数据，请检查内容或分隔符', 'warn');
      return false;
    }
    loadDataset(parsed, { title: o.title });
    toast('已导入 ' + parsed.rows.length + ' 行 x ' + parsed.columns.length + ' 列', 'ok');
    return true;
  }

  function readFile(file) {
    const name = String(file.name || '').toLowerCase();
    if (/\.(xlsx|xls)$/.test(name)) {
      toast('不支持直接读取 Excel 二进制文件，请在 Excel/WPS 中另存为 CSV 后再导入', 'warn', 4200);
      return;
    }
    const reader = new FileReader();
    reader.onload = function () {
      const text = String(reader.result || '');
      if (/\.json$/.test(name)) {
        let obj = null;
        try { obj = JSON.parse(text); } catch (e) {
          toast('JSON 解析失败：' + e.message, 'err');
          return;
        }
        if (obj && obj.dataset && obj.dataset.columns) {
          if (obj.cfg) Object.assign(S.cfg, obj.cfg);
          if (obj.colors) Object.assign(S.colors, obj.colors);
          if (obj.chartType && CT.map[obj.chartType]) S.chartType = obj.chartType;
          if (obj.theme) applyTheme(obj.theme);
          loadDataset(obj.dataset, { chartType: S.chartType });
          renderConfigAndColors();
          toast('工程已载入', 'ok');
          return;
        }
        if (obj && obj.columns && obj.rows) {
          loadDataset(obj);
          toast('已导入 JSON 数据集', 'ok');
          return;
        }
        toast('未识别的 JSON 结构，需包含 columns 与 rows 字段', 'warn', 3800);
        return;
      }
      importText(text, { title: file.name.replace(/\.[^.]+$/, '') });
    };
    reader.readAsText(file, 'UTF-8');
  }

  /* ============================================================
     导出
     ============================================================ */
  function download(filename, content, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 120);
  }

  function safeName() {
    const t = String(S.cfg.title || 'chart').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 48);
    return t || 'chart';
  }

  function exportPNG() {
    const ch = A.getChart();
    if (!ch) return;
    try {
      const url = ch.getDataURL({
        type: 'png', pixelRatio: 2,
        backgroundColor: (S.cfg.chartBg && S.cfg.chartBg !== 'transparent') ? S.cfg.chartBg : '#ffffff'
      });
      const a = document.createElement('a');
      a.href = url;
      a.download = safeName() + '.png';
      a.click();
      toast('PNG 已导出（2 倍像素密度）', 'ok');
    } catch (e) {
      toast('导出失败：' + e.message, 'err');
    }
  }

  function exportSVG() {
    const svg = document.querySelector('#chart svg');
    if (!svg) {
      toast('当前没有可导出的矢量图形，请先确认图表已渲染', 'warn');
      return;
    }
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    const w = svg.getAttribute('width') || svg.clientWidth || 800;
    const h = svg.getAttribute('height') || svg.clientHeight || 520;
    clone.setAttribute('width', w);
    clone.setAttribute('height', h);
    clone.setAttribute('viewBox', '0 0 ' + parseFloat(w) + ' ' + parseFloat(h));

    if (S.cfg.chartBg && S.cfg.chartBg !== 'transparent') {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', '0'); rect.setAttribute('y', '0');
      rect.setAttribute('width', '100%'); rect.setAttribute('height', '100%');
      rect.setAttribute('fill', S.cfg.chartBg);
      clone.insertBefore(rect, clone.firstChild);
    }
    const src = new XMLSerializer().serializeToString(clone);
    download(safeName() + '.svg', '<?xml version="1.0" encoding="UTF-8"?>\n' + src, 'image/svg+xml');
    toast('SVG 矢量图已导出', 'ok');
  }

  function jsLiteral(v, indent) {
    const pad = new Array(indent + 1).join('  ');
    if (v === null) return 'null';
    if (v === undefined) return 'undefined';
    const t = typeof v;
    if (t === 'number' || t === 'boolean') return String(v);
    if (t === 'string') return JSON.stringify(v);
    if (t === 'function') return v.toString();
    if (Array.isArray(v)) {
      if (!v.length) return '[]';
      const items = v.map((x) => jsLiteral(x, indent + 1));
      const one = '[' + items.join(', ') + ']';
      if (one.length <= 100 && one.indexOf('\n') === -1) return one;
      return '[\n' + items.map((x) => pad + '  ' + x).join(',\n') + '\n' + pad + ']';
    }
    if (t === 'object') {
      const keys = Object.keys(v).filter((k) => v[k] !== undefined && k.charAt(0) !== '_' && k !== 'id' && k !== 'global');
      if (!keys.length) return '{}';
      const items = keys.map((k) => {
        const key = /^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k);
        return key + ': ' + jsLiteral(v[k], indent + 1);
      });
      const one = '{ ' + items.join(', ') + ' }';
      if (one.length <= 100 && one.indexOf('\n') === -1) return one;
      return '{\n' + items.map((x) => pad + '  ' + x).join(',\n') + '\n' + pad + '}';
    }
    return JSON.stringify(String(v));
  }

  function buildOptionCode() {
    const def = CT.map[S.chartType];
    if (!def) return '{}';
    const ctx = A.buildCtx(A.colorCount(S.chartType, S.dataset));
    let option = null;
    try { option = def.build(S.dataset, S.cfg, ctx); } catch (e) { return '/* 构建失败：' + e.message + ' */'; }
    if (!option) return '{}';
    delete option.__meta;
    return jsLiteral(option, 0);
  }

  function buildStandaloneHTML() {
    const code = buildOptionCode();
    const bg = (S.cfg.chartBg && S.cfg.chartBg !== 'transparent') ? S.cfg.chartBg : '#ffffff';
    return [
      '<!DOCTYPE html>',
      '<html lang="zh-CN">',
      '<head>',
      '<meta charset="UTF-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
      '<title>' + A.esc(S.cfg.title || 'ECharts 图表') + '</title>',
      '<style>',
      '  html,body{margin:0;height:100%;background:' + bg + ';}',
      '  #chart{width:100%;height:100%;}',
      '</style>',
      '</head>',
      '<body>',
      '  <div id="chart"></div>',
      '  <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js"><\/script>',
      '  <script>',
      '    var chart = echarts.init(document.getElementById("chart"), null, { renderer: "svg" });',
      '    var option = ' + code + ';',
      '    chart.setOption(option);',
      '    window.addEventListener("resize", function () { chart.resize(); });',
      '  <\/script>',
      '</body>',
      '</html>'
    ].join('\n');
  }

  function showCode(kind) {
    const pre = $('#code-out');
    const title = $('#code-title');
    if (!pre) return;
    $$('#modal-code .modal-tabs button').forEach((b) => b.classList.toggle('active', b.dataset.code === kind));
    if (kind === 'html') {
      if (title) title.textContent = '独立 HTML 文件';
      pre.textContent = buildStandaloneHTML();
    } else {
      if (title) title.textContent = 'ECharts option 配置';
      pre.textContent = 'var option = ' + buildOptionCode() + ';';
    }
    pre.dataset.kind = kind;
  }

  function exportJSONProject() {
    const payload = {
      app: 'ControlEcharts',
      version: 1,
      exportedAt: new Date().toISOString(),
      chartType: S.chartType,
      theme: S.theme,
      renderer: S.renderer,
      dataset: S.dataset,
      cfg: S.cfg,
      colors: S.colors
    };
    download(safeName() + '.json', JSON.stringify(payload, null, 2), 'application/json');
    toast('工程文件已导出', 'ok');
  }

  function exportCSV() {
    const csv = D.toCSV(S.dataset.columns, S.dataset.rows);
    download(safeName() + '.csv', '\ufeff' + csv, 'text/csv;charset=utf-8');
    toast('数据已导出为 CSV', 'ok');
  }

  /* ============================================================
     持久化
     ============================================================ */
  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify({
          chartType: S.chartType,
          dataset: S.dataset,
          cfg: S.cfg,
          colors: S.colors,
          theme: S.theme,
          renderer: S.renderer,
          v: 1
        }));
      } catch (e) { /* 忽略配额错误 */ }
    }, 420);
  }

  function restore() {
    let raw = null;
    try { raw = localStorage.getItem(STORE_KEY); } catch (e) { raw = null; }
    if (!raw) return false;
    try {
      const o = JSON.parse(raw);
      if (!o || !o.dataset || !o.dataset.columns) return false;
      S.dataset = o.dataset;
      if (o.cfg) Object.assign(S.cfg, o.cfg);
      if (o.colors) Object.assign(S.colors, o.colors);
      if (o.chartType && CT.map[o.chartType]) S.chartType = o.chartType;
      S.theme = o.theme === 'light' ? 'light' : 'dark';
      S.renderer = o.renderer === 'canvas' ? 'canvas' : 'svg';
      return true;
    } catch (e) { return false; }
  }

  /* ============================================================
     主题
     ============================================================ */
  function applyTheme(theme) {
    S.theme = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', S.theme);
    const btn = $('#btn-theme');
    if (btn) btn.innerHTML = '<svg viewBox="0 0 24 24"><use href="#' + (S.theme === 'dark' ? 'i-moon' : 'i-sun') + '"/></svg>';
    A.render();
    save();
  }

  function renderConfigAndColors() {
    A.renderConfig();
    renderColorPanel();
    renderTable();
    renderTypes($('#type-search') ? $('#type-search').value : '');
    A.render();
  }

  /* ============================================================
     缩放与全屏
     ============================================================ */
  function applyZoom() {
    const el = $('#chart');
    if (el) el.style.transform = S.zoom === 1 ? '' : 'scale(' + S.zoom + ')';
    const stage = $('#chart-stage');
    if (el) el.style.transformOrigin = 'center center';
    if (stage) stage.style.overflow = 'hidden';
  }

  /* ============================================================
     事件绑定
     ============================================================ */
  function bind() {
    /* --- 左侧页签 --- */
    $$('.side-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        $$('.side-tab').forEach((t) => t.classList.toggle('active', t === tab));
        $$('.side-pane').forEach((p) => p.classList.toggle('active', p.dataset.pane === tab.dataset.side));
      });
    });

    /* --- 图表类型 --- */
    $('#chart-types').addEventListener('click', (e) => {
      const card = e.target.closest('.type-card');
      if (card) setChartType(card.dataset.type);
    });
    $('#type-search').addEventListener('input', (e) => renderTypes(e.target.value));

    /* --- 配色模式 --- */
    $('#color-mode').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      S.colors.mode = b.dataset.mode;
      syncControls();
      A.render();
      save();
    });
    $('#mono-bases').addEventListener('click', (e) => {
      const b = e.target.closest('[data-mono]');
      if (!b) return;
      S.colors.monoBase = b.dataset.mono;
      S.colors.mode = 'mono';
      syncControls();
      renderColorPanel();
      A.render();
      save();
    });
    $('#multi-list').addEventListener('click', (e) => {
      const it = e.target.closest('[data-multi]');
      if (!it) return;
      S.colors.multiId = it.dataset.multi;
      S.colors.mode = 'multi';
      syncControls();
      renderColorPanel();
      A.render();
      save();
    });
    $('#mono-mode').addEventListener('change', (e) => { S.colors.monoMode = e.target.value; A.render(); save(); });
    $('#multi-repeat').addEventListener('change', (e) => { S.colors.multiRepeat = e.target.value; A.render(); save(); });
    $('#mono-gradient').addEventListener('change', (e) => { S.cfg.fillMode = e.target.checked ? 'gradient' : 'solid'; A.renderConfig(); A.render(); save(); });

    $('#color-opacity').addEventListener('input', (e) => {
      S.colors.opacity = Number(e.target.value);
      const v = $('#opacity-val');
      if (v) v.textContent = S.colors.opacity + '%';
      e.target.style.setProperty('--pct', S.colors.opacity + '%');
      A.reRenderDebounced();
    });
    $('#color-opacity').addEventListener('change', save);
    $('#color-jitter').addEventListener('input', (e) => {
      S.colors.jitter = Number(e.target.value);
      const v = $('#jitter-val');
      if (v) v.textContent = S.colors.jitter;
      e.target.style.setProperty('--pct', (S.colors.jitter / 40 * 100) + '%');
      A.reRenderDebounced();
    });
    $('#color-jitter').addEventListener('change', save);
    $('#chart-bg').addEventListener('change', (e) => { S.cfg.chartBg = e.target.value; A.render(); save(); });

    /* --- 自定义颜色 --- */
    $('#custom-colors').addEventListener('input', (e) => {
      const ci = e.target.dataset.ccolor;
      const ti = e.target.dataset.ctext;
      if (ci !== undefined) {
        S.colors.custom[Number(ci)] = e.target.value;
        const row = e.target.parentElement;
        const txt = row.querySelector('[data-ctext]');
        if (txt) txt.value = e.target.value;
      } else if (ti !== undefined) {
        const hex = P.normHex(e.target.value);
        if (hex) {
          S.colors.custom[Number(ti)] = hex;
          const row = e.target.parentElement;
          const col = row.querySelector('[data-ccolor]');
          if (col) col.value = hex;
        }
      } else return;
      S.colors.mode = 'custom';
      syncControls();
      A.render();
    });
    $('#custom-colors').addEventListener('change', save);
    $('#custom-colors').addEventListener('click', (e) => {
      const del = e.target.closest('[data-cdel]');
      if (!del) return;
      S.colors.custom.splice(Number(del.dataset.cdel), 1);
      renderCustomColors();
      A.render();
      save();
    });
    $('#btn-add-color').addEventListener('click', () => {
      const base = P.MULTI_PALETTES[0].colors;
      S.colors.custom.push(base[S.colors.custom.length % base.length]);
      S.colors.mode = 'custom';
      renderCustomColors();
      syncControls();
      A.render();
      save();
    });
    $('#btn-clear-colors').addEventListener('click', () => {
      S.colors.custom = [];
      renderCustomColors();
      A.render();
      save();
    });

    /* --- 快速开关 --- */
    $$('[data-toggle]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const key = chip.dataset.toggle;
        if (key === 'svgRenderer') {
          S.renderer = S.renderer === 'svg' ? 'canvas' : 'svg';
          A.initChart();
          A.updateChips();
          toast('渲染器已切换为 ' + (S.renderer === 'svg' ? 'SVG 矢量' : 'Canvas 位图'), 'info');
          save();
          return;
        }
        S.cfg[key] = !S.cfg[key];
        if (key === 'labelShow' && !S.cfg.labelPos) S.cfg.labelPos = 'top';
        A.renderConfig();
        A.render();
        save();
      });
    });

    /* --- 缩放 / 全屏 / 重置 --- */
    $('#btn-zoom-in').addEventListener('click', () => { S.zoom = Math.min(2.2, Math.round((S.zoom + 0.1) * 10) / 10); applyZoom(); });
    $('#btn-zoom-out').addEventListener('click', () => { S.zoom = Math.max(0.5, Math.round((S.zoom - 0.1) * 10) / 10); applyZoom(); });
    $('#btn-reset').addEventListener('click', () => {
      S.zoom = 1;
      applyZoom();
      const ch = A.getChart();
      if (ch) ch.clear();
      A.render();
      toast('图表已重置', 'info');
    });
    $('#btn-expand').addEventListener('click', () => {
      const stage = $('#chart-stage');
      const on = stage.classList.toggle('fullscreen');
      const btn = $('#btn-expand');
      btn.innerHTML = '<svg viewBox="0 0 24 24"><use href="' + (on ? '#i-close' : '#i-expand') + '"/></svg>';
      setTimeout(() => { A.resize(); applyZoom(); }, 220);
    });

    /* --- 主题 / GitHub --- */
    $('#btn-theme').addEventListener('click', () => applyTheme(S.theme === 'dark' ? 'light' : 'dark'));
    $('#btn-github').addEventListener('click', () => window.open(REPO_URL, '_blank', 'noopener'));

    /* --- 标题 --- */
    $('#quick-title').addEventListener('input', (e) => { S.cfg.title = e.target.value; A.reRenderDebounced(); });
    $('#quick-title').addEventListener('change', save);

    /* --- 配置面板 --- */
    const cfgPanel = $('#config-panel');
    cfgPanel.addEventListener('click', (e) => {
      const head = e.target.closest('.cfg-head');
      if (head) head.parentElement.classList.toggle('collapsed');
    });
    cfgPanel.addEventListener('input', (e) => {
      const key = e.target.dataset.cfg;
      const ckey = e.target.dataset.cfgColor;
      if (ckey) {
        S.cfg[ckey] = e.target.value;
        const row = e.target.closest('.custom-color-row');
        const txt = row ? row.querySelector('[data-cfg]') : null;
        if (txt) txt.value = e.target.value;
        A.render();
        return;
      }
      if (!key) return;
      const t = e.target;
      if (t.type === 'checkbox') S.cfg[key] = t.checked;
      else if (t.type === 'range') {
        S.cfg[key] = Number(t.value);
        const out = cfgPanel.querySelector('[data-out="' + key + '"]');
        if (out) {
          const item = findSchemaItem(key);
          out.textContent = t.value + (item && item.unit ? ' ' + item.unit : '');
        }
      } else if (t.tagName === 'SELECT') S.cfg[key] = t.value;
      else S.cfg[key] = t.value;
      A.reRenderDebounced();
    });
    cfgPanel.addEventListener('change', (e) => {
      if (e.target.dataset.cfg || e.target.dataset.cfgColor) {
        save();
        if (e.target.tagName === 'SELECT') A.render();
      }
    });
    $('#btn-reset-config').addEventListener('click', () => {
      const d = A.currentDefaults();
      Object.keys(d).forEach((k) => { S.cfg[k] = d[k]; });
      A.renderConfig();
      A.render();
      save();
      toast('已恢复当前图表类型的默认配置', 'ok');
    });

    /* --- 数据表格 --- */
    const table = $('#data-table');
    table.addEventListener('input', (e) => {
      const cell = e.target.dataset.cell;
      const colName = e.target.dataset.colname;
      if (cell) {
        const parts = cell.split('_');
        setCell(Number(parts[0]), Number(parts[1]), e.target.value);
        const isNum = typeof S.dataset.rows[Number(parts[0])][Number(parts[1])] === 'number';
        e.target.parentElement.classList.toggle('is-number', isNum);
        A.reRenderDebounced();
      } else if (colName !== undefined) {
        S.dataset.columns[Number(colName)] = e.target.value;
        A.reRenderDebounced();
      } else return;
    });
    table.addEventListener('change', (e) => { if (e.target.dataset.cell || e.target.dataset.colname) save(); });
    table.addEventListener('click', (e) => {
      const dcol = e.target.closest('[data-delcol]');
      const drow = e.target.closest('[data-delrow]');
      if (dcol) {
        const i = Number(dcol.dataset.delcol);
        S.dataset.columns.splice(i, 1);
        S.dataset.rows.forEach((r) => r.splice(i, 1));
        renderTable();
        A.render();
        save();
      } else if (drow) {
        S.dataset.rows.splice(Number(drow.dataset.delrow), 1);
        renderTable();
        A.render();
        save();
      }
    });
    table.addEventListener('paste', (e) => {
      const input = e.target.closest('input[data-cell]');
      if (!input) return;
      const text = (e.clipboardData || window.clipboardData).getData('text');
      if (!text || text.indexOf('\n') === -1 && text.indexOf('\t') === -1) return;
      e.preventDefault();
      const parts = input.dataset.cell.split('_');
      const r0 = Number(parts[0]), c0 = Number(parts[1]);
      const rows = D.parseDelimited(text, D.detectDelimiter(text));
      rows.forEach((row, ri) => {
        const tr = r0 + ri;
        while (S.dataset.rows.length <= tr) {
          S.dataset.rows.push(S.dataset.columns.map(() => ''));
        }
        row.forEach((cell, ci) => {
          const tc = c0 + ci;
          while (S.dataset.columns.length <= tc) {
            S.dataset.columns.push('列' + (S.dataset.columns.length + 1));
            S.dataset.rows.forEach((r) => r.push(''));
          }
          S.dataset.rows[tr][tc] = D.coerce(cell);
        });
      });
      renderTable();
      A.render();
      save();
      toast('已粘贴 ' + rows.length + ' 行数据', 'ok');
    });

    /* --- 数据工具按钮 --- */
    $('#btn-add-row').addEventListener('click', () => {
      S.dataset.rows.push(S.dataset.columns.map(() => ''));
      renderTable();
      A.render();
      save();
    });
    $('#btn-add-col').addEventListener('click', () => {
      const n = S.dataset.columns.length + 1;
      S.dataset.columns.push('列' + n);
      S.dataset.rows.forEach((r) => r.push(''));
      renderTable();
      A.render();
      save();
    });
    $('#btn-transpose').addEventListener('click', () => {
      if (!S.dataset.rows.length) return;
      const t = D.transpose(S.dataset.columns, S.dataset.rows);
      S.dataset = t;
      renderTable();
      A.render();
      save();
      toast('已转置为 ' + t.rows.length + ' 行 x ' + t.columns.length + ' 列', 'ok');
    });
    $('#btn-clear-data').addEventListener('click', () => {
      S.dataset = { columns: ['类别', '数值'], rows: [['', ''], ['', ''], ['', '']] };
      renderTable();
      A.render();
      save();
      toast('数据已清空', 'info');
    });
    $('#dock-toggle').addEventListener('click', () => {
      $('#data-dock').classList.toggle('collapsed');
      setTimeout(A.resize, 230);
    });

    /* --- 顶部工具 --- */
    $('#btn-open-data').addEventListener('click', () => { $('#file-input').value = ''; $('#file-input').click(); });
    $('#file-input').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) readFile(f);
    });
    $('#btn-project-open').addEventListener('click', () => { $('#project-input').value = ''; $('#project-input').click(); });
    $('#project-input').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) readFile(f);
    });

    $('#btn-paste-data').addEventListener('click', () => openModal('modal-paste'));
    $('#btn-paste-apply').addEventListener('click', () => {
      const txt = $('#paste-area').value;
      if (!txt.trim()) { toast('请先粘贴数据内容', 'warn'); return; }
      const ok = importText(txt, { delimiter: $('#paste-delim').value, header: $('#paste-header').checked });
      if (ok) { closeAllModals(); $('#paste-area').value = ''; }
    });

    $('#btn-samples').addEventListener('click', () => {
      const box = $('#sample-list');
      box.innerHTML = D.SAMPLES.map((s, i) =>
        '<button class="sample-item" data-sample="' + i + '">' +
        '<strong>' + A.esc(s.name) + '</strong>' +
        '<small>' + A.esc(s.desc) + '</small>' +
        '<span class="sample-tag">' + A.esc(s.tag) + '</span>' +
        '</button>'
      ).join('');
      openModal('modal-sample');
    });
    $('#sample-list').addEventListener('click', (e) => {
      const it = e.target.closest('[data-sample]');
      if (!it) return;
      const s = D.SAMPLES[Number(it.dataset.sample)];
      if (!s) return;
      loadDataset(s.data, { chartType: s.prefer, title: s.name });
      closeAllModals();
      toast('已载入示例：' + s.name, 'ok');
    });

    /* --- 导出菜单 --- */
    const exportBtn = $('#btn-export');
    const exportMenu = $('#menu-export');
    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      exportMenu.classList.toggle('open');
    });
    document.addEventListener('click', () => exportMenu.classList.remove('open'));
    exportMenu.addEventListener('click', (e) => {
      const b = e.target.closest('[data-export]');
      if (!b) return;
      const kind = b.dataset.export;
      exportMenu.classList.remove('open');
      if (kind === 'png') exportPNG();
      else if (kind === 'svg') exportSVG();
      else if (kind === 'csv') exportCSV();
      else if (kind === 'json') exportJSONProject();
      else if (kind === 'code-html') { showCode('html'); openModal('modal-code'); }
      else if (kind === 'code-option') { showCode('option'); openModal('modal-code'); }
      else if (kind === 'copy-option') { copyOption(); }
    });

    $$('#modal-code .modal-tabs button').forEach((b) => {
      b.addEventListener('click', () => showCode(b.dataset.code));
    });
    $('#btn-copy-code').addEventListener('click', () => {
      const txt = $('#code-out').textContent;
      copyText(txt);
    });
    $('#btn-download-code').addEventListener('click', () => {
      const kind = $('#code-out').dataset.kind || 'option';
      if (kind === 'html') download(safeName() + '.html', buildStandaloneHTML(), 'text/html;charset=utf-8');
      else download(safeName() + '.option.js', 'var option = ' + buildOptionCode() + ';\n', 'text/javascript;charset=utf-8');
      toast('文件已下载', 'ok');
    });

    function copyOption() {
      copyText('var option = ' + buildOptionCode() + ';');
    }

    /* --- 模态框关闭 --- */
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) { closeModal(e.target); return; }
      if (e.target.classList && e.target.classList.contains('modal')) e.target.classList.remove('open');
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAllModals();
        const stage = $('#chart-stage');
        if (stage.classList.contains('fullscreen')) $('#btn-expand').click();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        exportJSONProject();
      }
    });

    /* --- 拖拽导入 --- */
    const stage = $('#chart-stage');
    ['dragenter', 'dragover'].forEach((ev) => {
      stage.addEventListener(ev, (e) => { e.preventDefault(); stage.classList.add('dragover'); });
    });
    ['dragleave', 'drop'].forEach((ev) => {
      stage.addEventListener(ev, (e) => {
        e.preventDefault();
        if (ev === 'dragleave' && stage.contains(e.relatedTarget)) return;
        stage.classList.remove('dragover');
      });
    });
    stage.addEventListener('drop', (e) => {
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) { readFile(f); return; }
      const txt = e.dataTransfer && e.dataTransfer.getData('text');
      if (txt) importText(txt);
    });
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => e.preventDefault());

    /* --- 尺寸响应 --- */
    if (global.ResizeObserver) {
      const ro = new ResizeObserver(() => A.resize());
      ro.observe($('#chart'));
    }
    window.addEventListener('resize', A.resize);
  }

  function copyText(txt) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(
        () => toast('已复制到剪贴板', 'ok'),
        () => fallbackCopy(txt)
      );
    } else fallbackCopy(txt);
  }
  function fallbackCopy(txt) {
    const ta = document.createElement('textarea');
    ta.value = txt;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('已复制到剪贴板', 'ok'); }
    catch (e) { toast('复制失败，请手动选择文本', 'err'); }
    document.body.removeChild(ta);
  }

  function findSchemaItem(key) {
    let found = null;
    A.SCHEMA.forEach((g) => g.items.forEach((it) => { if (it.key === key) found = it; }));
    if (!found) {
      const def = CT.map[S.chartType];
      if (def && def.extra) def.extra.forEach((it) => { if (it.key === key) found = it; });
    }
    return found;
  }

  /* ============================================================
     启动
     ============================================================ */
  function boot() {
    A.ensureCfg();

    const restored = restore();
    if (!restored) {
      const s = D.SAMPLES[0];
      S.dataset = { columns: s.data.columns.slice(), rows: s.data.rows.map((r) => r.slice()) };
      S.chartType = s.prefer;
      S.cfg.title = s.name;
      A.applyPreset(CT.map[s.prefer]);
    }

    document.documentElement.setAttribute('data-theme', S.theme);
    const tbtn = $('#btn-theme');
    if (tbtn) tbtn.innerHTML = '<svg viewBox="0 0 24 24"><use href="#' + (S.theme === 'dark' ? 'i-moon' : 'i-sun') + '"/></svg>';

    renderTypes('');
    A.renderConfig();
    renderColorPanel();
    renderTable();
    A.initChart();
    applyZoom();
    bind();

    const badge = $('#chart-badge');
    if (badge) badge.title = '图表库版本 ' + (global.echarts ? global.echarts.version : '');

    console.log('[ControlEcharts] 已启动 · 图表类型 ' + CT.list.length + ' 种 · 渲染器 ' + S.renderer);
  }

  global.UI = {
    toast: toast,
    openModal: openModal,
    closeAllModals: closeAllModals,
    renderTypes: renderTypes,
    setChartType: setChartType,
    renderColorPanel: renderColorPanel,
    renderTable: renderTable,
    loadDataset: loadDataset,
    importText: importText,
    exportSVG: exportSVG,
    exportPNG: exportPNG,
    buildOptionCode: buildOptionCode,
    buildStandaloneHTML: buildStandaloneHTML,
    applyTheme: applyTheme,
    save: save
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})(window);
