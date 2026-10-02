/* ============================================================
   charts-c.js — 层级 / 关系 · 仪表 / 流程 · 多维 / 特殊
   ============================================================ */
(function (global) {
  'use strict';

  const C = global.ChartCore;
  const P = global.Palettes;
  const register = C.register;

  /* ============================================================
     层级 / 关系
     ============================================================ */
  register({
    id: 'treemap',
    name: '矩形树图',
    group: '层级 / 关系',
    icon: 'i-treemap',
    shape: '分类 + 多系列',
    hint: '以矩形面积表示数值大小，支持下钻。',
    preset: { labelShow: true, legendShow: false },
    extra: [
      { key: 'roam', label: '允许缩放平移', type: 'switch', def: true },
      { key: 'breadcrumb', label: '显示面包屑', type: 'switch', def: true },
      { key: 'upperLabel', label: '显示父级标签', type: 'switch', def: true }
    ],
    build: function (ds, cfg, ctx) {
      const cs = C.catSeries(ds);
      if (!cs.series.length) return null;
      const T = ctx.T;
      const children = [];

      if (cs.series.length === 1) {
        cs.cats.forEach((name, i) => {
          const v = cs.series[0].data[i];
          if (v !== null && v > 0) children.push({ name: name, value: v });
        });
      } else {
        cs.cats.forEach((name, i) => {
          const kids = cs.series.map((s) => ({ name: s.name, value: s.data[i] || 0 })).filter((k) => k.value > 0);
          if (kids.length) children.push({ name: name, children: kids });
        });
      }
      if (!children.length) return null;

      const o = C.base(cfg, ctx);
      delete o.legend;
      o.tooltip = C.buildTooltip(cfg, ctx, { trigger: 'item', pointer: 'none' });
      o.toolbox = C.toolboxOf(cfg, ctx);
      o.series = [{
        name: cfg.seriesName || '构成',
        type: 'treemap',
        data: children,
        left: '2%',
        right: '2%',
        top: cfg.showTitle === false ? 24 : 62,
        bottom: 14,
        roam: cfg.roam !== false,
        nodeClick: 'zoomToNode',
        breadcrumb: {
          show: cfg.breadcrumb !== false,
          height: 20,
          itemStyle: { color: T.dark ? 'rgba(255,255,255,.06)' : 'rgba(15,32,64,.06)', borderColor: 'transparent' },
          textStyle: { color: T.axis, fontSize: 11 }
        },
        label: {
          show: cfg.labelShow !== false,
          formatter: '{b}',
          fontSize: cfg.labelSize || 12,
          color: '#ffffff',
          overflow: 'truncate',
          ellipsis: '..'
        },
        upperLabel: { show: cfg.upperLabel !== false, height: 20, color: '#ffffff', fontSize: 11 },
        itemStyle: { borderColor: T.dark ? '#0a1120' : '#ffffff', borderWidth: 2, gapWidth: 2, borderRadius: 4 },
        levels: [
          { itemStyle: { borderWidth: 0, gapWidth: 5, borderRadius: 6 }, upperLabel: { show: false } },
          { itemStyle: { borderWidth: 1, gapWidth: 2 }, colorSaturation: [0.35, 0.72], emphasis: { itemStyle: { colorSaturation: [0.42, 0.88] } } },
          { colorSaturation: [0.32, 0.62], itemStyle: { borderWidth: 1, gapWidth: 1 } }
        ],
        emphasis: { focus: 'descendant' }
      }];
      const total = cs.series.reduce((a, s) => a + s.data.reduce((x, y) => x + (y || 0), 0), 0);
      o.__meta = { title: '矩形树图 · 合计 ' + C.fmt(total, cfg.thousandSep !== false) + ' · 顶层 ' + children.length + ' 项' };
      return o;
    }
  });

  register({
    id: 'sunburst',
    name: '旭日图',
    group: '层级 / 关系',
    icon: 'i-sunburst',
    shape: '分类 + 多系列',
    hint: '同心圆环呈现层级占比，从内到外逐层展开。',
    preset: { labelShow: true, legendShow: false },
    extra: [{ key: 'sunburstRadius', label: '内半径', type: 'range', min: 6, max: 48, step: 1, unit: '%', def: 16 }],
    build: function (ds, cfg, ctx) {
      const cs = C.catSeries(ds);
      if (!cs.series.length) return null;
      const cols = ctx.colors;

      let tree;
      if (cs.series.length === 1) {
        tree = cs.cats.map((n, i) => ({ name: n, value: cs.series[0].data[i] || 0 })).filter((x) => x.value > 0);
      } else {
        tree = cs.series.map((s, si) => ({
          name: s.name,
          itemStyle: { color: cols[si % cols.length] },
          children: cs.cats.map((n, i) => ({ name: n, value: s.data[i] || 0 })).filter((k) => k.value > 0)
        })).filter((node) => node.children.length);
      }
      if (!tree.length) return null;

      const inner = cfg.sunburstRadius === undefined ? 16 : Number(cfg.sunburstRadius);
      const o = C.base(cfg, ctx);
      delete o.legend;
      o.tooltip = C.buildTooltip(cfg, ctx, { trigger: 'item', pointer: 'none' });
      o.toolbox = C.toolboxOf(cfg, ctx);
      o.series = [{
        name: cfg.seriesName || '构成',
        type: 'sunburst',
        data: tree,
        radius: [inner + '%', Math.min(92, inner + 62) + '%'],
        center: ['50%', cfg.showTitle === false ? '52%' : '56%'],
        sort: null,
        nodeClick: 'rootToNode',
        emphasis: { focus: 'ancestor' },
        itemStyle: {
          borderColor: ctx.T.dark ? 'rgba(10,17,32,.85)' : 'rgba(255,255,255,.92)',
          borderWidth: 1.6,
          borderRadius: 3
        },
        label: {
          show: cfg.labelShow !== false,
          rotate: 'radial',
          fontSize: cfg.labelSize || 10,
          color: '#ffffff',
          minAngle: 8,
          formatter: '{b}'
        }
      }];
      return o;
    }
  });

  function sankeyLinks(ds) {
    const triples = C.tripleData(ds);
    if (triples.length) return triples;
    const columns = ds.columns || [], rows = ds.rows || [];
    if (columns.length < 2) return [];
    return rows.map((r) => [String(r[0]), String(r[1]), Number(r[2] !== undefined ? r[2] : 1) || 1])
      .filter((t) => t[0] !== '' && t[1] !== '');
  }

  register({
    id: 'sankey',
    name: '桑基图',
    group: '层级 / 关系',
    icon: 'i-sankey',
    shape: '源 + 目标 + 权重',
    hint: '以带宽表示流量大小，展示多级流转关系。',
    preset: { labelShow: true, legendShow: false },
    extra: [
      { key: 'nodeWidth', label: '节点宽度', type: 'range', min: 6, max: 40, step: 1, unit: 'px', def: 16 },
      { key: 'nodeGap', label: '节点间距', type: 'range', min: 4, max: 40, step: 1, unit: 'px', def: 14 },
      { key: 'sankeyOpacity', label: '连边不透明度', type: 'range', min: 5, max: 100, step: 1, unit: '%', def: 34 },
      { key: 'sankeyCurveness', label: '连边弯曲度', type: 'range', min: 0, max: 100, step: 2, unit: '%', def: 50 },
      { key: 'nodeAlign', label: '节点对齐', type: 'select', def: 'justify', options: [['justify', '两端对齐'], ['left', '左对齐'], ['right', '右对齐']] },
      { key: 'sankeyOrient', label: '方向', type: 'select', def: 'horizontal', options: [['horizontal', '水平'], ['vertical', '垂直']] }
    ],
    build: function (ds, cfg, ctx) {
      const triples = sankeyLinks(ds);
      if (!triples.length) return null;

      const nodeSet = [];
      triples.forEach((t) => {
        if (nodeSet.indexOf(t[0]) === -1) nodeSet.push(t[0]);
        if (nodeSet.indexOf(t[1]) === -1) nodeSet.push(t[1]);
      });

      const vertical = cfg.sankeyOrient === 'vertical';
      const o = C.base(cfg, ctx);
      delete o.legend;
      o.tooltip = C.buildTooltip(cfg, ctx, { trigger: 'item', pointer: 'none' });
      o.toolbox = C.toolboxOf(cfg, ctx);
      o.series = [{
        name: cfg.seriesName || '流向',
        type: 'sankey',
        left: '4%',
        right: '5%',
        top: cfg.showTitle === false ? 28 : 68,
        bottom: 22,
        nodeWidth: cfg.nodeWidth || 16,
        nodeGap: cfg.nodeGap || 14,
        nodeAlign: cfg.nodeAlign || 'justify',
        draggable: cfg.draggable !== false,
        orient: vertical ? 'vertical' : 'horizontal',
        emphasis: { focus: 'adjacency' },
        label: {
          show: cfg.labelShow !== false,
          position: vertical ? 'top' : (cfg.sankeyLabelPos || 'right'),
          color: ctx.T.text,
          fontSize: cfg.labelSize || 11,
          fontFamily: C.FONT
        },
        lineStyle: {
          color: 'gradient',
          opacity: (cfg.sankeyOpacity === undefined ? 34 : Number(cfg.sankeyOpacity)) / 100,
          curveness: (cfg.sankeyCurveness === undefined ? 50 : Number(cfg.sankeyCurveness)) / 100
        },
        itemStyle: { borderWidth: 0, borderRadius: 3 },
        data: nodeSet.map((n, i) => ({ name: n, itemStyle: { color: ctx.colors[i % ctx.colors.length] } })),
        links: triples.map((t) => ({ source: t[0], target: t[1], value: t[2] }))
      }];
      const totalFlow = triples.reduce((a, t) => a + t[2], 0);
      o.__meta = { title: '桑基图 · ' + nodeSet.length + ' 个节点 · ' + triples.length + ' 条连边 · 总流量 ' + C.fmt(totalFlow, cfg.thousandSep !== false) };
      return o;
    }
  });

  register({
    id: 'graph',
    name: '关系图',
    group: '层级 / 关系',
    icon: 'i-graph',
    shape: '源 + 目标 + 权重',
    hint: '力导向布局，节点大小随连接强度变化。',
    preset: { labelShow: true, legendShow: false },
    extra: [
      { key: 'graphLayout', label: '布局算法', type: 'select', def: 'force', options: [['force', '力导向'], ['circular', '环形'], ['none', '固定坐标']] },
      { key: 'repulsion', label: '斥力强度', type: 'range', min: 60, max: 900, step: 20, def: 240 },
      { key: 'edgeLength', label: '连边长距基数', type: 'range', min: 30, max: 260, step: 10, def: 90 },
      { key: 'graphLineOpacity', label: '连边不透明度', type: 'range', min: 5, max: 100, step: 1, unit: '%', def: 32 },
      { key: 'graphCurveness', label: '连边弯曲度', type: 'range', min: 0, max: 100, step: 2, unit: '%', def: 16 },
      { key: 'edgeLabel', label: '显示连边权重', type: 'switch', def: false }
    ],
    build: function (ds, cfg, ctx) {
      const triples = sankeyLinks(ds);
      if (!triples.length) return null;

      const cats = [], nodes = [], degrees = {};
      triples.forEach((t) => {
        if (cats.indexOf(t[0]) === -1) { cats.push(t[0]); nodes.push(t[0]); degrees[t[0]] = 0; }
        if (cats.indexOf(t[1]) === -1) { cats.push(t[1]); nodes.push(t[1]); degrees[t[1]] = 0; }
        degrees[t[0]] += t[2];
        degrees[t[1]] += t[2];
      });
      const maxDeg = Math.max.apply(null, nodes.map((n) => degrees[n]).concat([1]));

      const o = C.base(cfg, ctx);
      // 注意：ECharts 的 graph 系列在 option 含 legend 组件时不会渲染，
      // 因此这里必须整体移除 legend，而不是设置 show:false。
      delete o.legend;
      o.tooltip = C.buildTooltip(cfg, ctx, { trigger: 'item', pointer: 'none' });
      o.toolbox = C.toolboxOf(cfg, ctx);
      o.series = [{
        name: cfg.seriesName || '关系网络',
        type: 'graph',
        layout: cfg.graphLayout || 'force',
        circular: cfg.graphLayout === 'circular' ? { rotateLabel: false } : undefined,
        roam: cfg.roam !== false,
        draggable: true,
        top: cfg.showTitle === false ? 26 : 62,
        bottom: 24,
        left: '3%',
        right: '3%',
        force: {
          repulsion: cfg.repulsion ? Number(cfg.repulsion) : 240,
          edgeLength: cfg.edgeLength ? Number(cfg.edgeLength) : 90,
          gravity: 0.09,
          friction: 0.14,
          layoutAnimation: false
        },
        categories: cats.map((c, i) => ({ name: c, itemStyle: { color: ctx.colors[i % ctx.colors.length] } })),
        itemStyle: { borderColor: ctx.T.dark ? 'rgba(10,17,32,.8)' : '#ffffff', borderWidth: 1.5 },
        lineStyle: {
          color: 'source',
          opacity: (cfg.graphLineOpacity === undefined ? 32 : Number(cfg.graphLineOpacity)) / 100,
          width: cfg.graphLineWidth === undefined ? 1.6 : Number(cfg.graphLineWidth),
          curveness: (cfg.graphCurveness === undefined ? 16 : Number(cfg.graphCurveness)) / 100
        },
        label: {
          show: cfg.labelShow !== false,
          position: 'right',
          color: ctx.T.text,
          fontSize: cfg.labelSize || 11,
          fontFamily: C.FONT
        },
        edgeLabel: { show: !!cfg.edgeLabel, fontSize: 10, color: ctx.T.axis, formatter: (p) => C.fmt(p.value) },
        emphasis: { focus: 'adjacency', lineStyle: { width: 3.4, opacity: .85 } },
        data: nodes.map((n, i) => ({
          name: n,
          category: n,
          value: degrees[n],
          symbolSize: 18 + 32 * Math.pow(degrees[n] / maxDeg, 0.62),
          itemStyle: { color: ctx.colors[i % ctx.colors.length] }
        })),
        links: triples.map((t) => ({ source: t[0], target: t[1], value: t[2] }))
      }];
      o.__meta = { title: '关系图 · ' + nodes.length + ' 个节点 · ' + triples.length + ' 条连边' };
      return o;
    }
  });

  register({
    id: 'theme-river',
    name: '主题河流',
    group: '层级 / 关系',
    icon: 'i-theme-river',
    shape: '分类 + 多系列',
    hint: '以流带宽度随时间变化呈现多主题演化。',
    preset: { legendShow: true, legendPos: 'bottom', labelShow: false },
    extra: [
      { key: 'riverOpacity', label: '流带不透明度', type: 'range', min: 30, max: 100, step: 2, unit: '%', def: 82 },
      { key: 'splitLineX', label: '显示纵向网格', type: 'switch', def: false }
    ],
    build: function (ds, cfg, ctx) {
      const cs = C.catSeries(ds);
      if (!cs.series.length) return null;

      const data = [];
      cs.cats.forEach((cat, i) => {
        cs.series.forEach((s) => {
          const v = s.data[i];
          if (v !== null && v !== undefined) data.push([cat, v, s.name]);
        });
      });
      if (!data.length) return null;

      const o = C.base(cfg, ctx);
      o.tooltip = C.buildTooltip(cfg, ctx, { trigger: 'axis', pointer: 'line' });
      o.toolbox = C.toolboxOf(cfg, ctx);
      o.singleAxis = {
        top: cfg.showTitle === false ? 34 : 76,
        bottom: 44,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: ctx.T.axisLine } },
        axisLabel: { color: ctx.T.axis, fontSize: C.axisFont(cfg), fontFamily: C.FONT, hideOverlap: true },
        splitLine: { show: !!cfg.splitLineX, lineStyle: { color: ctx.T.split, type: 'dashed' } }
      };
      o.series = [{
        type: 'themeRiver',
        data: data,
        emphasis: { focus: 'series', itemStyle: { shadowBlur: 18, shadowColor: 'rgba(0,0,0,.35)' } },
        label: { show: !!cfg.labelShow, fontSize: cfg.labelSize || 10, color: ctx.T.text, fontFamily: C.FONT },
        itemStyle: { opacity: (cfg.riverOpacity === undefined ? 82 : Number(cfg.riverOpacity)) / 100, borderRadius: 2 },
        color: ctx.colors
      }];
      return o;
    }
  });

  register({
    id: 'tree',
    name: '树图',
    group: '层级 / 关系',
    icon: 'i-tree',
    shape: '源 + 目标 + 权重',
    hint: '按父子关系自动构建层级，支持展开与折叠。',
    preset: { labelShow: true, legendShow: false, splitLineY: false },
    extra: [
      { key: 'treeOrient', label: '方向', type: 'select', def: 'LR', options: [['LR', '从左到右'], ['RL', '从右到左'], ['TB', '从上到下'], ['BT', '从下到上']] },
      { key: 'treeDepth', label: '默认展开层级', type: 'range', min: 1, max: 6, step: 1, def: 2 },
      { key: 'roam', label: '允许缩放平移', type: 'switch', def: true }
    ],
    build: function (ds, cfg, ctx) {
      const triples = C.tripleData(ds);
      let root = null;

      if (triples.length) {
        const children = {}, all = [];
        triples.forEach((t) => {
          if (all.indexOf(t[0]) === -1) all.push(t[0]);
          if (all.indexOf(t[1]) === -1) all.push(t[1]);
          if (!children[t[0]]) children[t[0]] = [];
          children[t[0]].push({ name: t[1], value: t[2] });
        });
        const targets = triples.map((t) => t[1]);
        const roots = all.filter((n) => targets.indexOf(n) === -1);
        const build = (name, depth, seen) => {
          if (depth > 6 || seen[name]) return { name: name };
          seen[name] = true;
          const kids = children[name];
          if (!kids || !kids.length) return { name: name };
          return { name: name, children: kids.map((k) => build(k.name, depth + 1, seen)) };
        };
        root = roots.length === 1
          ? build(roots[0], 0, {})
          : { name: cfg.rootName || '全部节点', children: roots.map((r) => build(r, 1, {})) };
      } else {
        const cs = C.catSeries(ds);
        if (!cs.series.length) return null;
        if (cs.series.length === 1) {
          root = { name: cfg.rootName || '数据', children: cs.cats.map((n, i) => ({ name: n, value: cs.series[0].data[i] || 0 })) };
        } else {
          root = {
            name: cfg.rootName || '数据',
            children: cs.cats.map((n, i) => {
              const kids = cs.series.map((s) => ({ name: s.name, value: s.data[i] || 0 })).filter((k) => k.value > 0);
              return kids.length > 1 ? { name: n, children: kids } : { name: n, value: (kids[0] || {}).value || 0 };
            })
          };
        }
      }
      if (!root) return null;

      const orient = cfg.treeOrient || 'LR';
      const o = C.base(cfg, ctx);
      delete o.legend;
      o.tooltip = C.buildTooltip(cfg, ctx, { trigger: 'item', pointer: 'none' });
      o.toolbox = C.toolboxOf(cfg, ctx);
      o.series = [{
        type: 'tree',
        data: [root],
        left: '5%',
        right: '22%',
        top: cfg.showTitle === false ? 30 : 66,
        bottom: 24,
        orient: orient,
        symbol: 'emptyCircle',
        symbolSize: 8,
        expandAndCollapse: true,
        initialTreeDepth: cfg.treeDepth === undefined ? 2 : Number(cfg.treeDepth),
        roam: cfg.roam !== false,
        lineStyle: { color: ctx.T.axisLine, width: 1.3, curveness: 0.5 },
        itemStyle: { color: ctx.colors[0], borderColor: ctx.colors[0] },
        label: {
          show: true,
          position: orient === 'TB' ? 'top' : 'left',
          verticalAlign: 'middle',
          align: orient === 'TB' ? 'center' : 'right',
          color: ctx.T.text,
          fontSize: cfg.labelSize || 11,
          fontFamily: C.FONT
        },
        leaves: {
          label: {
            position: orient === 'TB' ? 'bottom' : 'right',
            align: orient === 'TB' ? 'center' : 'left'
          }
        },
        emphasis: { focus: 'descendant' }
      }];
      return o;
    }
  });

  /* ============================================================
     仪表 / 流程 / 标签云
     ============================================================ */
  register({
    id: 'gauge',
    name: '仪表盘',
    group: '仪表 / 流程',
    icon: 'i-gauge',
    shape: '名称 + 单值',
    hint: '最多同时展示 3 个指标，自动计算量程。',
    preset: { labelShow: true },
    extra: [
      { key: 'gaugeSplit', label: '刻度段数', type: 'range', min: 2, max: 10, step: 1, def: 5 },
      { key: 'gaugeCount', label: '同时显示数量', type: 'range', min: 1, max: 3, step: 1, def: 1 },
      { key: 'gaugePointer', label: '显示指针', type: 'switch', def: true },
      { key: 'gaugeUnit', label: '数值单位', type: 'text', def: '' }
    ],
    build: function (ds, cfg, ctx) {
      const pairs = C.pairData(ds);
      if (!pairs.length) return null;
      const T = ctx.T;
      const count = Math.max(1, Math.min(3, cfg.gaugeCount ? Number(cfg.gaugeCount) : 1));
      const shown = pairs.slice(0, count);
      const cols = ctx.colors;
      const dataMax = Math.max.apply(null, pairs.map((p) => p[1]).concat([1]));
      const max = cfg.gaugeMax && cfg.gaugeMax !== 'auto' ? Number(cfg.gaugeMax) : Math.ceil(dataMax * 1.1);
      const startAngle = cfg.gaugeStart === undefined ? 210 : Number(cfg.gaugeStart);
      const endAngle = cfg.gaugeEnd === undefined ? -30 : Number(cfg.gaugeEnd);

      const o = C.base(cfg, ctx);
      delete o.legend;
      o.tooltip = C.buildTooltip(cfg, ctx, { trigger: 'item', pointer: 'none' });
      o.toolbox = C.toolboxOf(cfg, ctx);
      const single = shown.length === 1;

      o.series = shown.map((p, i) => {
        const color = cols[i % cols.length];
        const n = shown.length;
        const width = n === 1 ? 18 : 10;
        const radius = n === 1 ? '74%' : (76 - i * 19) + '%';
        return {
          name: p[0],
          type: 'gauge',
          center: single ? ['50%', cfg.showTitle === false ? '56%' : '60%'] : ['50%', '58%'],
          radius: radius,
          startAngle: startAngle,
          endAngle: endAngle,
          min: 0,
          max: max,
          splitNumber: cfg.gaugeSplit === undefined ? 5 : Number(cfg.gaugeSplit),
          splitLine: { show: single, distance: -26, length: 11, lineStyle: { color: P.rgba(color, .62), width: 2 } },
          axisTick: { show: single, distance: -22, length: 5, lineStyle: { color: P.rgba(color, .38), width: 1.4 } },
          axisLabel: { show: single, distance: -12, color: T.axis, fontSize: 10, fontFamily: C.FONT },
          progress: {
            show: cfg.gaugeProgress !== false,
            width: width,
            roundCap: true,
            itemStyle: { color: color, shadowBlur: 12, shadowColor: P.rgba(color, .4) }
          },
          axisLine: { roundCap: true, lineStyle: { width: width, color: [[1, P.rgba(color, .15)]] } },
          pointer: {
            show: single && cfg.gaugePointer !== false,
            length: '58%',
            width: 5,
            offsetCenter: [0, '4%'],
            itemStyle: { color: color }
          },
          anchor: single ? {
            show: true, size: 12, showAbove: true,
            itemStyle: { color: color, borderColor: ctx.T.dark ? '#0b1120' : '#ffffff', borderWidth: 2 }
          } : { show: false },
          title: {
            show: true,
            offsetCenter: single ? [0, '34%'] : [0, '84%'],
            color: T.axis,
            fontSize: single ? 13 : 11,
            fontFamily: C.FONT
          },
          detail: {
            show: cfg.labelShow !== false,
            valueAnimation: true,
            offsetCenter: single ? [0, '12%'] : [0, '64%'],
            color: T.strong,
            fontSize: single ? 27 : 15,
            fontWeight: 600,
            fontFamily: C.FONT,
            formatter: cfg.gaugeUnit ? ('{value} ' + cfg.gaugeUnit) : '{value}'
          },
          data: [{ value: Math.round(p[1] * 100) / 100, name: p[0] }],
          z: 10 - i
        };
      });
      const pct = max ? Math.round(shown[0][1] / max * 1000) / 10 : 0;
      o.__meta = { title: '仪表盘 · ' + shown[0][0] + ' = ' + C.fmt(shown[0][1]) + '（量程 ' + max + '，达成 ' + pct + '%）' };
      return o;
    }
  });

  register({
    id: 'funnel',
    name: '漏斗图',
    group: '仪表 / 流程',
    icon: 'i-funnel',
    shape: '名称 + 单值',
    hint: '按数值降序排列的梯形层级，展示逐环节流失。',
    preset: { labelShow: true, legendShow: true, legendPos: 'bottom' },
    extra: [
      { key: 'funnelSort', label: '排序方式', type: 'select', def: 'descending', options: [['descending', '由大到小'], ['ascending', '由小到大'], ['none', '保持原序']] },
      { key: 'funnelGap', label: '层间距', type: 'range', min: 0, max: 20, step: 1, unit: 'px', def: 2 },
      { key: 'funnelMinSize', label: '最小宽度', type: 'range', min: 0, max: 50, step: 1, unit: '%', def: 12 },
      { key: 'funnelOrient', label: '方向', type: 'select', def: 'vertical', options: [['vertical', '垂直'], ['horizontal', '水平']] }
    ],
    build: function (ds, cfg, ctx) {
      const pairs = C.pairData(ds);
      if (!pairs.length) return null;
      const T = ctx.T;

      const o = C.base(cfg, ctx);
      o.tooltip = C.buildTooltip(cfg, ctx, { trigger: 'item', pointer: 'none' });
      o.toolbox = C.toolboxOf(cfg, ctx);
      o.series = [{
        name: cfg.seriesName || '转化',
        type: 'funnel',
        left: '12%',
        right: '12%',
        top: cfg.showTitle === false ? 30 : 72,
        bottom: 30,
        minSize: (cfg.funnelMinSize === undefined ? 12 : Number(cfg.funnelMinSize)) + '%',
        maxSize: '100%',
        sort: cfg.funnelSort || 'descending',
        gap: cfg.funnelGap === undefined ? 2 : Number(cfg.funnelGap),
        funnelAlign: 'center',
        orient: cfg.funnelOrient || 'vertical',
        label: (function () {
          const l = C.labelCfg(cfg, ctx, 'pie');
          if (!l.show) return { show: false };
          l.position = cfg.funnelLabelPos || 'inside';
          l.color = cfg.labelColor || '#ffffff';
          l.formatter = cfg.pieLabelMode === 'value'
            ? function (p) { return C.fmt(p.value, cfg.thousandSep !== false); }
            : '{b}  {c}';
          return l;
        })(),
        labelLine: { show: cfg.funnelLabelPos === 'outside' && cfg.labelShow !== false, length: 14, lineStyle: { color: T.axis } },
        itemStyle: {
          borderColor: T.dark ? 'rgba(10,17,32,.7)' : '#ffffff',
          borderWidth: 1.5,
          borderRadius: 4,
          opacity: (cfg.funnelOpacity === undefined ? 92 : Number(cfg.funnelOpacity)) / 100
        },
        emphasis: { label: { fontSize: 14, fontWeight: 600 }, itemStyle: { shadowBlur: 16, shadowColor: 'rgba(0,0,0,.35)' } },
        data: pairs.map((p) => ({ name: p[0], value: p[1] }))
      }];
      const first = pairs[0][1], last = pairs[pairs.length - 1][1];
      o.__meta = { title: '漏斗图 · 总体转化率 ' + (first ? (Math.round(last / first * 1000) / 10) : 0) + '%' };
      return o;
    }
  });

  register({
    id: 'tag-cloud',
    name: '标签云',
    group: '仪表 / 流程',
    icon: 'i-wordcloud',
    shape: '名称 + 单值',
    hint: '按数值映射字号，自动排布为云图。',
    preset: { labelShow: false, legendShow: false },
    extra: [
      { key: 'cloudCount', label: '显示数量', type: 'range', min: 6, max: 80, step: 2, def: 40 },
      { key: 'cloudMinFont', label: '最小字号', type: 'range', min: 9, max: 26, step: 1, unit: 'px', def: 12 },
      { key: 'cloudMaxFont', label: '最大字号', type: 'range', min: 18, max: 76, step: 2, unit: 'px', def: 52 },
      { key: 'cloudColorMode', label: '着色方式', type: 'select', def: 'series', options: [['series', '按多色循环'], ['mono', '单色深浅']] }
    ],
    build: function (ds, cfg, ctx) {
      const pairs = C.pairData(ds);
      if (!pairs.length) return null;

      const W = Math.max(360, ctx.w || 860);
      const H = Math.max(260, ctx.h || 520);
      const padTop = cfg.showTitle === false ? 26 : 74;
      const availW = W - 56;
      const availH = H - padTop - 42;
      if (availW < 80 || availH < 80) return null;

      const items = pairs.filter((p) => p[1] > 0).slice(0, cfg.cloudCount ? Number(cfg.cloudCount) : 40);
      if (!items.length) return null;

      const maxV = Math.max.apply(null, items.map((p) => p[1]));
      const minV = Math.min.apply(null, items.map((p) => p[1]));
      const fMin = cfg.cloudMinFont ? Number(cfg.cloudMinFont) : 12;
      const fMax = Math.max(fMin + 6, cfg.cloudMaxFont ? Number(cfg.cloudMaxFont) : Math.round(Math.min(availW, availH) / 7));

      const sorted = items.slice().sort((a, b) => b[1] - a[1]);
      const placed = [];
      const CW = availW / 2, CH = availH / 2;

      sorted.forEach((it, idx) => {
        const t = maxV === minV ? 0.5 : (it[1] - minV) / (maxV - minV);
        const fs = fMin + (fMax - fMin) * Math.pow(t, 0.76);
        const w = Math.max(20, it[0].length * fs * 0.74);
        const h = fs * 1.24;

        let x = 0, y = 0, ok = false;
        for (let a = 0; a < 900; a++) {
          const ang = a * 0.34;
          const rad = Math.pow(a, 0.62) * 5.6;
          const px = Math.cos(ang) * rad * 1.42;
          const py = Math.sin(ang) * rad * 0.9;
          if (Math.abs(px) + w / 2 > CW - 6 || Math.abs(py) + h / 2 > CH - 6) continue;
          let hit = false;
          for (let k = 0; k < placed.length; k++) {
            const q = placed[k];
            if (Math.abs(px - q.x) < (w + q.w) / 2 + 4 && Math.abs(py - q.y) < (h + q.h) / 2 + 3) { hit = true; break; }
          }
          if (!hit) { x = px; y = py; ok = true; break; }
        }
        if (!ok) {
          const lane = Math.floor(idx / 2);
          x = (idx % 2 ? 1 : -1) * (CW * 0.78);
          y = CH * 0.86 - lane * (h + 5);
          if (Math.abs(y) > CH) y = CH * 0.86;
        }
        placed.push({
          x: x, y: y, w: w, h: h,
          item: { value: it[1], name: it[0], fontSize: fs, cx: W / 2 + x, cy: padTop + CH + y, t: t }
        });
      });

      const colorMode = cfg.cloudColorMode || 'series';
      const graphics = placed.map((p, i) => {
        const it = p.item;
        const color = colorMode === 'mono'
          ? P.rgba(ctx.colors[0], 0.45 + it.t * 0.55)
          : ctx.colors[i % ctx.colors.length];
        return {
          type: 'text',
          left: it.cx,
          top: it.cy,
          silent: true,
          style: {
            text: it.name,
            fontSize: it.fontSize,
            fontWeight: it.t > 0.66 ? 700 : (it.t > 0.33 ? 600 : 500),
            fontFamily: C.FONT,
            fill: color,
            textAlign: 'center',
            textVerticalAlign: 'middle'
          },
          z: 10 + Math.round(it.t * 10)
        };
      });

      const o = C.base(cfg, ctx);
      delete o.legend;
      o.tooltip = { show: false };
      o.grid = { show: false };
      o.xAxis = { show: false, type: 'value', min: 0, max: W };
      o.yAxis = { show: false, type: 'value', min: 0, max: H };
      o.graphic = graphics;
      o.series = [];
      o.__meta = { title: '标签云 · ' + items.length + ' 个关键词' };
      return o;
    }
  });

  /* ============================================================
     多维 / 特殊
     ============================================================ */
  register({
    id: 'radar',
    name: '雷达图',
    group: '多维 / 特殊',
    icon: 'i-radar',
    shape: '分类 + 多系列',
    hint: '首列为评价维度，其余每列为一个被比较对象。',
    preset: { labelShow: false, legendShow: true, legendPos: 'bottom' },
    extra: [
      { key: 'radarShape', label: '外框形状', type: 'select', def: 'polygon', options: [['polygon', '多边形'], ['circle', '圆形']] },
      { key: 'radarRadius', label: '半径', type: 'range', min: 40, max: 86, step: 1, unit: '%', def: 66 },
      { key: 'radarSplit', label: '分割层数', type: 'range', min: 2, max: 8, step: 1, def: 4 },
      { key: 'radarAreaOpacity', label: '填充不透明度', type: 'range', min: 0, max: 60, step: 2, unit: '%', def: 22 },
      { key: 'radarBg', label: '显示分割底色', type: 'switch', def: true }
    ],
    build: function (ds, cfg, ctx) {
      const cs = C.catSeries(ds);
      if (!cs.series.length) return null;
      const T = ctx.T, cols = ctx.colors;

      let maxVal = 0;
      cs.series.forEach((s) => s.data.forEach((v) => { if (v !== null && v > maxVal) maxVal = v; }));
      const rMax = cfg.radarMax && cfg.radarMax !== 'auto' ? Number(cfg.radarMax) : Math.ceil(maxVal * 1.08) || 100;

      const o = C.base(cfg, ctx);
      o.grid = { show: false };
      o.tooltip = C.buildTooltip(cfg, ctx, { trigger: 'item', pointer: 'none' });
      o.toolbox = C.toolboxOf(cfg, ctx);
      o.radar = {
        indicator: cs.cats.map((n) => ({ name: n, max: rMax })),
        center: ['50%', cfg.showTitle === false ? '54%' : '58%'],
        radius: (cfg.radarRadius || 66) + '%',
        shape: cfg.radarShape || 'polygon',
        splitNumber: cfg.radarSplit === undefined ? 4 : Number(cfg.radarSplit),
        axisName: { color: T.axis, fontSize: C.axisFont(cfg), fontFamily: C.FONT, padding: [2, 4] },
        splitLine: { lineStyle: { color: T.split } },
        splitArea: {
          show: cfg.radarBg !== false,
          areaStyle: { color: T.dark ? ['rgba(255,255,255,.012)', 'rgba(255,255,255,.034)'] : ['rgba(15,32,64,.012)', 'rgba(15,32,64,.036)'] }
        },
        axisLine: { lineStyle: { color: T.split } }
      };
      o.series = [{
        type: 'radar',
        symbolSize: cfg.symbolSize === undefined ? 5 : Number(cfg.symbolSize),
        symbol: 'circle',
        lineStyle: { width: cfg.lineWidth === undefined ? 2.2 : Number(cfg.lineWidth) },
        label: C.labelCfg(cfg, ctx),
        emphasis: { focus: 'series', areaStyle: { opacity: .48 } },
        data: cs.series.map((s, i) => {
          const color = cols[i % cols.length];
          return {
            name: s.name,
            value: s.data.map((v) => (v === null ? 0 : v)),
            lineStyle: { color: color, width: cfg.lineWidth === undefined ? 2.2 : Number(cfg.lineWidth) },
            itemStyle: { color: color },
            areaStyle: {
              opacity: (cfg.radarAreaOpacity === undefined ? 22 : Number(cfg.radarAreaOpacity)) / 100,
              color: color
            }
          };
        })
      }];
      return o;
    }
  });

  register({
    id: 'parallel',
    name: '平行坐标',
    group: '多维 / 特殊',
    icon: 'i-parallel',
    shape: '多数值维度',
    hint: '每个数值列成为一根坐标轴，每行为一条折线。',
    preset: { labelShow: false },
    extra: [
      { key: 'parallelOpacity', label: '线条不透明度', type: 'range', min: 5, max: 100, step: 1, unit: '%', def: 62 },
      { key: 'lineWidth', label: '线宽', type: 'range', min: 1, max: 8, step: 0.5, unit: 'px', def: 2 },
      { key: 'parallelColor', label: '按首维着色', type: 'switch', def: true }
    ],
    build: function (ds, cfg, ctx) {
      const columns = ds.columns || [], rows = ds.rows || [];
      if (!rows.length) return null;
      const numCols = [];
      for (let c = 0; c < columns.length; c++) if (global.Dataset.columnIsNumeric(rows, c)) numCols.push(c);
      if (numCols.length < 2) return null;
      const T = ctx.T;

      const dims = numCols.map((c) => {
        const vals = rows.map((r) => Number(r[c])).filter(Number.isFinite);
        return { name: columns[c], min: Math.min.apply(null, vals), max: Math.max.apply(null, vals) };
      });

      const o = C.base(cfg, ctx);
      o.grid = { show: false };
      delete o.legend;
      o.tooltip = C.buildTooltip(cfg, ctx, { trigger: 'item', pointer: 'none' });
      o.toolbox = C.toolboxOf(cfg, ctx);
      o.parallel = {
        left: 52,
        right: 52,
        top: cfg.showTitle === false ? 34 : 78,
        bottom: 36,
        parallelAxisDefault: {
          nameTextStyle: { color: T.axis, fontSize: 11, fontFamily: C.FONT },
          axisLine: { lineStyle: { color: T.axisLine } },
          axisTick: { lineStyle: { color: T.axisLine } },
          axisLabel: { color: T.axis, fontSize: 10, fontFamily: C.FONT },
          splitLine: { show: !!cfg.splitLineX }
        }
      };
      o.parallelAxis = dims.map((d, i) => ({ dim: i, name: d.name, min: d.min, max: d.max }));
      if (cfg.parallelColor !== false) {
        o.visualMap = {
          show: cfg.visualMap !== false,
          type: 'continuous',
          min: dims[0].min,
          max: dims[0].max,
          left: 4,
          bottom: 6,
          itemHeight: 84,
          itemWidth: 10,
          textStyle: { color: T.axis, fontSize: 10 },
          dimension: 0,
          inRange: { color: ctx.colors, opacity: .85 }
        };
      }
      o.series = [{
        type: 'parallel',
        smooth: cfg.smooth !== false,
        lineStyle: {
          width: cfg.lineWidth === undefined ? 2 : Number(cfg.lineWidth),
          opacity: (cfg.parallelOpacity === undefined ? 62 : Number(cfg.parallelOpacity)) / 100
        },
        emphasis: { lineStyle: { width: 4, opacity: .96 } },
        data: rows.map((r) => numCols.map((c) => Number(r[c])))
      }];
      o.__meta = { title: '平行坐标 · ' + rows.length + ' 条记录 · ' + dims.length + ' 个维度' };
      return o;
    }
  });

  register({
    id: 'calendar',
    name: '日历热力图',
    group: '多维 / 特殊',
    icon: 'i-calendar',
    shape: '日期 + 数值',
    hint: '把日期映射到日历格上，用颜色深浅表示数值强度。',
    preset: { labelShow: false, legendShow: false },
    extra: [
      { key: 'calOrient', label: '排列', type: 'select', def: 'horizontal', options: [['horizontal', '横向'], ['vertical', '纵向']] },
      { key: 'calCellSize', label: '格子大小', type: 'range', min: 10, max: 30, step: 1, unit: 'px', def: 15 }
    ],
    build: function (ds, cfg, ctx) {
      const columns = ds.columns || [], rows = ds.rows || [];
      if (!rows.length) return null;
      const T = ctx.T;

      const numCols = [];
      for (let c = 0; c < columns.length; c++) if (global.Dataset.columnIsNumeric(rows, c)) numCols.push(c);
      if (!numCols.length) return null;
      const vcol = numCols[numCols.length - 1];

      const dateCol = columns.length > numCols.length ? 0 : -1;
      const parsed = rows.map((r, i) => {
        let d = null;
        if (dateCol >= 0) {
          const raw = String(r[dateCol]).replace(/[/.]/g, '-').trim();
          const norm = raw.length === 10 ? raw : null;
          const dt = new Date(norm || raw);
          if (!isNaN(dt.getTime())) d = dt;
        }
        if (!d) d = new Date(2025, 0, 1 + i);
        return { date: d, value: Number(r[vcol]) || 0 };
      }).filter((p) => p.value !== null);

      if (!parsed.length) return null;

      const fmtDate = (d) => {
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return d.getFullYear() + '-' + m + '-' + day;
      };

      const times = parsed.map((p) => p.date.getTime());
      const minD = new Date(Math.min.apply(null, times));
      const maxD = new Date(Math.max.apply(null, times));
      const range = [fmtDate(minD), fmtDate(maxD)];
      const maxV = Math.max.apply(null, parsed.map((p) => p.value).concat([1]));

      const cell = cfg.calCellSize ? Number(cfg.calCellSize) : 15;
      const horizontal = (cfg.calOrient || 'horizontal') === 'horizontal';

      const o = C.base(cfg, ctx);
      o.grid = { show: false };
      o.tooltip = C.buildTooltip(cfg, ctx, { trigger: 'item', pointer: 'none' });
      o.toolbox = C.toolboxOf(cfg, ctx);
      o.calendar = {
        top: cfg.showTitle === false ? 40 : 90,
        left: 50,
        right: 30,
        bottom: 26,
        range: range,
        cellSize: [cell, cell],
        orient: cfg.calOrient || 'horizontal',
        splitLine: { show: true, lineStyle: { color: T.dark ? 'rgba(255,255,255,.09)' : 'rgba(15,32,64,.1)', width: 1.4 } },
        itemStyle: { color: 'transparent', borderWidth: 1, borderColor: T.dark ? 'rgba(255,255,255,.055)' : 'rgba(15,32,64,.07)' },
        dayLabel: { color: T.axis, fontSize: 10, nameMap: ['日', '一', '二', '三', '四', '五', '六'] },
        monthLabel: { color: T.axis, fontSize: 10, nameMap: 'ZH' },
        yearLabel: { show: false },
        silent: false
      };
      if (!horizontal) o.calendar.cellSize = [cell, cell];
      o.visualMap = {
        show: true,
        min: 0,
        max: maxV,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        itemWidth: 12,
        itemHeight: 80,
        textStyle: { color: T.axis, fontSize: 10 },
        inRange: { color: [P.tint(ctx.colors[0], .86), P.tint(ctx.colors[0], .4), ctx.colors[0], ctx.colors[1] || ctx.colors[0]], opacity: .95 }
      };
      o.series = [{
        type: 'heatmap',
        coordinateSystem: 'calendar',
        data: parsed.map((p) => [fmtDate(p.date), p.value]),
        itemStyle: { borderRadius: 3, borderColor: 'transparent' },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,.4)' } }
      }];
      const total = parsed.reduce((a, p) => a + p.value, 0);
      o.__meta = { title: '日历热力图 · ' + parsed.length + ' 天 · 合计 ' + C.fmt(total, cfg.thousandSep !== false) };
      return o;
    }
  });

})(window);
