/* ============================================================
   charts-a.js — 柱状 / 条形 · 折线 / 面积 · 组合图
   ============================================================ */
(function (global) {
  'use strict';

  const C = global.ChartCore;
  const P = global.Palettes;
  const register = C.register;

  /* ============================================================
     柱状 / 条形
     ============================================================ */
  function buildBar(ds, cfg, ctx, mode) {
    const cs = C.catSeries(ds);
    if (!cs.series.length) return null;

    const horizontal = mode === 'horizontal' || mode === 'stack-h';
    const stacked = mode === 'stack' || mode === 'stack-h' || (cfg.stack && mode === 'group');
    const cols = ctx.colors;

    const series = cs.series.map((s, i) => {
      const color = cols[i % cols.length];
      const st = {
        name: s.name,
        type: 'bar',
        data: s.data,
        stack: stacked ? 'total' : undefined,
        barMaxWidth: cfg.barMaxWidth ? Number(cfg.barMaxWidth) : 38,
        barGap: stacked ? undefined : ((cfg.barGap === undefined ? 18 : cfg.barGap) + '%'),
        barCategoryGap: (cfg.barCategoryGap === undefined ? 42 : cfg.barCategoryGap) + '%',
        itemStyle: C.barItemStyle(cfg, ctx, color, horizontal),
        emphasis: { focus: 'series', itemStyle: { shadowBlur: 14, shadowColor: P.rgba(color, .5) } },
        label: C.insideLabel(cfg, ctx, color),
        labelLayout: { hideOverlap: true }
      };
      const w = C.barWidthOf(cfg);
      if (w && cs.series.length === 1) st.barWidth = w;
      if (stacked) st.stack = 'total';
      return st;
    });

    const o = C.base(cfg, ctx);
    o.grid = C.gridFor(cfg, ctx, horizontal ? { extraLeft: 10 } : {});
    if (horizontal) {
      o.xAxis = C.valAxis(cfg, ctx);
      o.yAxis = C.catAxis(cfg, ctx, cs.cats);
      o.yAxis.inverse = cfg.inverseAxis === true;
    } else {
      o.xAxis = C.catAxis(cfg, ctx, cs.cats);
      o.yAxis = C.valAxis(cfg, ctx);
    }
    o.dataZoom = dataZoomAxis(cfg, ctx, horizontal, cs.cats.length);
    o.tooltip.axisPointer.type = cfg.tooltipCross ? 'cross' : 'shadow';
    o.series = series;
    o.toolbox = C.toolboxOf(cfg, ctx);
    return o;
  }

  function dataZoomAxis(cfg, ctx, horizontal, n) {
    if (!cfg.dataZoom || n < 6) return [];
    const dz = C.dataZoomOf(cfg, ctx, undefined);
    // 横向柱状图缩放应作用于 y 轴
    if (horizontal) {
      const T = ctx.T;
      return [
        {
          type: 'slider', yAxisIndex: [0], width: 14, right: 4, top: 90, bottom: 60,
          borderColor: 'transparent',
          backgroundColor: T.dark ? 'rgba(255,255,255,.05)' : 'rgba(15,32,64,.05)',
          fillerColor: P.rgba('#4f8cff', .18),
          handleStyle: { color: '#4f8cff', borderColor: '#4f8cff' },
          textStyle: { color: T.axis, fontSize: 10 },
          start: cfg.dataZoomStart === undefined ? 0 : cfg.dataZoomStart,
          end: cfg.dataZoomEnd === undefined ? 70 : cfg.dataZoomEnd
        },
        { type: 'inside', yAxisIndex: [0] }
      ];
    }
    return dz;
  }

  /* 柱状家族共用：buildBar 会读取这些键，必须在家族内统一声明。
     若某个类型漏声明，它就会去读别的类型写进配置里的同名值，造成
     各柱状图取值不一致（同名键互相覆盖是历史遗留问题）。 */
  const EXTRA_BAR_WIDTH = [
    { key: 'barWidth', label: '柱宽度', type: 'range', min: 10, max: 100, step: 2, unit: '%', def: 46 },
    { key: 'barCategoryGap', label: '分类间距', type: 'range', min: 0, max: 90, step: 2, unit: '%', def: 42 }
  ];
  const EXTRA_BAR_GAP = [
    { key: 'barGap', label: '系列间距', type: 'range', min: 0, max: 120, step: 2, unit: '%', def: 18 }
  ];
  const EXTRA_BAR_INVERT = [
    { key: 'inverseAxis', label: '反转分类顺序', type: 'switch', def: false }
  ];

  register({
    id: 'bar',
    name: '柱状图',
    group: '柱状 / 条形',
    icon: 'i-bar',
    shape: '分类 + 多系列',
    hint: '首列为分类，其余数值列各成一系列。',
    preset: { stack: false },
    extra: EXTRA_BAR_WIDTH.concat(EXTRA_BAR_GAP),
    build: function (ds, cfg, ctx) { return buildBar(ds, cfg, ctx, cfg.stack ? 'stack' : 'group'); }
  });

  register({
    id: 'bar-group',
    name: '分组柱状',
    group: '柱状 / 条形',
    icon: 'i-bar-group',
    shape: '分类 + 多系列',
    hint: '多个系列并排显示，便于同组横向比较。',
    preset: { stack: false },
    extra: EXTRA_BAR_WIDTH.concat(EXTRA_BAR_GAP),
    build: function (ds, cfg, ctx) { return buildBar(ds, cfg, ctx, 'group'); }
  });

  register({
    id: 'bar-stack',
    name: '堆叠柱状',
    group: '柱状 / 条形',
    icon: 'i-bar-stack',
    shape: '分类 + 多系列',
    hint: '各系列在同一柱体内累加，强调总量与构成。',
    preset: { stack: true },
    extra: EXTRA_BAR_WIDTH,
    build: function (ds, cfg, ctx) { return buildBar(ds, cfg, ctx, 'stack'); }
  });

  register({
    id: 'bar-horizontal',
    name: '条形图',
    group: '柱状 / 条形',
    icon: 'i-bar-h',
    shape: '分类 + 多系列',
    hint: '横向排列，适合分类名称较长的场景。',
    preset: { labelPos: 'right' },
    extra: EXTRA_BAR_WIDTH.concat(EXTRA_BAR_GAP, EXTRA_BAR_INVERT),
    build: function (ds, cfg, ctx) { return buildBar(ds, cfg, ctx, 'horizontal'); }
  });

  register({
    id: 'bar-stack-h',
    name: '堆叠条形',
    group: '柱状 / 条形',
    icon: 'i-bar-stack-h',
    shape: '分类 + 多系列',
    hint: '横向堆叠，兼顾长分类名与构成分析。',
    preset: { labelPos: 'insideRight' },
    extra: EXTRA_BAR_WIDTH.concat(EXTRA_BAR_INVERT),
    build: function (ds, cfg, ctx) { return buildBar(ds, cfg, ctx, 'stack-h'); }
  });

  register({
    id: 'bar-waterfall',
    name: '瀑布图',
    group: '柱状 / 条形',
    icon: 'i-waterfall',
    shape: '分类 + 数值',
    hint: '使用首列的增减量逐步累计，自动以绿升红降着色。',
    preset: { stack: false, labelShow: true, splitLineY: true },
    build: function (ds, cfg, ctx) {
      const cs = C.catSeries(ds);
      if (!cs.series.length) return null;
      const deltas = cs.series[0].data.map((v) => (v === null ? 0 : v));
      const placeholder = [0];
      const steps = [deltas[0]];
      let acc = deltas[0];
      for (let i = 1; i < deltas.length; i++) {
        placeholder.push(Math.min(acc, acc + deltas[i]));
        steps.push(Math.abs(deltas[i]));
        acc += deltas[i];
      }

      const c0 = ctx.colors[0], cUp = ctx.colors[1] || '#22c55e', cDown = ctx.colors[2] || '#ef4444';

      const o = C.base(cfg, ctx);
      o.grid = C.gridFor(cfg, ctx);
      o.xAxis = C.catAxis(cfg, ctx, cs.cats);
      o.yAxis = C.valAxis(cfg, ctx);
      o.toolbox = C.toolboxOf(cfg, ctx);
      o.series = [
        {
          name: '占位',
          type: 'bar',
          stack: 'wf',
          silent: true,
          itemStyle: { color: 'transparent', borderRadius: 0 },
          emphasis: { disabled: true },
          data: placeholder,
          tooltip: { show: false }
        },
        {
          name: '增减',
          type: 'bar',
          stack: 'wf',
          barMaxWidth: 40,
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: function (p) {
              if (p.dataIndex === 0) return c0;
              return deltas[p.dataIndex] >= 0 ? cUp : cDown;
            }
          },
          label: (function () {
            const l = C.labelCfg(cfg, ctx);
            if (!l.show) return { show: false };
            l.position = cfg.labelPos || 'top';
            l.formatter = function (p) {
              const v = deltas[p.dataIndex];
              return (p.dataIndex > 0 && v > 0 ? '+' : '') + C.fmt(v, cfg.thousandSep !== false);
            };
            return l;
          })(),
          data: steps
        }
      ];
      o.__meta = { title: '瀑布图 · 累计终值 ' + C.fmt(acc, cfg.thousandSep !== false) };
      return o;
    }
  });

  register({
    id: 'bar-polar',
    name: '极坐标柱',
    group: '柱状 / 条形',
    icon: 'i-bar-polar',
    shape: '分类 + 多系列',
    hint: '以角度表示分类、半径表示数值的环形柱状图。',
    preset: {},
    extra: [{ key: 'polarRadius', label: '半径', type: 'range', min: 40, max: 88, step: 1, unit: '%', def: 68 }],
    build: function (ds, cfg, ctx) {
      const cs = C.catSeries(ds);
      if (!cs.series.length) return null;
      const cols = ctx.colors, T = ctx.T;

      const o = C.base(cfg, ctx);
      o.toolbox = C.toolboxOf(cfg, ctx);
      o.polar = { center: ['50%', cfg.showTitle === false ? '52%' : '56%'], radius: (cfg.polarRadius || 68) + '%' };
      o.angleAxis = {
        type: 'category',
        data: cs.cats,
        axisLine: { lineStyle: { color: T.axisLine } },
        axisLabel: { color: T.axis, fontSize: C.axisFont(cfg), fontFamily: C.FONT },
        axisTick: { show: false },
        splitLine: { show: !!cfg.splitLineX, lineStyle: { color: T.split, type: 'dashed' } }
      };
      o.radiusAxis = {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: T.axis, fontSize: C.axisFont(cfg), fontFamily: C.FONT },
        splitLine: { show: cfg.splitLineY !== false, lineStyle: { color: T.split, type: 'dashed' } }
      };
      o.tooltip = C.buildTooltip(cfg, ctx, { trigger: 'item', pointer: 'none' });
      o.series = cs.series.map((s, i) => {
        const color = cols[i % cols.length];
        return {
          name: s.name,
          type: 'bar',
          coordinateSystem: 'polar',
          data: s.data,
          stack: cfg.stack ? 'p' : undefined,
          itemStyle: {
            color: (cfg.fillMode === 'gradient' && ctx.graphic)
              ? new ctx.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: P.tint(color, .24) }, { offset: 1, color: P.shade(color, .16) }])
              : color,
            borderRadius: [3, 3, 0, 0]
          },
          emphasis: { focus: 'series' },
          label: C.insideLabel(cfg, ctx, color)
        };
      });
      return o;
    }
  });

  register({
    id: 'pictorial-bar',
    name: '象形柱图',
    group: '柱状 / 条形',
    icon: 'i-pictorial',
    shape: '分类 + 多系列',
    hint: '以矢量图形单元填充柱体，适合排行与占比强调。',
    preset: { labelPos: 'top' },
    extra: [
      { key: 'pictorialSize', label: '单元宽度', type: 'range', min: 6, max: 40, step: 1, unit: 'px', def: 15 },
      { key: 'pictorialHeight', label: '单元高度', type: 'range', min: 10, max: 80, step: 1, unit: 'px', def: 26 }
    ],
    build: function (ds, cfg, ctx) {
      const cs = C.catSeries(ds);
      if (!cs.series.length) return null;
      const cols = ctx.colors;
      const symbol = 'path://M0,10 L0,3 A3,3 0 0,1 6,3 L6,10 Z';

      const o = C.base(cfg, ctx);
      o.grid = C.gridFor(cfg, ctx);
      o.xAxis = C.catAxis(cfg, ctx, cs.cats);
      o.yAxis = C.valAxis(cfg, ctx);
      o.toolbox = C.toolboxOf(cfg, ctx);
      o.series = cs.series.map((s, i) => {
        const color = cols[i % cols.length];
        const maxV = Math.max.apply(null, s.data.map((v) => v || 0)) * 1.06 || 1;
        return {
          name: s.name,
          type: 'pictorialBar',
          symbol: symbol,
          symbolRepeat: 'fixed',
          symbolMargin: '14%',
          symbolClip: true,
          symbolSize: [cfg.pictorialSize || 15, cfg.pictorialHeight || 26],
          symbolBoundingData: maxV,
          symbolPosition: 'start',
          data: s.data,
          itemStyle: {
            color: (cfg.fillMode === 'gradient' && ctx.graphic)
              ? new ctx.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: P.tint(color, .22) }, { offset: 1, color: P.shade(color, .16) }])
              : color,
            opacity: .92
          },
          label: C.insideLabel(cfg, ctx, color),
          emphasis: { focus: 'series' },
          z: 3 + i
        };
      });
      o.series.push({
        type: 'pictorialBar',
        symbol: 'rect',
        symbolSize: [cfg.pictorialSize || 15, 3],
        symbolPosition: 'end',
        itemStyle: { color: P.rgba(cols[0], .38) },
        silent: true,
        tooltip: { show: false },
        data: cs.series[0].data.map(() => 0),
        z: 1
      });
      return o;
    }
  });

  /* ============================================================
     折线 / 面积
     ============================================================ */
  function buildLine(ds, cfg, ctx, mode) {
    const cs = C.catSeries(ds);
    if (!cs.series.length) return null;
    const cols = ctx.colors, T = ctx.T;

    const smooth = cfg.smooth === true || mode === 'smooth';
    const step = cfg.step === true || mode === 'step';
    const area = cfg.area === true || mode === 'area' || mode === 'stack-area';
    const stacked = cfg.stack === true || mode === 'stack-area';

    const series = cs.series.map((s, i) => {
      const color = cols[i % cols.length];
      const op = (cfg.areaOpacity === undefined ? 30 : Number(cfg.areaOpacity)) / 100;
      const st = {
        name: s.name,
        type: 'line',
        data: s.data,
        smooth: smooth ? 0.42 : false,
        step: step ? 'middle' : false,
        stack: stacked ? 'total' : undefined,
        symbol: cfg.showSymbol === false ? 'none' : (cfg.symbolType || 'circle'),
        symbolSize: cfg.symbolSize === undefined ? 6 : Number(cfg.symbolSize),
        showSymbol: true,
        connectNulls: cfg.connectNulls !== false,
        sampling: cs.cats.length > 120 ? 'lttb' : undefined,
        lineStyle: {
          width: cfg.lineWidth === undefined ? 2.4 : Number(cfg.lineWidth),
          type: cfg.lineType || 'solid',
          cap: 'round',
          join: 'round',
          shadowBlur: cfg.lineShadow ? 14 : 0,
          shadowColor: P.rgba(color, .42),
          shadowOffsetY: cfg.lineShadow ? 5 : 0
        },
        itemStyle: { color: color, borderColor: T.dark ? '#0b1120' : '#ffffff', borderWidth: 1.4 },
        emphasis: { focus: 'series', scale: 1.6 },
        label: C.labelCfg(cfg, ctx),
        labelLayout: { hideOverlap: true },
        labelLine: { show: !!cfg.labelShow, length: 8, lineStyle: { color: T.axis } }
      };
      if (area) {
        st.areaStyle = {
          origin: cfg.areaOrigin === 'start' ? 'start' : 'auto',
          opacity: stacked ? Math.max(op, 0.6) : op,
          color: (cfg.fillMode === 'gradient' && ctx.graphic)
            ? P.areaGradient(ctx.graphic, color, op, 0.01)
            : P.rgba(color, op)
        };
      }
      return st;
    });

    const o = C.base(cfg, ctx);
    o.grid = C.gridFor(cfg, ctx, { extraTop: cfg.showSymbol === false ? 0 : 4 });
    o.xAxis = C.catAxis(cfg, ctx, cs.cats, { boundaryGap: cfg.boundaryGap === true });
    o.yAxis = C.valAxis(cfg, ctx);
    o.dataZoom = C.dataZoomOf(cfg, ctx, 0);
    o.toolbox = C.toolboxOf(cfg, ctx);
    o.series = series;
    return o;
  }

  register({
    id: 'line',
    name: '折线图',
    group: '折线 / 面积',
    icon: 'i-line',
    shape: '分类 + 多系列',
    hint: '展示指标随时间或有序维度的变化趋势。',
    preset: { smooth: false, area: false, stack: false, showSymbol: true },
    // 线宽 / 拐点大小已在「图形样式」通用分组中提供，此处不再重复声明
    build: function (ds, cfg, ctx) { return buildLine(ds, cfg, ctx, cfg.smooth ? 'smooth' : 'plain'); }
  });

  register({
    id: 'line-smooth',
    name: '平滑曲线',
    group: '折线 / 面积',
    icon: 'i-line-smooth',
    shape: '分类 + 多系列',
    hint: '贝塞尔平滑处理，视觉更柔和。',
    preset: { smooth: true, area: false, stack: false },
    build: function (ds, cfg, ctx) { return buildLine(ds, cfg, ctx, 'smooth'); }
  });

  register({
    id: 'line-area',
    name: '面积图',
    group: '折线 / 面积',
    icon: 'i-line-area',
    shape: '分类 + 多系列',
    hint: '折线下方填充半透明色，强调体量。',
    preset: { area: true, smooth: false, stack: false },
    extra: [{ key: 'areaOpacity', label: '填充不透明度', type: 'range', min: 5, max: 100, step: 1, unit: '%', def: 30 }],
    build: function (ds, cfg, ctx) { return buildLine(ds, cfg, ctx, 'area'); }
  });

  register({
    id: 'line-stack',
    name: '堆叠面积',
    group: '折线 / 面积',
    icon: 'i-line-stack',
    shape: '分类 + 多系列',
    hint: '多系列累加填充，适合总量与结构占比。',
    preset: { area: true, stack: true, smooth: true },
    extra: [{ key: 'areaOpacity', label: '填充不透明度', type: 'range', min: 20, max: 100, step: 1, unit: '%', def: 62 }],
    build: function (ds, cfg, ctx) { return buildLine(ds, cfg, ctx, 'stack-area'); }
  });

  register({
    id: 'line-step',
    name: '阶梯折线',
    group: '折线 / 面积',
    icon: 'i-line-step',
    shape: '分类 + 多系列',
    hint: '以阶梯方式连接数据点，适合状态切换与阶梯计价。',
    preset: { step: true, smooth: false },
    build: function (ds, cfg, ctx) { return buildLine(ds, cfg, ctx, 'step'); }
  });

  register({
    id: 'line-polar',
    name: '极坐标折线',
    group: '折线 / 面积',
    icon: 'i-line-polar',
    shape: '分类 + 多系列',
    hint: '环形坐标上的趋势线，适合周期性数据。',
    preset: {},
    extra: [
      { key: 'polarRadius', label: '半径', type: 'range', min: 40, max: 88, step: 1, unit: '%', def: 68 },
      { key: 'areaOpacity', label: '填充不透明度', type: 'range', min: 5, max: 100, step: 1, unit: '%', def: 18 }
    ],
    build: function (ds, cfg, ctx) {
      const cs = C.catSeries(ds);
      if (!cs.series.length) return null;
      const cols = ctx.colors, T = ctx.T;

      const o = C.base(cfg, ctx);
      o.toolbox = C.toolboxOf(cfg, ctx);
      o.polar = { center: ['50%', cfg.showTitle === false ? '52%' : '56%'], radius: (cfg.polarRadius || 68) + '%' };
      o.angleAxis = {
        type: 'category', data: cs.cats, boundaryGap: false,
        axisLine: { lineStyle: { color: T.axisLine } },
        axisLabel: { color: T.axis, fontSize: C.axisFont(cfg), fontFamily: C.FONT },
        splitLine: { show: cfg.splitLineX !== false, lineStyle: { color: T.split, type: 'dashed' } }
      };
      o.radiusAxis = {
        type: 'value',
        axisLine: { show: false },
        axisLabel: { color: T.axis, fontSize: C.axisFont(cfg), fontFamily: C.FONT },
        splitLine: { show: cfg.splitLineY !== false, lineStyle: { color: T.split, type: 'dashed' } }
      };
      o.tooltip = C.buildTooltip(cfg, ctx, { trigger: 'item', pointer: 'none' });
      o.series = cs.series.map((s, i) => {
        const color = cols[i % cols.length];
        return {
          name: s.name,
          type: 'line',
          coordinateSystem: 'polar',
          data: s.data,
          smooth: cfg.smooth !== false,
          symbol: 'circle',
          symbolSize: cfg.symbolSize === undefined ? 5 : Number(cfg.symbolSize),
          lineStyle: { width: cfg.lineWidth === undefined ? 2.4 : Number(cfg.lineWidth) },
          itemStyle: { color: color },
          areaStyle: cfg.area === false ? undefined : {
            opacity: (cfg.areaOpacity === undefined ? 18 : Number(cfg.areaOpacity)) / 100,
            color: P.rgba(color, .32)
          },
          emphasis: { focus: 'series' },
          label: C.insideLabel(cfg, ctx, color)
        };
      });
      return o;
    }
  });

  register({
    id: 'combo',
    name: '柱线组合双轴',
    group: '折线 / 面积',
    icon: 'i-combo',
    shape: '分类 + 多系列',
    hint: '首个系列用柱状走左轴，其余系列用折线走右轴，适合量级差异大的指标。',
    preset: { smooth: true, area: false, stack: false },
    extra: [
      { key: 'comboBarIndex', label: '柱状系列序号', type: 'range', min: 0, max: 4, step: 1, def: 0 },
      { key: 'axisY2Name', label: '右轴名称', type: 'text', def: '增长率 (%)' }
    ],
    build: function (ds, cfg, ctx) {
      const cs = C.catSeries(ds);
      if (!cs.series.length) return null;
      const cols = ctx.colors;
      const barIdx = cfg.comboBarIndex === undefined ? 0 : Number(cfg.comboBarIndex);

      const o = C.base(cfg, ctx);
      o.grid = C.gridFor(cfg, ctx, { extraRight: 36 });
      o.xAxis = C.catAxis(cfg, ctx, cs.cats);
      const y0 = C.valAxis(cfg, ctx, { name: cfg.axisYName || '' });
      const y1 = C.valAxis(cfg, ctx, { name: cfg.axisY2Name || '', position: 'right' });
      y1.splitLine = { show: false };
      o.yAxis = [y0, y1];
      o.toolbox = C.toolboxOf(cfg, ctx);
      o.series = cs.series.map((s, i) => {
        const color = cols[i % cols.length];
        if (i === barIdx) {
          return {
            name: s.name,
            type: 'bar',
            data: s.data,
            yAxisIndex: 0,
            barMaxWidth: 36,
            itemStyle: C.barItemStyle(cfg, ctx, color, false),
            emphasis: { focus: 'series' },
            label: C.insideLabel(cfg, ctx, color)
          };
        }
        return {
          name: s.name,
          type: 'line',
          yAxisIndex: 1,
          data: s.data,
          smooth: cfg.smooth !== false,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: cfg.lineWidth === undefined ? 2.4 : Number(cfg.lineWidth) },
          itemStyle: { color: color, borderColor: ctx.T.dark ? '#0b1120' : '#ffffff', borderWidth: 1.4 },
          emphasis: { focus: 'series' },
          label: C.labelCfg(cfg, ctx)
        };
      });
      return o;
    }
  });

})(window);
