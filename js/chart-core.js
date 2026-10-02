/* ============================================================
   chart-core.js — 图表内核
   注册表 · 主题色板 · 数据适配器 · option 公共片段
   ============================================================ */
(function (global) {
  'use strict';

  const P = global.Palettes;
  const D = global.Dataset;
  const FONT = 'Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';

  const CT = { list: [], map: {}, groups: [], groupOrder: [] };

  function register(def) {
    CT.list.push(def);
    CT.map[def.id] = def;
    if (CT.groupOrder.indexOf(def.group) === -1) {
      CT.groupOrder.push(def.group);
      CT.groups.push({ name: def.group, items: [] });
    }
    CT.groups.filter((g) => g.name === def.group)[0].items.push(def);
  }

  /* ---------- 主题色板 ---------- */
  function themeOf(dark) {
    return dark ? {
      dark: true,
      text: '#dde6f5', strong: '#ffffff', axis: '#8494ad',
      split: 'rgba(255,255,255,.075)', axisLine: 'rgba(255,255,255,.17)',
      tipBg: 'rgba(11,18,32,.95)', tipBorder: '#22314e', tipText: '#e6eefc'
    } : {
      dark: false,
      text: '#22314a', strong: '#0d1a2e', axis: '#6a7c96',
      split: 'rgba(15,32,64,.09)', axisLine: 'rgba(15,32,64,.22)',
      tipBg: 'rgba(255,255,255,.98)', tipBorder: '#d7e0ee', tipText: '#1b2b45'
    };
  }

  /* ---------- 数值格式化 ---------- */
  function fmt(n, thousand) {
    if (n === null || n === undefined || n === '') return '';
    const v = Number(n);
    if (!Number.isFinite(v)) return String(n);
    if (thousand === false) return String(Math.round(v * 1000) / 1000);
    if (Math.abs(v) >= 10000) return v.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
    return String(Math.round(v * 100) / 100);
  }

  function shortNum(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v);
    const a = Math.abs(n);
    if (a >= 1e8) return (n / 1e8).toFixed(a >= 1e9 ? 0 : 1) + '亿';
    if (a >= 1e4) return (n / 1e4).toFixed(a >= 1e5 ? 0 : 1) + '万';
    return String(Math.round(n * 100) / 100);
  }

  /* ---------- 数据适配器 ---------- */
  function catSeries(ds) {
    const columns = (ds && ds.columns) || [];
    const rows = (ds && ds.rows) || [];
    if (!columns.length || !rows.length) return { cats: [], series: [] };

    const numericCols = [];
    for (let c = 0; c < columns.length; c++) if (D.columnIsNumeric(rows, c)) numericCols.push(c);

    let catCol = -1;
    for (let c = 0; c < columns.length; c++) {
      if (numericCols.indexOf(c) === -1) { catCol = c; break; }
    }

    let seriesCols = numericCols.slice();
    if (!seriesCols.length) {
      for (let c = 0; c < columns.length; c++) if (c !== catCol) seriesCols.push(c);
      if (!seriesCols.length) seriesCols = [0];
    }

    const cats = catCol >= 0
      ? rows.map((r) => {
        const v = r[catCol];
        return (v === '' || v === null || v === undefined) ? '-' : String(v);
      })
      : rows.map((_, i) => String(i + 1));

    const series = seriesCols.map((c) => ({
      name: columns[c] || ('系列' + (c + 1)),
      data: rows.map((r) => {
        const raw = r[c];
        if (raw === '' || raw === null || raw === undefined) return null;
        const v = Number(raw);
        return Number.isFinite(v) ? v : null;
      })
    })).filter((s) => s.data.some((v) => v !== null));

    return { cats: cats, series: series, numericCols: numericCols, catCol: catCol };
  }

  function pairData(ds) {
    const columns = (ds && ds.columns) || [];
    const rows = (ds && ds.rows) || [];
    if (!rows.length) return [];

    let valueCol = -1;
    for (let c = columns.length - 1; c >= 0; c--) if (D.columnIsNumeric(rows, c)) { valueCol = c; break; }
    if (valueCol === -1) valueCol = columns.length - 1;

    let nameCol = -1;
    for (let c = 0; c < columns.length; c++) {
      if (c !== valueCol && !D.columnIsNumeric(rows, c)) { nameCol = c; break; }
    }
    if (nameCol === -1) for (let c = 0; c < columns.length; c++) if (c !== valueCol) { nameCol = c; break; }

    return rows.map((r, i) => {
      const raw = nameCol >= 0 ? r[nameCol] : (i + 1);
      const name = (raw === '' || raw === null || raw === undefined) ? ('项目' + (i + 1)) : String(raw);
      const v = Number(r[valueCol]);
      return [name, Number.isFinite(v) ? v : 0];
    });
  }

  function numericSeries(ds) {
    const columns = (ds && ds.columns) || [];
    const rows = (ds && ds.rows) || [];
    const out = [];
    for (let c = 0; c < columns.length; c++) {
      if (D.columnIsNumeric(rows, c)) {
        out.push({
          name: columns[c],
          index: c,
          data: rows.map((r) => {
            const v = Number(r[c]);
            return Number.isFinite(v) ? v : null;
          }).filter((v) => v !== null)
        });
      }
    }
    return out;
  }

  function tripleData(ds) {
    const columns = (ds && ds.columns) || [];
    const rows = (ds && ds.rows) || [];
    if (!rows.length || columns.length < 3) return [];
    return rows.map((r) => [String(r[0] === undefined ? '' : r[0]), String(r[1] === undefined ? '' : r[1]), Number(r[2]) || 0])
      .filter((t) => t[0] !== '' && t[1] !== '');
  }

  function matrixData(ds) {
    const columns = (ds && ds.columns) || [];
    const rows = (ds && ds.rows) || [];
    if (!rows.length || columns.length < 3) return null;

    const numCols = [];
    for (let c = 0; c < columns.length; c++) if (D.columnIsNumeric(rows, c)) numCols.push(c);
    if (!numCols.length) return null;
    const valueCol = numCols[numCols.length - 1];
    const dimCols = [];
    for (let c = 0; c < columns.length; c++) if (c !== valueCol) dimCols.push(c);
    if (dimCols.length < 2) return null;

    const xs = [], ys = [];
    rows.forEach((r) => {
      const x = String(r[dimCols[0]]), y = String(r[dimCols[1]]);
      if (xs.indexOf(x) === -1) xs.push(x);
      if (ys.indexOf(y) === -1) ys.push(y);
    });

    const data = rows.map((r) => [
      xs.indexOf(String(r[dimCols[0]])),
      ys.indexOf(String(r[dimCols[1]])),
      Number(r[valueCol]) || 0
    ]);
    const maxV = Math.max.apply(null, data.map((d) => d[2]).concat([1]));

    return {
      xLabels: xs, yLabels: ys, data: data, max: maxV,
      xName: columns[dimCols[0]], yName: columns[dimCols[1]]
    };
  }

  function scatterData(ds) {
    const columns = (ds && ds.columns) || [];
    const rows = (ds && ds.rows) || [];
    if (!rows.length) return null;
    const numCols = [];
    for (let c = 0; c < columns.length; c++) if (D.columnIsNumeric(rows, c)) numCols.push(c);

    const labelOf = (r, i) => {
      const v = r[0];
      return (v === '' || v === undefined || v === null) ? String(i + 1) : String(v);
    };

    if (numCols.length >= 3) {
      return {
        points: rows.map((r) => [Number(r[numCols[0]]), Number(r[numCols[1]]), Number(r[numCols[2]])]).filter((p) => p.every(Number.isFinite)),
        labels: rows.map(labelOf),
        xName: columns[numCols[0]], yName: columns[numCols[1]], zName: columns[numCols[2]], dim: 3
      };
    }
    if (numCols.length === 2) {
      return {
        points: rows.map((r) => [Number(r[numCols[0]]), Number(r[numCols[1]])]).filter((p) => p.every(Number.isFinite)),
        labels: rows.map(labelOf),
        xName: columns[numCols[0]], yName: columns[numCols[1]], dim: 2
      };
    }
    if (!numCols.length) return null;
    return {
      points: rows.map((r, i) => [i + 1, Number(r[numCols[0]])]).filter((p) => p.every(Number.isFinite)),
      labels: rows.map(labelOf),
      xName: '序号', yName: columns[numCols[0]], dim: 2
    };
  }

  function toNums(arr) {
    return (arr || []).map((v) => Number(v)).filter((v) => Number.isFinite(v));
  }

  /**
   * 把配置项当百分比使用。
   * 配置面板的 range 控件写入的是数字（58），而 ECharts 对 center / radius 这类
   * 参数把裸数字解释为「像素」，必须以 '58%' 形式传入，否则图形会贴着左上角渲染。
   */
  function pct(v, fallback) {
    if (v === undefined || v === null || v === '') return fallback;
    const s = String(v).trim();
    return /^-?\d+(\.\d+)?$/.test(s) ? s + '%' : s;
  }

  function quantile(sorted, p) {
    if (!sorted.length) return 0;
    const pos = (sorted.length - 1) * p;
    const base = Math.floor(pos), rest = pos - base;
    if (sorted[base + 1] !== undefined) return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    return sorted[base];
  }

  /* ---------- option 公共片段 ---------- */
  function buildTitle(cfg, ctx) {
    if (cfg.showTitle === false) return { show: false };
    const T = ctx.T;
    const align = cfg.titleAlign || 'center';
    const t = {
      show: true,
      text: cfg.title || '',
      subtext: cfg.subtitle || '',
      textAlign: align,
      top: 10,
      itemGap: 6,
      textStyle: { color: T.strong, fontSize: cfg.titleSize || 18, fontWeight: 600, fontFamily: FONT },
      subtextStyle: { color: T.axis, fontSize: cfg.subtitleSize || 12, fontFamily: FONT }
    };
    if (align === 'center') t.left = 'center';
    else if (align === 'left') t.left = 18;
    else t.right = 18;
    return t;
  }

  function buildLegend(cfg, ctx, override) {
    const T = ctx.T;
    const pos = override || cfg.legendPos || 'top';
    if (cfg.legendShow === false || pos === 'none') return { show: false };
    const base = {
      show: true,
      type: cfg.legendScroll === false ? 'plain' : 'scroll',
      icon: cfg.legendIcon || 'roundRect',
      itemWidth: cfg.legendItemWidth || 12,
      itemHeight: cfg.legendItemHeight || 8,
      itemGap: cfg.legendGap || 14,
      textStyle: { color: T.axis, fontSize: cfg.legendFontSize || 11, fontFamily: FONT },
      pageIconColor: '#4f8cff',
      pageIconInactiveColor: T.axis,
      pageTextStyle: { color: T.axis },
      padding: 0
    };
    const top = cfg.showTitle === false ? 10 : 48;
    if (pos === 'top') Object.assign(base, { top: top, left: 'center', orient: 'horizontal' });
    else if (pos === 'bottom') Object.assign(base, { bottom: 6, left: 'center', orient: 'horizontal' });
    else if (pos === 'left') Object.assign(base, { left: 8, top: 'middle', orient: 'vertical', itemGap: 9 });
    else if (pos === 'right') Object.assign(base, { right: 8, top: 'middle', orient: 'vertical', itemGap: 9 });
    return base;
  }

  function buildTooltip(cfg, ctx, override) {
    if (cfg.tooltipShow === false) return { show: false };
    const T = ctx.T;
    const o = override || {};
    return {
      show: true,
      trigger: o.trigger || cfg.tooltipTrigger || 'axis',
      axisPointer: {
        type: o.pointer || (cfg.tooltipCross ? 'cross' : 'shadow'),
        lineStyle: { color: T.axisLine, type: 'dashed' },
        shadowStyle: { color: T.dark ? 'rgba(255,255,255,.045)' : 'rgba(15,32,64,.05)' },
        crossStyle: { color: T.axisLine },
        label: { backgroundColor: T.tipBorder, color: T.tipText, fontSize: 11 }
      },
      backgroundColor: T.tipBg,
      borderColor: T.tipBorder,
      borderWidth: 1,
      padding: [9, 12],
      textStyle: { color: T.tipText, fontSize: cfg.tooltipFontSize || 12, fontFamily: FONT },
      extraCssText: 'border-radius:9px;box-shadow:0 12px 30px -12px rgba(0,0,0,.55);backdrop-filter:blur(8px);',
      confine: true,
      valueFormatter: cfg.thousandSep === false ? undefined : function (v) {
        return typeof v === 'number' ? fmt(v, true) : v;
      }
    };
  }

  function gridFor(cfg, ctx, opts) {
    const o = opts || {};
    const pos = cfg.legendShow === false ? 'none' : (cfg.legendPos || 'top');
    let top = 14, bottom = 18, left = 12, right = 20;
    if (cfg.showTitle !== false) { top += 46; if (cfg.subtitle) top += 8; }
    if (pos === 'top') top += 28;
    if (pos === 'bottom') bottom += 30;
    if (pos === 'left') left += 92;
    if (pos === 'right') right += 100;
    if (cfg.dataZoom) bottom += 30;
    top += o.extraTop || 0;
    bottom += o.extraBottom || 0;
    left += o.extraLeft || 0;
    right += o.extraRight || 0;
    return { top: top, bottom: bottom, left: left, right: right, containLabel: true, borderWidth: 0 };
  }

  function axisFont(cfg) { return cfg.axisFontSize || 11; }

  function catAxis(cfg, ctx, data, opts) {
    const T = ctx.T, o = opts || {};
    return {
      type: 'category',
      data: data,
      show: cfg.axisXShow !== false,
      name: o.name || cfg.axisXName || '',
      nameLocation: 'end',
      nameGap: 12,
      nameTextStyle: { color: T.axis, fontSize: axisFont(cfg), fontFamily: FONT, padding: [0, 0, 0, 4] },
      boundaryGap: o.boundaryGap === undefined ? true : o.boundaryGap,
      axisLine: { show: true, lineStyle: { color: T.axisLine } },
      axisTick: { show: !!cfg.axisTick },
      axisLabel: {
        color: T.axis, fontSize: axisFont(cfg), fontFamily: FONT,
        rotate: cfg.axisXRotate || 0,
        interval: cfg.axisLabelInterval === undefined ? 'auto' : cfg.axisLabelInterval,
        hideOverlap: true,
        margin: 9
      },
      splitLine: { show: !!cfg.splitLineX, lineStyle: { color: T.split, type: 'dashed' } },
      axisPointer: { label: { fontSize: 11 } }
    };
  }

  function valAxis(cfg, ctx, opts) {
    const T = ctx.T, o = opts || {};
    const a = {
      type: 'value',
      show: cfg.axisYShow !== false,
      name: o.name || cfg.axisYName || '',
      nameTextStyle: { color: T.axis, fontSize: axisFont(cfg), fontFamily: FONT, padding: [0, 0, 4, 0] },
      axisLine: { show: !!cfg.axisYLine, lineStyle: { color: T.axisLine } },
      axisTick: { show: false },
      axisLabel: {
        color: T.axis, fontSize: axisFont(cfg), fontFamily: FONT,
        formatter: cfg.axisYShort ? shortNum : (cfg.thousandSep === false ? undefined : function (v) { return fmt(v, true); })
      },
      splitLine: { show: cfg.splitLineY !== false, lineStyle: { color: T.split, type: 'dashed' } },
      scale: !!cfg.yScale
    };
    if (cfg.yMin !== '' && cfg.yMin !== undefined && cfg.yMin !== null && cfg.yMin !== 'auto') a.min = Number(cfg.yMin);
    if (cfg.yMax !== '' && cfg.yMax !== undefined && cfg.yMax !== null && cfg.yMax !== 'auto') a.max = Number(cfg.yMax);
    if (o.position) a.position = o.position;
    if (o.gridIndex) a.gridIndex = o.gridIndex;
    a.__isValue = true;
    return a;
  }

  function labelCfg(cfg, ctx, kind) {
    if (cfg.labelShow === false) return { show: false };
    const T = ctx.T;
    const pos = cfg.labelPos || (kind === 'pie' ? 'outside' : (kind === 'bar-h' ? 'right' : 'top'));
    return {
      show: true,
      position: pos,
      rotate: cfg.labelRotate || 0,
      fontSize: cfg.labelSize || 11,
      fontFamily: FONT,
      fontWeight: cfg.labelBold ? 600 : 400,
      color: cfg.labelColor || T.text,
      distance: cfg.labelDistance === undefined ? 6 : cfg.labelDistance,
      formatter: cfg.labelFormatter || null
    };
  }

  function insideLabel(cfg, ctx, color) {
    const l = labelCfg(cfg, ctx);
    if (!l.show) return l;
    if (String(l.position).indexOf('inside') === 0 || l.position === 'center') {
      l.color = cfg.labelColor || P.readableOn(typeof color === 'string' && color.charAt(0) === '#' ? color : '#3b82f6');
    }
    return l;
  }

  function barItemStyle(cfg, ctx, color, horizontal) {
    const radius = cfg.barRadius === undefined ? 4 : Number(cfg.barRadius);
    const r = horizontal ? [0, radius, radius, 0] : [radius, radius, 0, 0];
    const st = { borderRadius: r, borderWidth: 0, color: color };
    if (cfg.fillMode === 'gradient' && ctx.graphic) {
      st.color = horizontal
        ? new ctx.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: P.shade(color, .12) }, { offset: 1, color: P.tint(color, .22) }])
        : new ctx.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: P.tint(color, .2) }, { offset: 1, color: P.shade(color, .18) }]);
    }
    if (cfg.seriesBorder) { st.borderWidth = 1.2; st.borderColor = P.rgba(color, .45); }
    return st;
  }

  function barWidthOf(cfg) {
    if (cfg.barWidth === undefined || cfg.barWidth === '' || cfg.barWidth === 'auto') return undefined;
    const n = Number(cfg.barWidth);
    return Number.isFinite(n) ? n + '%' : undefined;
  }

  function base(cfg, ctx) {
    const T = ctx.T;
    return {
      backgroundColor: (cfg.chartBg && cfg.chartBg !== 'transparent') ? cfg.chartBg : 'transparent',
      animation: cfg.animation !== false,
      animationDuration: cfg.animationDuration || 760,
      animationDurationUpdate: 420,
      animationEasing: 'cubicOut',
      animationEasingUpdate: 'cubicInOut',
      color: ctx.colors,
      textStyle: { fontFamily: FONT, color: T.text, fontSize: cfg.fontSize || 12 },
      title: buildTitle(cfg, ctx),
      legend: buildLegend(cfg, ctx),
      tooltip: buildTooltip(cfg, ctx)
    };
  }

  function toolboxOf(cfg, ctx) {
    if (!cfg.toolbox) return { show: false };
    const T = ctx.T;
    return {
      show: true,
      right: 14,
      top: cfg.showTitle === false ? 10 : 46,
      itemSize: 13,
      itemGap: 10,
      iconStyle: { borderColor: T.axis, borderWidth: 1.2 },
      emphasis: { iconStyle: { borderColor: '#4f8cff' } },
      feature: {
        dataView: {
          readOnly: true, title: '数据视图', lang: ['数据视图', '关闭', '刷新'],
          backgroundColor: T.tipBg, textareaColor: 'transparent', textareaBorderColor: T.tipBorder, textColor: T.tipText
        },
        magicType: { type: ['line', 'bar', 'stack'], title: { line: '切换折线', bar: '切换柱状', stack: '切换堆叠' } },
        restore: { title: '还原' },
        saveAsImage: {
          title: '保存图片', type: 'png', pixelRatio: 2,
          backgroundColor: (cfg.chartBg && cfg.chartBg !== 'transparent') ? cfg.chartBg : (T.dark ? '#0b1120' : '#ffffff')
        }
      }
    };
  }

  function dataZoomOf(cfg, ctx, axisIndex) {
    if (!cfg.dataZoom) return [];
    const T = ctx.T;
    const common = {
      type: 'slider',
      height: 16,
      bottom: 6,
      borderColor: 'transparent',
      backgroundColor: T.dark ? 'rgba(255,255,255,.05)' : 'rgba(15,32,64,.05)',
      fillerColor: P.rgba('#4f8cff', .18),
      handleStyle: { color: '#4f8cff', borderColor: '#4f8cff' },
      moveHandleStyle: { color: P.rgba('#4f8cff', .5) },
      dataBackground: {
        lineStyle: { color: P.rgba('#4f8cff', .45), width: 1 },
        areaStyle: { color: P.rgba('#4f8cff', .12) }
      },
      selectedDataBackground: {
        lineStyle: { color: '#4f8cff' },
        areaStyle: { color: P.rgba('#4f8cff', .22) }
      },
      textStyle: { color: T.axis, fontSize: 10 },
      start: cfg.dataZoomStart === undefined ? 0 : cfg.dataZoomStart,
      end: cfg.dataZoomEnd === undefined ? 100 : cfg.dataZoomEnd,
      brushSelect: false
    };
    if (axisIndex !== undefined) {
      return [
        Object.assign({}, common, { xAxisIndex: axisIndex }),
        { type: 'inside', xAxisIndex: axisIndex, zoomOnMouseWheel: true, moveOnMouseMove: true }
      ];
    }
    return [
      Object.assign({}, common, { xAxisIndex: [0] }),
      { type: 'inside', xAxisIndex: [0], yAxisIndex: [0] }
    ];
  }

  global.ChartCore = {
    FONT: FONT,
    CT: CT,
    register: register,
    themeOf: themeOf,
    fmt: fmt,
    shortNum: shortNum,
    catSeries: catSeries,
    pairData: pairData,
    numericSeries: numericSeries,
    tripleData: tripleData,
    matrixData: matrixData,
    scatterData: scatterData,
    toNums: toNums,
    pct: pct,
    quantile: quantile,
    buildTitle: buildTitle,
    buildLegend: buildLegend,
    buildTooltip: buildTooltip,
    gridFor: gridFor,
    axisFont: axisFont,
    catAxis: catAxis,
    valAxis: valAxis,
    labelCfg: labelCfg,
    insideLabel: insideLabel,
    barItemStyle: barItemStyle,
    barWidthOf: barWidthOf,
    base: base,
    toolboxOf: toolboxOf,
    dataZoomOf: dataZoomOf
  };

})(window);
