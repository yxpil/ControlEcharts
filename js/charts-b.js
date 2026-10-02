/* ============================================================
   charts-b.js — 饼图 / 环形 / 玫瑰 · 散点 / 气泡 · 统计分布
   ============================================================ */
(function (global) {
  'use strict';

  const C = global.ChartCore;
  const P = global.Palettes;
  const register = C.register;

  /* ============================================================
     饼图 / 环形 / 玫瑰
     ============================================================ */
  function buildPie(ds, cfg, ctx, mode) {
    const pairs = C.pairData(ds);
    if (!pairs.length) return null;
    const T = ctx.T;

    // pieInner 是环形图的专属配置项。配置默认值会把所有类型的专属键全局填充，
    // 若不做模式收窄，普通饼图与玫瑰图也会被挖出中孔，外观与环形图完全重复。
    let inner = 0;
    if (mode === 'doughnut') inner = cfg.pieInner === undefined ? 52 : Number(cfg.pieInner);

    const center = [
      C.pct(cfg.pieCenterX, '50%'),
      C.pct(cfg.pieCenterY, cfg.showTitle === false ? '50%' : '52%')
    ];

    let outer = cfg.pieOuter === undefined ? 74 : Number(cfg.pieOuter);
    // 圆心越偏离正中，可用空间越少：自动收缩外半径，保证扇区与外部标签不被画布裁切。
    // 半径百分比以 min(w,h)/2 为 100%，须换算成「占容器高度的百分比」再与可用余量比较。
    const cyN = parseFloat(center[1]) / 100;
    if (Number.isFinite(cyN) && ctx && ctx.w && ctx.h) {
      const halfPct = outer * Math.min(ctx.w, ctx.h) / (2 * ctx.h); // 纵向半高（百分比数值）
      const roomPct = (Math.min(cyN, 1 - cyN) - 0.04) * 100;        // 可用纵向余量，预留 4% 给外部标签
      if (roomPct > 0 && halfPct > roomPct) outer = outer * roomPct / halfPct;
    }
    outer = Math.max(20, Math.min(96, outer));
    inner = Math.min(inner, Math.max(0, outer - 10)); // 环形厚度至少保留 10%

    const o = C.base(cfg, ctx);
    o.tooltip = C.buildTooltip(cfg, ctx, { trigger: 'item', pointer: 'none' });
    o.toolbox = C.toolboxOf(cfg, ctx);
    o.series = [{
      name: cfg.seriesName || (ds.columns && ds.columns[1]) || '占比',
      type: 'pie',
      radius: inner > 0 ? [inner + '%', outer + '%'] : outer + '%',
      center: center,
      roseType: mode === 'rose' ? (cfg.roseType || 'radius') : false,
      avoidLabelOverlap: true,
      padAngle: cfg.padAngle === undefined ? 1.2 : Number(cfg.padAngle),
      minAngle: cfg.minAngle === undefined ? 2 : Number(cfg.minAngle),
      startAngle: cfg.startAngle === undefined ? 90 : Number(cfg.startAngle),
      clockwise: cfg.clockwise !== false,
      sort: cfg.pieSort === false ? null : 'descending',
      itemStyle: {
        borderColor: T.dark ? 'rgba(11,17,32,.85)' : 'rgba(255,255,255,.92)',
        borderWidth: cfg.pieBorder === undefined ? 2 : Number(cfg.pieBorder),
        borderRadius: cfg.pieCorner ? Number(cfg.pieCorner) : 0,
        shadowBlur: cfg.pieShadow ? 16 : 0,
        shadowColor: 'rgba(0,0,0,.32)'
      },
      label: (function () {
        const l = C.labelCfg(cfg, ctx, 'pie');
        if (!l.show) return { show: false };
        if (l.position === 'top' || l.position === 'bottom') l.position = 'outside';
        const m = cfg.pieLabelMode || 'name-percent';
        l.formatter = function (p) {
          if (m === 'name') return p.name;
          if (m === 'value') return C.fmt(p.value, cfg.thousandSep !== false);
          if (m === 'percent') return p.percent + '%';
          if (m === 'both') return '{b}\n{c}（{d}%）';
          return p.name + '  ' + p.percent + '%';
        };
        return l;
      })(),
      labelLine: {
        show: cfg.labelShow !== false && String(cfg.labelPos || 'outside').indexOf('inside') !== 0,
        length: cfg.labelLineLength === undefined ? 14 : Number(cfg.labelLineLength),
        length2: cfg.labelLineLength2 === undefined ? 12 : Number(cfg.labelLineLength2),
        smooth: cfg.labelLineSmooth !== false,
        lineStyle: { color: T.axis, width: 1 }
      },
      emphasis: { scale: true, scaleSize: 8, itemStyle: { shadowBlur: 22, shadowColor: 'rgba(0,0,0,.42)' } },
      data: pairs.map((p) => ({ name: p[0], value: p[1] }))
    }];

    const total = pairs.reduce((a, b) => a + b[1], 0) || 1;
    const top = pairs.slice().sort((a, b) => b[1] - a[1])[0];
    o.__meta = { title: '共 ' + pairs.length + ' 项 · 合计 ' + C.fmt(total, cfg.thousandSep !== false) + ' · 最大项 ' + top[0] + ' 占 ' + (Math.round(top[1] / total * 1000) / 10) + '%' };
    return o;
  }

  const pieExtra = [
    { key: 'pieOuter', label: '外半径', type: 'range', min: 30, max: 92, step: 1, unit: '%', def: 74 },
    { key: 'pieCenterY', label: '垂直位置', type: 'range', min: 34, max: 70, step: 1, unit: '%', def: 52 },
    { key: 'padAngle', label: '扇区间隙', type: 'range', min: 0, max: 6, step: 0.2, unit: 'deg', def: 1.2 },
    {
      key: 'pieLabelMode', label: '标签内容', type: 'select', def: 'name-percent',
      options: [['name-percent', '名称 + 百分比'], ['name', '仅名称'], ['percent', '仅百分比'], ['value', '仅数值'], ['both', '名称 + 数值 + 百分比']]
    }
  ];

  register({
    id: 'pie',
    name: '饼图',
    group: '饼图 / 环形',
    icon: 'i-pie',
    shape: '名称 + 单值',
    hint: '取名称列与数值列，按占比分配扇区。',
    preset: { labelShow: true, labelPos: 'outside', legendShow: true, legendPos: 'bottom' },
    extra: pieExtra,
    build: function (ds, cfg, ctx) { return buildPie(ds, cfg, ctx, 'pie'); }
  });

  register({
    id: 'pie-doughnut',
    name: '环形图',
    group: '饼图 / 环形',
    icon: 'i-doughnut',
    shape: '名称 + 单值',
    hint: '中空设计，可在中心放置汇总信息。',
    preset: { labelShow: true, labelPos: 'outside', legendShow: true, legendPos: 'bottom' },
    extra: [{ key: 'pieInner', label: '内半径', type: 'range', min: 0, max: 86, step: 1, unit: '%', def: 54 }].concat(pieExtra.slice(0, 3)),
    build: function (ds, cfg, ctx) { return buildPie(ds, cfg, ctx, 'doughnut'); }
  });

  register({
    id: 'pie-rose',
    name: '玫瑰图',
    group: '饼图 / 环形',
    icon: 'i-rose',
    shape: '名称 + 单值',
    hint: '以半径长度表示数值，适合多类别占比。',
    preset: { labelShow: true, labelPos: 'outside', roseType: 'radius' },
    extra: [
      { key: 'roseType', label: '玫瑰模式', type: 'select', def: 'radius', options: [['radius', '半径模式'], ['area', '面积模式']] },
      { key: 'pieOuter', label: '外半径', type: 'range', min: 30, max: 92, step: 1, unit: '%', def: 74 },
      { key: 'startAngle', label: '起始角度', type: 'range', min: 0, max: 360, step: 5, unit: 'deg', def: 90 }
    ],
    build: function (ds, cfg, ctx) { return buildPie(ds, cfg, ctx, 'rose'); }
  });

  /* ============================================================
     散点 / 气泡
     ============================================================ */
  function buildScatter(ds, cfg, ctx, mode) {
    const sd = C.scatterData(ds);
    if (!sd || !sd.points.length) return null;
    const color = ctx.colors[0], color2 = ctx.colors[1] || color;
    const T = ctx.T;

    const o = C.base(cfg, ctx);
    o.grid = C.gridFor(cfg, ctx, { extraLeft: 6 });

    const xa = C.valAxis(cfg, ctx, { name: cfg.axisXName || sd.xName });
    xa.splitLine = { show: cfg.splitLineX !== false, lineStyle: { color: T.split, type: 'dashed' } };
    xa.axisLine = { show: true, lineStyle: { color: T.axisLine } };
    xa.axisTick = { show: false };
    xa.scale = true;
    xa.axisLabel = {
      color: T.axis, fontSize: C.axisFont(cfg), fontFamily: C.FONT,
      formatter: cfg.thousandSep === false ? undefined : function (v) { return C.fmt(v, true); }
    };
    const ya = C.valAxis(cfg, ctx, { name: cfg.axisYName || sd.yName });
    ya.scale = true;

    o.xAxis = xa;
    o.yAxis = ya;
    o.tooltip = C.buildTooltip(cfg, ctx, { trigger: 'item', pointer: 'none' });
    o.toolbox = C.toolboxOf(cfg, ctx);

    const sizes = sd.dim === 3 ? sd.points.map((p) => p[2]) : null;
    const maxS = sizes ? Math.max.apply(null, sizes) : 1;
    const minS = sizes ? Math.min.apply(null, sizes) : 0;
    const op = (cfg.scatterOpacity === undefined ? 84 : Number(cfg.scatterOpacity)) / 100;

    o.series = [{
      name: cfg.seriesName || (sd.yName + ' 分布'),
      type: mode === 'effect' ? 'effectScatter' : 'scatter',
      data: sd.points,
      symbolSize: function (val) {
        if (mode === 'bubble' && sd.dim === 3) {
          const t = maxS === minS ? 0.6 : (val[2] - minS) / (maxS - minS);
          const lo = cfg.bubbleMin === undefined ? 12 : Number(cfg.bubbleMin);
          const hi = cfg.bubbleMax === undefined ? 58 : Number(cfg.bubbleMax);
          return lo + (hi - lo) * Math.pow(t, 0.7);
        }
        return cfg.symbolSize === undefined ? 13 : Number(cfg.symbolSize);
      },
      rippleEffect: mode === 'effect' ? { brushType: 'stroke', scale: 3.4, period: 4.2 } : undefined,
      showEffectOn: mode === 'effect' ? 'render' : undefined,
      itemStyle: {
        color: (cfg.fillMode === 'gradient' && ctx.graphic)
          ? new ctx.graphic.RadialGradient(0.4, 0.36, 0.9, [
            { offset: 0, color: P.rgba(P.tint(color, .3), Math.min(1, op + .12)) },
            { offset: 1, color: P.rgba(P.shade(color, .24), op) }
          ])
          : P.rgba(color, op),
        borderColor: P.rgba(P.tint(color, .38), .92),
        borderWidth: 1,
        shadowBlur: cfg.pieShadow ? 12 : 0,
        shadowColor: P.rgba(color, .35)
      },
      emphasis: { scale: 1.4, itemStyle: { borderWidth: 2 } },
      label: (function () {
        const l = C.labelCfg(cfg, ctx);
        if (!l.show) return { show: false };
        if (l.position === 'top' || l.position === 'bottom') l.position = 'right';
        l.formatter = function (p) { return sd.labels[p.dataIndex] === undefined ? '' : sd.labels[p.dataIndex]; };
        return l;
      })(),
      labelLayout: { hideOverlap: true, moveOverlap: 'shiftY' }
    }];

    if (cfg.trendLine && sd.dim >= 2 && sd.points.length > 2) {
      const pts = sd.points, n = pts.length;
      let sx = 0, sy = 0, sxx = 0, sxy = 0;
      pts.forEach((p) => { sx += p[0]; sy += p[1]; sxx += p[0] * p[0]; sxy += p[0] * p[1]; });
      const denom = n * sxx - sx * sx;
      if (Math.abs(denom) > 1e-9) {
        const k = (n * sxy - sx * sy) / denom;
        const b = (sy - k * sx) / n;
        const xs = pts.map((p) => p[0]);
        const x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
        o.series.push({
          name: '趋势线',
          type: 'line',
          data: [[x0, k * x0 + b], [x1, k * x1 + b]],
          showSymbol: false,
          silent: true,
          lineStyle: { width: 2, type: 'dashed', color: color2 },
          itemStyle: { color: color2 },
          tooltip: { show: false },
          z: 2
        });
        o.__meta = { title: '趋势线  y = ' + (Math.round(k * 1000) / 1000) + 'x ' + (b >= 0 ? '+ ' : '- ') + Math.abs(Math.round(b * 100) / 100) };
      }
    }
    return o;
  }

  register({
    id: 'scatter',
    name: '散点图',
    group: '散点 / 气泡',
    icon: 'i-scatter',
    shape: '双数值列',
    hint: '两列数值分别作为横纵坐标，观察相关性。',
    preset: { labelShow: false, splitLineX: true },
    extra: [
      { key: 'symbolSize', label: '散点大小', type: 'range', min: 4, max: 40, step: 1, unit: 'px', def: 13 },
      { key: 'scatterOpacity', label: '不透明度', type: 'range', min: 20, max: 100, step: 2, unit: '%', def: 84 },
      { key: 'trendLine', label: '显示趋势线', type: 'switch', def: false }
    ],
    build: function (ds, cfg, ctx) { return buildScatter(ds, cfg, ctx, 'scatter'); }
  });

  register({
    id: 'scatter-bubble',
    name: '气泡图',
    group: '散点 / 气泡',
    icon: 'i-bubble',
    shape: '三数值列',
    hint: '第三列数值映射为气泡大小。',
    preset: { labelShow: false, splitLineX: true },
    extra: [
      { key: 'bubbleMin', label: '最小气泡', type: 'range', min: 4, max: 40, step: 1, unit: 'px', def: 12 },
      { key: 'bubbleMax', label: '最大气泡', type: 'range', min: 24, max: 110, step: 2, unit: 'px', def: 58 },
      { key: 'scatterOpacity', label: '不透明度', type: 'range', min: 20, max: 100, step: 2, unit: '%', def: 78 }
    ],
    build: function (ds, cfg, ctx) { return buildScatter(ds, cfg, ctx, 'bubble'); }
  });

  register({
    id: 'scatter-effect',
    name: '涟漪散点',
    group: '散点 / 气泡',
    icon: 'i-effect-scatter',
    shape: '双数值列',
    hint: '带扩散动效的高亮散点，适合重点标注。',
    preset: { labelShow: false },
    extra: [
      { key: 'symbolSize', label: '散点大小', type: 'range', min: 4, max: 40, step: 1, unit: 'px', def: 11 },
      { key: 'scatterOpacity', label: '不透明度', type: 'range', min: 20, max: 100, step: 2, unit: '%', def: 84 }
    ],
    build: function (ds, cfg, ctx) { return buildScatter(ds, cfg, ctx, 'effect'); }
  });

  /* ============================================================
     统计分布
     ============================================================ */
  register({
    id: 'histogram',
    name: '直方图',
    group: '统计分布',
    icon: 'i-histogram',
    shape: '单数值列',
    hint: '对首个数值列自动分箱并统计频数。',
    preset: { labelShow: false, splitLineY: true, showSymbol: false },
    extra: [{ key: 'binCount', label: '分组数', type: 'range', min: 4, max: 40, step: 1, def: 12 }],
    build: function (ds, cfg, ctx) {
      const ns = C.numericSeries(ds);
      if (!ns.length) return null;
      const values = C.toNums(ns[0].data);
      if (!values.length) return null;

      const min = Math.min.apply(null, values), max = Math.max.apply(null, values);
      const auto = cfg.binCount ? Number(cfg.binCount) : Math.max(5, Math.min(24, Math.ceil(Math.sqrt(values.length))));
      const binCount = Math.max(2, auto);
      const step = (max - min) / binCount || 1;
      const bins = new Array(binCount).fill(0);
      values.forEach((v) => {
        let idx = Math.floor((v - min) / step);
        if (idx >= binCount) idx = binCount - 1;
        if (idx < 0) idx = 0;
        bins[idx]++;
      });
      const labels = bins.map((_, i) => {
        const a = min + step * i;
        return (Math.round(a * 100) / 100) + '~' + (Math.round((a + step) * 100) / 100);
      });

      const color = ctx.colors[0];
      const o = C.base(cfg, ctx);
      o.grid = C.gridFor(cfg, ctx);
      const xa = C.catAxis(cfg, ctx, labels, { name: cfg.axisXName || ns[0].name });
      xa.axisLabel.rotate = cfg.axisXRotate || 34;
      o.xAxis = xa;
      o.yAxis = C.valAxis(cfg, ctx, { name: cfg.axisYName || '频数' });
      o.toolbox = C.toolboxOf(cfg, ctx);
      o.tooltip = C.buildTooltip(cfg, ctx, { trigger: 'axis', pointer: 'shadow' });
      o.series = [{
        name: '频数',
        type: 'bar',
        data: bins,
        barCategoryGap: '4%',
        itemStyle: C.barItemStyle(cfg, ctx, color, false),
        emphasis: { focus: 'series' },
        label: C.insideLabel(cfg, ctx, color)
      }];
      o.__meta = {
        title: '直方图 · 样本 ' + values.length + ' 个 · 分组 ' + binCount +
          ' · 均值 ' + (Math.round(values.reduce((a, b) => a + b, 0) / values.length * 100) / 100)
      };
      return o;
    }
  });

  register({
    id: 'boxplot',
    name: '箱线图',
    group: '统计分布',
    icon: 'i-boxplot',
    shape: '分组 + 数值',
    hint: '按分类分组后计算最小值、四分位与中位数。',
    preset: { labelShow: false, splitLineY: true },
    extra: [{ key: 'boxWidth', label: '箱体宽度', type: 'range', min: 10, max: 70, step: 2, unit: '%', def: 34 }],
    build: function (ds, cfg, ctx) {
      const columns = ds.columns || [], rows = ds.rows || [];
      if (!rows.length) return null;

      const numCols = [];
      for (let c = 0; c < columns.length; c++) if (global.Dataset.columnIsNumeric(rows, c)) numCols.push(c);
      if (!numCols.length) return null;
      let nameCol = -1;
      for (let c = 0; c < columns.length; c++) if (numCols.indexOf(c) === -1) { nameCol = c; break; }

      const groups = {}, order = [];
      rows.forEach((r) => {
        const key = nameCol >= 0 ? String(r[nameCol] || '样本') : '样本';
        if (!groups[key]) { groups[key] = []; order.push(key); }
        numCols.forEach((c) => {
          const v = Number(r[c]);
          if (Number.isFinite(v)) groups[key].push(v);
        });
      });
      if (!order.length) return null;

      const boxes = order.map((k) => {
        const sorted = groups[k].slice().sort((a, b) => a - b);
        if (!sorted.length) return [0, 0, 0, 0, 0];
        return [
          Math.round(sorted[0] * 100) / 100,
          Math.round(C.quantile(sorted, 0.25) * 100) / 100,
          Math.round(C.quantile(sorted, 0.5) * 100) / 100,
          Math.round(C.quantile(sorted, 0.75) * 100) / 100,
          Math.round(sorted[sorted.length - 1] * 100) / 100
        ];
      });

      const color = ctx.colors[0];
      const o = C.base(cfg, ctx);
      o.grid = C.gridFor(cfg, ctx, { extraBottom: 6 });
      o.xAxis = C.catAxis(cfg, ctx, order, { name: nameCol >= 0 ? columns[nameCol] : '' });
      o.yAxis = C.valAxis(cfg, ctx, { name: cfg.axisYName || '数值' });
      o.toolbox = C.toolboxOf(cfg, ctx);
      o.tooltip = C.buildTooltip(cfg, ctx, { trigger: 'item', pointer: 'shadow' });
      o.tooltip.formatter = function (p) {
        const v = p.data;
        if (Array.isArray(v) && v.length >= 5) {
          return '<b>' + order[p.dataIndex] + '</b><br/>最大值 ' + C.fmt(v[4]) +
            '<br/>上四分位 ' + C.fmt(v[3]) + '<br/>中位数 ' + C.fmt(v[2]) +
            '<br/>下四分位 ' + C.fmt(v[1]) + '<br/>最小值 ' + C.fmt(v[0]);
        }
        return p.name + '：' + C.fmt(p.value);
      };
      const bw = (cfg.boxWidth === undefined ? 34 : Number(cfg.boxWidth));
      o.series = [{
        name: '分布',
        type: 'boxplot',
        data: boxes,
        boxWidth: [(bw / 2) + '%', bw + '%'],
        itemStyle: {
          color: P.rgba(color, .22),
          borderColor: color,
          borderWidth: 1.6,
          shadowBlur: 8,
          shadowColor: P.rgba(color, .2)
        },
        emphasis: { itemStyle: { color: P.rgba(color, .4), borderColor: P.tint(color, .2), borderWidth: 2 } }
      }];
      o.__meta = { title: '箱线图 · ' + order.length + ' 组样本' };
      return o;
    }
  });

  register({
    id: 'candlestick',
    name: 'K 线图',
    group: '统计分布',
    icon: 'i-candlestick',
    shape: '日期 + OHLC',
    hint: '识别开盘/收盘/最低/最高四列；不足时按相邻值合成。',
    preset: { splitLineY: true, axisXRotate: 30, tooltipCross: true },
    extra: [
      { key: 'showMA', label: '显示均线 MA5 / MA10', type: 'switch', def: true },
      { key: 'candleWidth', label: '蜡烛宽度', type: 'range', min: 4, max: 40, step: 1, unit: 'px', def: 16 }
    ],
    build: function (ds, cfg, ctx) {
      const columns = ds.columns || [], rows = ds.rows || [];
      if (!rows.length) return null;
      const numCols = [];
      for (let c = 0; c < columns.length; c++) if (global.Dataset.columnIsNumeric(rows, c)) numCols.push(c);
      if (!numCols.length) return null;

      const allNumeric = numCols.length === columns.length;
      const cats = rows.map((r, i) => {
        if (allNumeric) return String(i + 1);
        const v = r[0];
        return (v === '' || v === null || v === undefined) ? String(i + 1) : String(v);
      });

      let ohlc;
      if (numCols.length >= 4) {
        const b = numCols.indexOf(0) === -1 ? 0 : 1;
        ohlc = rows.map((r) => {
          const op = Number(r[numCols[b]]) || 0;
          const cl = Number(r[numCols[b + 1]]) || 0;
          const l1 = Number(r[numCols[b + 2]]) || 0;
          const h1 = Number(r[numCols[b + 3]]) || 0;
          return [op, cl, Math.min(l1, h1), Math.max(h1, l1)];
        });
      } else {
        const vc = numCols[0];
        ohlc = rows.map((r, i) => {
          const cl = Number(r[vc]) || 0;
          const op = i === 0 ? cl : (Number(rows[i - 1][vc]) || cl);
          const spread = Math.abs(cl - op) * 0.6 + Math.abs(cl) * 0.012;
          return [
            Math.round(op * 100) / 100, Math.round(cl * 100) / 100,
            Math.round((Math.min(op, cl) - spread) * 100) / 100,
            Math.round((Math.max(op, cl) + spread) * 100) / 100
          ];
        });
      }

      const closes = ohlc.map((d) => d[1]);
      const up = ctx.colors[1] || '#22c55e';
      const down = ctx.colors[2] || '#ef4444';

      const o = C.base(cfg, ctx);
      o.grid = C.gridFor(cfg, ctx, { extraBottom: 6 });
      o.xAxis = C.catAxis(cfg, ctx, cats);
      o.xAxis.axisLabel.rotate = cfg.axisXRotate || (cats.length > 14 ? 40 : 0);
      const ya = C.valAxis(cfg, ctx, { name: cfg.axisYName || '价格' });
      ya.scale = true;
      o.yAxis = ya;
      o.toolbox = C.toolboxOf(cfg, ctx);
      o.tooltip = C.buildTooltip(cfg, ctx, { trigger: 'axis', pointer: 'cross' });
      o.tooltip.axisPointer.type = 'cross';
      o.series = [{
        name: cfg.seriesName || 'K 线',
        type: 'candlestick',
        data: ohlc,
        barMaxWidth: cfg.candleWidth ? Number(cfg.candleWidth) : 16,
        itemStyle: { color: up, color0: down, borderColor: up, borderColor0: down, borderWidth: 1.2 },
        emphasis: { itemStyle: { borderWidth: 2 } }
      }];

      if (cfg.showMA !== false) {
        [[5, ctx.colors[3] || '#f59e0b'], [10, ctx.colors[4] || '#8b5cf6']].forEach((pair) => {
          const n = pair[0];
          if (closes.length < n) return;
          const ma = [];
          for (let i = 0; i < closes.length; i++) {
            if (i < n - 1) { ma.push('-'); continue; }
            let s = 0;
            for (let k = 0; k < n; k++) s += closes[i - k];
            ma.push(Math.round((s / n) * 100) / 100);
          }
          o.series.push({
            name: 'MA' + n,
            type: 'line',
            data: ma,
            smooth: true,
            symbol: 'none',
            lineStyle: { width: 1.6, color: pair[1], opacity: .9 },
            itemStyle: { color: pair[1] }
          });
        });
      }
      const last = closes[closes.length - 1], first = closes[0];
      const chg = first ? ((last - first) / first * 100) : 0;
      o.__meta = { title: 'K 线图 · ' + ohlc.length + ' 根 · 区间涨跌 ' + (chg >= 0 ? '+' : '') + (Math.round(chg * 100) / 100) + '%' };
      return o;
    }
  });

  register({
    id: 'heatmap',
    name: '热力图',
    group: '统计分布',
    icon: 'i-heatmap',
    shape: '三列矩阵',
    hint: '前两列作为交叉维度，第三列数值映射为色彩深浅。',
    preset: { labelShow: true, splitLineX: true },
    extra: [
      { key: 'visualMap', label: '显示色阶条', type: 'switch', def: true },
      { key: 'heatOpacity', label: '色块不透明度', type: 'range', min: 30, max: 100, step: 2, unit: '%', def: 92 }
    ],
    build: function (ds, cfg, ctx) {
      const m = C.matrixData(ds);
      if (!m) return null;
      const T = ctx.T;
      const lo = ctx.colors[0] || '#3b82f6', hi = ctx.colors[1] || '#ef4444';

      const o = C.base(cfg, ctx);
      o.grid = C.gridFor(cfg, ctx, { extraBottom: 26, extraLeft: 8 });
      o.xAxis = {
        type: 'category', data: m.xLabels, name: m.xName,
        splitArea: { show: true, areaStyle: { color: [P.rgba(lo, .03), 'transparent'] } },
        axisLine: { show: true, lineStyle: { color: T.axisLine } },
        axisTick: { show: false },
        axisLabel: { color: T.axis, fontSize: C.axisFont(cfg), fontFamily: C.FONT, rotate: cfg.axisXRotate || 0, hideOverlap: true },
        nameTextStyle: { color: T.axis, fontSize: 11 }
      };
      o.yAxis = {
        type: 'category', data: m.yLabels, name: m.yName,
        splitArea: { show: true, areaStyle: { color: [P.rgba(lo, .03), 'transparent'] } },
        axisLine: { show: true, lineStyle: { color: T.axisLine } },
        axisTick: { show: false },
        axisLabel: { color: T.axis, fontSize: C.axisFont(cfg), fontFamily: C.FONT, hideOverlap: true },
        nameTextStyle: { color: T.axis, fontSize: 11 }
      };
      o.tooltip = C.buildTooltip(cfg, ctx, { trigger: 'item', pointer: 'none' });
      o.toolbox = C.toolboxOf(cfg, ctx);
      o.visualMap = {
        show: cfg.visualMap !== false,
        min: 0,
        max: m.max,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 2,
        itemWidth: 12,
        itemHeight: 96,
        textStyle: { color: T.axis, fontSize: 10 },
        inRange: {
          color: [P.tint(lo, .84), P.tint(lo, .38), lo, hi],
          opacity: (cfg.heatOpacity === undefined ? 92 : Number(cfg.heatOpacity)) / 100
        }
      };
      o.series = [{
        name: cfg.seriesName || '热力值',
        type: 'heatmap',
        data: m.data,
        label: (function () {
          const l = C.labelCfg(cfg, ctx, 'pie');
          if (!l.show) return { show: false };
          l.position = 'inside';
          l.fontSize = cfg.labelSize || 10;
          l.formatter = function (p) { return C.fmt(p.data[2], cfg.thousandSep !== false); };
          return l;
        })(),
        itemStyle: {
          borderColor: T.dark ? 'rgba(8,13,25,.65)' : 'rgba(255,255,255,.88)',
          borderWidth: 1.6,
          borderRadius: 3
        },
        emphasis: { itemStyle: { borderColor: '#4f8cff', borderWidth: 2, shadowBlur: 10, shadowColor: 'rgba(0,0,0,.35)' } }
      }];
      o.__meta = { title: '热力图 · ' + m.yLabels.length + ' x ' + m.xLabels.length + ' 矩阵' };
      return o;
    }
  });

  register({
    id: 'pareto',
    name: '帕累托图',
    group: '统计分布',
    icon: 'i-pareto',
    shape: '名称 + 单值',
    hint: '降序柱状 + 累计占比折线，用于识别关键少数。',
    preset: { labelShow: true, splitLineY: true },
    build: function (ds, cfg, ctx) {
      const pairs = C.pairData(ds);
      if (!pairs.length) return null;
      const sorted = pairs.slice().sort((a, b) => b[1] - a[1]);
      const cats = sorted.map((p) => p[0]);
      const vals = sorted.map((p) => p[1]);
      const total = vals.reduce((a, b) => a + b, 0) || 1;
      let acc = 0;
      const cum = vals.map((v) => { acc += v; return Math.round((acc / total) * 10000) / 100; });

      const color = ctx.colors[0], color2 = ctx.colors[1] || '#f59e0b';
      const T = ctx.T;

      const o = C.base(cfg, ctx);
      o.grid = C.gridFor(cfg, ctx, { extraRight: 44 });
      const xa = C.catAxis(cfg, ctx, cats);
      xa.axisLabel.rotate = cfg.axisXRotate || (cats.length > 7 ? 30 : 0);
      o.xAxis = xa;
      const y0 = C.valAxis(cfg, ctx, { name: cfg.axisYName || '数值' });
      const y1 = C.valAxis(cfg, ctx, { name: '累计占比' });
      y1.min = 0; y1.max = 100; y1.position = 'right';
      y1.splitLine = { show: false };
      y1.axisLabel = { color: T.axis, fontSize: C.axisFont(cfg), formatter: '{value}%' };
      o.yAxis = [y0, y1];
      o.toolbox = C.toolboxOf(cfg, ctx);
      o.tooltip = C.buildTooltip(cfg, ctx, { trigger: 'axis', pointer: 'shadow' });
      o.series = [
        {
          name: '数值',
          type: 'bar',
          data: vals,
          barMaxWidth: 42,
          itemStyle: C.barItemStyle(cfg, ctx, color, false),
          label: C.insideLabel(cfg, ctx, color)
        },
        {
          name: '累计占比',
          type: 'line',
          yAxisIndex: 1,
          data: cum,
          smooth: true,
          symbol: 'circle',
          symbolSize: 7,
          lineStyle: { width: 2.4, color: color2 },
          itemStyle: { color: color2, borderColor: T.dark ? '#0b1120' : '#ffffff', borderWidth: 1.4 },
          label: (function () {
            const l = C.labelCfg(cfg, ctx);
            if (!l.show) return { show: false };
            l.formatter = '{c}%';
            return l;
          })(),
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: P.rgba(color2, .55), type: 'dashed' },
            label: { color: T.axis, fontSize: 10, formatter: '80% 分界' },
            data: [{ yAxis: 80 }]
          }
        }
      ];
      let cut = cum.length;
      for (let i = 0; i < cum.length; i++) if (cum[i] >= 80) { cut = i + 1; break; }
      o.__meta = { title: '帕累托图 · 前 ' + cut + ' 项累计 ' + cum[cut - 1] + '%' };
      return o;
    }
  });

})(window);
