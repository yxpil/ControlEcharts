/* ============================================================
   app.js — 应用内核
   状态管理 · 配置 Schema · 图表渲染 · 配置面板
   ============================================================ */
(function (global) {
  'use strict';

  const P = global.Palettes;
  const D = global.Dataset;
  const C = global.ChartCore;
  const CT = C.CT;

  /* ============================================================
     配置 Schema
     ============================================================ */
  const SCHEMA = [
    {
      title: '标题与画布',
      icon: 'i-chart',
      items: [
        { key: 'showTitle', label: '显示标题区', type: 'switch', def: true },
        { key: 'title', label: '主标题', type: 'text', def: '数据统计图表' },
        { key: 'subtitle', label: '副标题', type: 'text', def: '' },
        { key: 'titleAlign', label: '标题对齐', type: 'select', def: 'center', options: [['center', '居中'], ['left', '左对齐'], ['right', '右对齐']] },
        { key: 'titleSize', label: '主标题字号', type: 'range', min: 10, max: 40, step: 1, unit: 'px', def: 18 },
        { key: 'subtitleSize', label: '副标题字号', type: 'range', min: 9, max: 26, step: 1, unit: 'px', def: 12 },
        { key: 'fontSize', label: '全局字号', type: 'range', min: 9, max: 22, step: 1, unit: 'px', def: 12 },
        {
          key: 'chartBg', label: '画布背景', type: 'select', def: 'transparent',
          options: [['transparent', '透明'], ['#ffffff', '纯白'], ['#0b1120', '深空'], ['#f8fafc', '浅灰'], ['#111827', '墨黑'], ['#f1f5f9', '雾灰']]
        }
      ]
    },
    {
      title: '图例',
      icon: 'i-grid',
      items: [
        { key: 'legendShow', label: '显示图例', type: 'switch', def: true },
        {
          key: 'legendPos', label: '位置', type: 'select', def: 'top',
          options: [['top', '顶部'], ['bottom', '底部'], ['left', '左侧'], ['right', '右侧'], ['none', '隐藏']]
        },
        {
          key: 'legendIcon', label: '标记形状', type: 'select', def: 'roundRect',
          options: [['roundRect', '圆角矩形'], ['rect', '矩形'], ['circle', '圆形'], ['triangle', '三角'], ['diamond', '菱形'], ['pin', '水滴'], ['arrow', '箭头'], ['none', '无']]
        },
        { key: 'legendFontSize', label: '图例字号', type: 'range', min: 8, max: 20, step: 1, unit: 'px', def: 11 },
        { key: 'legendGap', label: '图例间距', type: 'range', min: 4, max: 40, step: 1, unit: 'px', def: 14 }
      ]
    },
    {
      title: '提示框',
      icon: 'i-sparkles',
      items: [
        { key: 'tooltipShow', label: '显示提示框', type: 'switch', def: true },
        {
          key: 'tooltipTrigger', label: '触发方式', type: 'select', def: 'axis',
          options: [['axis', '按坐标轴'], ['item', '按数据项']]
        },
        { key: 'tooltipCross', label: '十字准星', type: 'switch', def: false },
        { key: 'tooltipFontSize', label: '提示字号', type: 'range', min: 9, max: 18, step: 1, unit: 'px', def: 12 },
        { key: 'thousandSep', label: '数值千分位', type: 'switch', def: true }
      ]
    },
    {
      title: '数据标签',
      icon: 'i-table',
      items: [
        { key: 'labelShow', label: '显示数值标签', type: 'switch', def: true },
        {
          key: 'labelPos', label: '标签位置', type: 'select', def: 'top',
          options: [['top', '顶部'], ['inside', '内部'], ['insideTop', '内部靠上'], ['insideBottom', '内部靠下'], ['center', '居中'], ['bottom', '底部'], ['left', '左侧'], ['right', '右侧'], ['outside', '外部']]
        },
        { key: 'labelSize', label: '标签字号', type: 'range', min: 8, max: 22, step: 1, unit: 'px', def: 11 },
        { key: 'labelRotate', label: '标签旋转', type: 'range', min: -90, max: 90, step: 5, unit: 'deg', def: 0 },
        { key: 'labelBold', label: '标签加粗', type: 'switch', def: false },
        { key: 'labelColor', label: '标签颜色（留空自动）', type: 'color', def: '' }
      ]
    },
    {
      title: '坐标轴',
      icon: 'i-parallel',
      items: [
        { key: 'axisXShow', label: '显示 X 轴', type: 'switch', def: true },
        { key: 'axisYShow', label: '显示 Y 轴', type: 'switch', def: true },
        { key: 'axisXName', label: 'X 轴名称', type: 'text', def: '' },
        { key: 'axisYName', label: 'Y 轴名称', type: 'text', def: '' },
        { key: 'axisXRotate', label: '标签旋转', type: 'range', min: -90, max: 90, step: 5, unit: 'deg', def: 0 },
        { key: 'axisFontSize', label: '轴标签字号', type: 'range', min: 8, max: 20, step: 1, unit: 'px', def: 11 },
        { key: 'splitLineY', label: '横向网格线', type: 'switch', def: true },
        { key: 'splitLineX', label: '纵向网格线', type: 'switch', def: false },
        { key: 'axisTick', label: '显示刻度线', type: 'switch', def: false },
        { key: 'axisYLine', label: '显示 Y 轴线', type: 'switch', def: false },
        { key: 'axisYShort', label: '数值缩写（万 / 亿）', type: 'switch', def: false },
        { key: 'yScale', label: 'Y 轴自适应起点', type: 'switch', def: false },
        { key: 'yMin', label: 'Y 轴最小值', type: 'text', def: 'auto' },
        { key: 'yMax', label: 'Y 轴最大值', type: 'text', def: 'auto' }
      ]
    },
    {
      title: '图形样式',
      icon: 'i-palette',
      items: [
        {
          key: 'fillMode', label: '填充方式', type: 'select', def: 'solid',
          options: [['solid', '纯色填充'], ['gradient', '渐变填充']]
        },
        { key: 'barRadius', label: '柱体圆角', type: 'range', min: 0, max: 20, step: 1, unit: 'px', def: 4 },
        { key: 'barMaxWidth', label: '柱体最大宽度', type: 'range', min: 8, max: 120, step: 2, unit: 'px', def: 38 },
        {
          key: 'lineType', label: '折线线型', type: 'select', def: 'solid',
          options: [['solid', '实线'], ['dashed', '虚线'], ['dotted', '点线']]
        },
        { key: 'lineWidth', label: '折线宽度', type: 'range', min: 1, max: 10, step: 0.2, unit: 'px', def: 2.4 },
        { key: 'lineShadow', label: '折线发光', type: 'switch', def: false },
        {
          key: 'symbolType', label: '数据点形状', type: 'select', def: 'circle',
          options: [['circle', '圆形'], ['rect', '方形'], ['roundRect', '圆角方'], ['triangle', '三角'], ['diamond', '菱形'], ['pin', '水滴'], ['none', '不显示']]
        },
        { key: 'symbolSize', label: '数据点大小', type: 'range', min: 0, max: 20, step: 1, unit: 'px', def: 6 },
        { key: 'showSymbol', label: '显示数据点', type: 'switch', def: true },
        { key: 'seriesBorder', label: '系列描边', type: 'switch', def: false },
        { key: 'pieShadow', label: '元素投影', type: 'switch', def: false },
        { key: 'roam', label: '允许缩放平移', type: 'switch', def: true }
      ]
    },
    {
      title: '交互与动画',
      icon: 'i-settings',
      items: [
        { key: 'dataZoom', label: '启用区间缩放', type: 'switch', def: false },
        { key: 'dataZoomStart', label: '缩放起始', type: 'range', min: 0, max: 99, step: 1, unit: '%', def: 0 },
        { key: 'dataZoomEnd', label: '缩放结束', type: 'range', min: 1, max: 100, step: 1, unit: '%', def: 100 },
        { key: 'toolbox', label: '显示工具盒', type: 'switch', def: false },
        { key: 'animation', label: '启用动画', type: 'switch', def: true },
        { key: 'animationDuration', label: '动画时长', type: 'range', min: 100, max: 2400, step: 50, unit: 'ms', def: 760 },
        { key: 'radarMax', label: '雷达量程', type: 'text', def: 'auto' },
        { key: 'gaugeMax', label: '仪表量程', type: 'text', def: 'auto' },
        { key: 'bubbleMin', label: '气泡最小尺寸', type: 'range', min: 4, max: 40, step: 1, unit: 'px', def: 12 },
        { key: 'bubbleMax', label: '气泡最大尺寸', type: 'range', min: 24, max: 110, step: 2, unit: 'px', def: 58 }
      ]
    }
  ];

  /* 各图表类型使用哪种取色策略 */
  const COLOR_BY = {
    'pie': 'item', 'pie-doughnut': 'item', 'pie-rose': 'item', 'funnel': 'item',
    'treemap': 'item', 'sunburst': 'item', 'gauge': 'item', 'pareto': 'item', 'tag-cloud': 'item',
    'sankey': 'node', 'graph': 'node', 'tree': 'node',
    'histogram': 'ramp', 'boxplot': 'ramp', 'candlestick': 'ramp', 'heatmap': 'ramp',
    'calendar': 'ramp', 'scatter': 'ramp', 'scatter-bubble': 'ramp', 'scatter-effect': 'ramp',
    'bar-waterfall': 'ramp', 'parallel': 'ramp'
  };

  /* ============================================================
     状态
     ============================================================ */
  const state = {
    chartType: 'bar',
    dataset: D.blank(),
    cfg: {},
    // 各图表类型的专属配置项按类型分开存放，避免同名键（lineWidth / symbolSize /
    // barMaxWidth / pieInner …）在类型之间互相覆盖
    typeCfg: {},
    cfgType: null,
    colors: {
      mode: 'mono',
      monoBase: 'blue',
      monoMode: 'shade',
      multiId: 'ocean',
      multiRepeat: 'cycle',
      custom: ['#4C8DFF', '#39C2D7', '#3ED598', '#F7C948', '#FF8A5B', '#FF5C7A'],
      opacity: 100,
      jitter: 0,
      gradient: false
    },
    theme: 'dark',
    renderer: 'svg',
    zoom: 1
  };

  let chart = null;

  /* ============================================================
     配置默认值
     ============================================================ */
  function baseDefaults() {
    const o = {};
    SCHEMA.forEach((g) => g.items.forEach((it) => { o[it.key] = it.def; }));
    return o;
  }

  function typeDefaults(def) {
    const o = {};
    if (def && def.extra) def.extra.forEach((it) => { o[it.key] = it.def; });
    return o;
  }

  function allDefaults() {
    const o = baseDefaults();
    CT.list.forEach((def) => Object.assign(o, typeDefaults(def)));
    return o;
  }

  /* ============================================================
     专属配置项的作用域
     ------------------------------------------------------------
     每类图表的 extra 键（环形图的 pieInner、折线图的 lineWidth 等）只允许在
     对应类型下生效。若把所有类型的专属键全局合并，同名键会互相覆盖：
     默认值取「注册顺序里最后一个类型」，并且面板显示值与实际渲染值不一致，
     最典型的表现就是普通饼图读到环形图的 pieInner 而被挖出中孔。
     ============================================================ */
  let EXTRA_KEY_MAP = null;
  /** 真正的「类型专属键」：出现在某类型 extra 里、且不在通用 Schema 中的键。
      通用键（lineWidth / symbolSize / barMaxWidth …）对所有类型都合法，不参与收敛。 */
  function allExtraKeys() {
    if (!EXTRA_KEY_MAP) {
      const base = baseDefaults();
      EXTRA_KEY_MAP = {};
      CT.list.forEach((def) => (def.extra || []).forEach((it) => {
        if (base[it.key] === undefined) EXTRA_KEY_MAP[it.key] = true;
      }));
    }
    return EXTRA_KEY_MAP;
  }

  function extraKeysOf(typeId) {
    const def = CT.map[typeId];
    return (def && def.extra ? def.extra : []).map((it) => it.key);
  }

  function stashOf(typeId) {
    if (!state.typeCfg[typeId]) state.typeCfg[typeId] = {};
    return state.typeCfg[typeId];
  }

  /** 把 state.cfg 收敛为「通用键 + 当前类型的专属键」，专属值按类型分别暂存 */
  function syncTypeExtras() {
    const id = state.chartType;
    if (!CT.map[id]) return;
    if (state.cfgType === id) return;

    const all = allExtraKeys();
    const own = extraKeysOf(id);
    const ownMap = {};
    own.forEach((k) => { ownMap[k] = true; });
    const stash = stashOf(id);
    const prevId = state.cfgType;

    // 首次同步（含旧版本存储）：cfg 中已有的专属值视为属于当前类型
    if (!prevId || !CT.map[prevId]) {
      own.forEach((k) => { if (state.cfg[k] !== undefined) stash[k] = state.cfg[k]; });
    } else if (prevId !== id) {
      // 换出上一个类型的专属值
      const prev = stashOf(prevId);
      extraKeysOf(prevId).forEach((k) => {
        if (state.cfg[k] !== undefined) prev[k] = state.cfg[k];
      });
    }

    // 清掉所有不属于当前类型的专属键，再装载当前类型的值
    Object.keys(all).forEach((k) => { if (!ownMap[k]) delete state.cfg[k]; });
    const defs = typeDefaults(CT.map[id]);
    const preset = CT.map[id].preset || {};
    own.forEach((k) => {
      if (stash[k] !== undefined) state.cfg[k] = stash[k];
      else if (preset[k] !== undefined) state.cfg[k] = preset[k];
      else state.cfg[k] = defs[k];
    });
    state.cfgType = id;
  }

  function currentDefaults() {
    const o = baseDefaults();
    Object.assign(o, typeDefaults(CT.map[state.chartType]));
    return o;
  }

  /** 补齐缺失键，不覆盖已有用户设置（专属键由 syncTypeExtras 装载） */
  function ensureCfg() {
    const d = baseDefaults();
    Object.keys(d).forEach((k) => {
      if (state.cfg[k] === undefined) state.cfg[k] = d[k];
    });
    syncTypeExtras();
  }

  function applyPreset(def) {
    if (!def || !def.preset) return;
    const stash = state.typeCfg[def.id] || {};
    Object.keys(def.preset).forEach((k) => {
      if (stash[k] !== undefined) return; // 用户调过的专属项不被预设覆盖
      state.cfg[k] = def.preset[k];
    });
  }

  /* ============================================================
     取色数量
     ============================================================ */
  function colorCount(type, ds) {
    const kind = COLOR_BY[type] || 'series';
    let n = 4;
    if (kind === 'series') n = C.catSeries(ds).series.length || 1;
    else if (kind === 'item') n = C.pairData(ds).length || 1;
    else if (kind === 'node') {
      const set = {};
      C.tripleData(ds).forEach((t) => { set[t[0]] = 1; set[t[1]] = 1; });
      n = Object.keys(set).length || 6;
    } else n = 6;
    return Math.max(3, Math.min(24, n));
  }

  function buildCtx(count) {
    const T = C.themeOf(state.theme === 'dark');
    const colors = P.buildColors({
      mode: state.colors.mode,
      monoBase: P.getMonoBase(state.colors.monoBase).hex,
      monoMode: state.colors.monoMode,
      multiId: state.colors.multiId,
      multiRepeat: state.colors.multiRepeat,
      custom: state.colors.custom,
      count: count,
      opacity: state.colors.opacity,
      jitter: state.colors.jitter
    });
    const el = document.getElementById('chart');
    return {
      colors: colors,
      T: T,
      dark: T.dark,
      graphic: global.echarts ? global.echarts.graphic : null,
      w: el ? (el.clientWidth || 860) : 860,
      h: el ? (el.clientHeight || 520) : 520
    };
  }

  /* ============================================================
     渲染图表
     ============================================================ */
  function render() {
    syncTypeExtras();
    const def = CT.map[state.chartType];
    const ds = state.dataset;
    const empty = !ds || !ds.columns.length || !ds.rows.length;

    const badge = document.getElementById('chart-badge');
    const quickTitle = document.getElementById('quick-title');
    const metaEl = document.getElementById('chart-meta');
    if (badge) badge.textContent = def ? def.name : '图表';
    if (quickTitle && document.activeElement !== quickTitle) quickTitle.value = state.cfg.title || '';

    const emptyEl = document.getElementById('chart-empty');
    if (emptyEl) emptyEl.classList.toggle('hidden', !empty);

    if (!chart) return;

    if (empty) {
      chart.clear();
      if (metaEl) metaEl.textContent = '';
      updateChips();
      return;
    }

    const ctx = buildCtx(colorCount(state.chartType, ds));
    let option = null;
    try {
      option = def.build(ds, state.cfg, ctx);
    } catch (err) {
      console.error('[ControlEcharts] 渲染失败', err);
      if (global.UI && global.UI.toast) global.UI.toast('图表渲染异常：' + err.message, 'err');
      option = null;
    }

    if (!option) {
      chart.clear();
      if (metaEl) metaEl.textContent = '当前图表类型与数据结构不匹配，可尝试其他图表类型';
      updateChips();
      return;
    }

    const meta = option.__meta;
    delete option.__meta;
    if (metaEl) metaEl.textContent = meta && meta.title ? meta.title : '';

    try {
      chart.setOption(option, true);
    } catch (err2) {
      console.error('[ControlEcharts] setOption 失败', err2);
    }
    updateChips();
  }

  function resize() {
    if (chart) chart.resize();
  }

  function reRenderDebounced() {
    clearTimeout(reRenderDebounced._t);
    reRenderDebounced._t = setTimeout(render, 90);
  }

  /* ============================================================
     配置面板
     ============================================================ */
  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderConfigItem(item) {
    const v = state.cfg[item.key];
    const label = esc(item.label);
    if (item.type === 'switch') {
      return '<div class="cfg-row"><label class="field-label">' + label +
        '<span class="switch"><input type="checkbox" data-cfg="' + item.key + '"' + (v ? ' checked' : '') + '><i></i></span></label></div>';
    }
    if (item.type === 'select') {
      const opts = (item.options || []).map((o) =>
        '<option value="' + esc(o[0]) + '"' + (String(v) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'
      ).join('');
      return '<div class="cfg-row"><label class="field-label">' + label +
        '<select class="input select" data-cfg="' + item.key + '">' + opts + '</select></label></div>';
    }
    if (item.type === 'range') {
      const val = v === undefined ? item.def : v;
      return '<div class="cfg-row"><label class="field-label">' + label + ' <b data-out="' + item.key + '">' + val + (item.unit ? ' ' + item.unit : '') + '</b>' +
        '<input type="range" class="range" data-cfg="' + item.key + '" min="' + item.min + '" max="' + item.max + '" step="' + (item.step || 1) + '" value="' + val + '"></label></div>';
    }
    if (item.type === 'color') {
      const hex = P.normHex(v) || '#4c8dff';
      return '<div class="cfg-row"><label class="field-label">' + label + '</label>' +
        '<div class="custom-color-row"><input type="color" data-cfg-color="' + item.key + '" value="' + hex + '">' +
        '<input type="text" data-cfg="' + item.key + '" value="' + esc(v || '') + '" placeholder="自动"></div></div>';
    }
    return '<div class="cfg-row"><label class="field-label">' + label +
      '<input class="input" type="text" data-cfg="' + item.key + '" value="' + esc(v === undefined ? '' : v) + '"></label></div>';
  }

  function renderConfig() {
    syncTypeExtras();
    const panel = document.getElementById('config-panel');
    if (!panel) return;
    const def = CT.map[state.chartType];
    const groups = SCHEMA.slice();
    if (def && def.extra && def.extra.length) {
      groups.unshift({ title: def.name + ' 专属', icon: def.icon, items: def.extra });
    }
    let html = '';
    groups.forEach((g, gi) => {
      html += '<section class="cfg-group" data-gi="' + gi + '">' +
        '<header class="cfg-head">' +
        '<svg class="cfg-ic" viewBox="0 0 24 24"><use href="#' + (g.icon || 'i-settings') + '"/></svg>' +
        '<strong>' + esc(g.title) + '</strong>' +
        '<svg class="arrow" viewBox="0 0 24 24"><use href="#i-chevron"/></svg>' +
        '</header><div class="cfg-body">' +
        g.items.map(renderConfigItem).join('') +
        '</div></section>';
    });
    panel.innerHTML = html;
  }

  /* ============================================================
     快速开关
     ============================================================ */
  const CHIP_KEYS = ['labelShow', 'smooth', 'stack', 'legendShow', 'dataZoom', 'toolbox'];

  function updateChips() {
    CHIP_KEYS.forEach((k) => {
      const el = document.querySelector('[data-toggle="' + k + '"]');
      if (el) el.classList.toggle('active', !!state.cfg[k]);
    });
    const svgChip = document.getElementById('chip-svg');
    if (svgChip) {
      svgChip.classList.toggle('active', state.renderer === 'svg');
      svgChip.title = '当前渲染器：' + (state.renderer === 'svg' ? 'SVG 矢量' : 'Canvas 位图');
    }
  }

  /* ============================================================
     图表实例
     ============================================================ */
  function initChart() {
    const el = document.getElementById('chart');
    if (!el || !global.echarts) return;
    if (chart) { chart.dispose(); chart = null; }
    chart = global.echarts.init(el, null, { renderer: state.renderer });
    render();
  }

  global.APP = {
    SCHEMA: SCHEMA,
    COLOR_BY: COLOR_BY,
    CHIP_KEYS: CHIP_KEYS,
    state: state,
    esc: esc,
    baseDefaults: baseDefaults,
    allDefaults: allDefaults,
    currentDefaults: currentDefaults,
    ensureCfg: ensureCfg,
    applyPreset: applyPreset,
    syncTypeExtras: syncTypeExtras,
    extraKeysOf: extraKeysOf,
    colorCount: colorCount,
    buildCtx: buildCtx,
    render: render,
    resize: resize,
    reRenderDebounced: reRenderDebounced,
    renderConfig: renderConfig,
    updateChips: updateChips,
    initChart: initChart,
    getChart: function () { return chart; }
  };

})(window);
