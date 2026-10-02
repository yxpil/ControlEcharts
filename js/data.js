/* ============================================================
   data.js — 数据模型 · CSV 解析 · 示例数据集
   ============================================================ */
(function (global) {
  'use strict';

  /* ----------------------------------------------------------
     值类型推断
     ---------------------------------------------------------- */
  const NUM_RE = /^-?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/;

  function coerce(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number' || typeof v === 'boolean') return v;
    const s = String(v).trim();
    if (s === '') return '';
    if (NUM_RE.test(s)) {
      const n = Number(s);
      if (Number.isFinite(n)) return n;
    }
    // 千分位与百分号
    const cleaned = s.replace(/,/g, '').replace(/%$/, '');
    if (cleaned !== s && NUM_RE.test(cleaned)) {
      const n = Number(cleaned);
      if (Number.isFinite(n)) return n;
    }
    return s;
  }

  function isNumeric(v) {
    if (typeof v === 'number') return Number.isFinite(v);
    return NUM_RE.test(String(v).replace(/,/g, '').trim());
  }

  function num(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? n : (fallback === undefined ? 0 : fallback);
  }

  /* ----------------------------------------------------------
     分隔符识别
     ---------------------------------------------------------- */
  const DELIMS = [',', '\t', ';', '|', ' '];

  function detectDelimiter(text) {
    const lines = String(text).split(/\r?\n/).filter((l) => l.trim() !== '').slice(0, 12);
    if (!lines.length) return ',';
    let best = ',', bestScore = -1;
    DELIMS.forEach((d) => {
      // 统计每行按该分隔符切分后的字段数，取众数
      const counts = lines.map((l) => splitLine(l, d).length);
      const freq = {};
      counts.forEach((c) => { freq[c] = (freq[c] || 0) + 1; });
      const modeCount = Object.keys(freq).reduce((a, b) => (freq[a] >= freq[b] ? a : b));
      const modeN = Number(modeCount);
      const consistency = freq[modeCount] / lines.length;
      if (modeN > 1) {
        const score = modeN * consistency * (d === ',' ? 1.05 : 1);
        if (score > bestScore) { bestScore = score; best = d; }
      }
    });
    return best;
  }

  /** 按分隔符切分单行（用于分隔符识别，忽略引号） */
  function splitLine(line, d) {
    return String(line).split(d);
  }

  /* ----------------------------------------------------------
     CSV 解析（完整支持双引号包裹、双引号转义、CRLF、BOM）
     ---------------------------------------------------------- */
  function parseDelimited(text, delimiter) {
    let src = String(text || '');
    if (src.charCodeAt(0) === 0xFEFF) src = src.slice(1); // 去 BOM

    const d = delimiter || detectDelimiter(src);
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    let i = 0;

    while (i < src.length) {
      const ch = src[i];

      if (inQuotes) {
        if (ch === '"') {
          if (src[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        }
        field += ch; i++; continue;
      }

      if (ch === '"') { inQuotes = true; i++; continue; }
      if (ch === d) { row.push(field); field = ''; i++; continue; }
      if (ch === '\n') {
        row.push(field); rows.push(row);
        row = []; field = ''; i++; continue;
      }
      if (ch === '\r') { i++; continue; }
      field += ch; i++;
    }

    // 收尾
    if (field !== '' || row.length) { row.push(field); rows.push(row); }

    // 去掉尾部空行
    while (rows.length && rows[rows.length - 1].every((c) => String(c).trim() === '')) rows.pop();
    return rows;
  }

  /** 文本 → 数据集 */
  function parseText(text, options) {
    const opts = options || {};
    const delim = opts.delimiter && opts.delimiter !== 'auto'
      ? (opts.delimiter === '\\t' ? '\t' : opts.delimiter)
      : detectDelimiter(text);

    const raw = parseDelimited(text, delim);
    if (!raw.length) return { columns: [], rows: [] };

    const header = opts.header !== false;
    const width = raw.reduce((m, r) => Math.max(m, r.length), 0);

    let columns, body;
    if (header) {
      columns = raw[0].map((c, idx) => {
        const name = String(c).trim();
        return name || ('列' + (idx + 1));
      });
      body = raw.slice(1);
    } else {
      columns = [];
      for (let c = 0; c < width; c++) columns.push('列' + (c + 1));
      body = raw;
    }

    while (columns.length < width) columns.push('列' + (columns.length + 1));

    const rows = body.map((r) => {
      const out = [];
      for (let c = 0; c < columns.length; c++) out.push(coerce(r[c]));
      return out;
    });

    return { columns: dedupeColumns(columns), rows: rows };
  }

  function dedupeColumns(cols) {
    const seen = {};
    return cols.map((c) => {
      let name = String(c).trim() || '列';
      if (seen[name] === undefined) { seen[name] = 0; return name; }
      seen[name] += 1;
      return name + '_' + seen[name];
    });
  }

  /* ----------------------------------------------------------
     数据集 → CSV / TSV
     ---------------------------------------------------------- */
  function escapeCell(v) {
    const s = v === null || v === undefined ? '' : String(v);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function toCSV(columns, rows, delim) {
    const d = delim || ',';
    const lines = [columns.map(escapeCell).join(d)];
    rows.forEach((r) => {
      const line = [];
      for (let i = 0; i < columns.length; i++) line.push(escapeCell(r[i]));
      lines.push(line.join(d));
    });
    return lines.join('\n');
  }

  /* ----------------------------------------------------------
     数据变换工具
     ---------------------------------------------------------- */
  function transpose(columns, rows) {
    const matrix = [columns].concat(rows.map((r) => {
      const out = [];
      for (let i = 0; i < columns.length; i++) out.push(r[i]);
      return out;
    }));
    const t = [];
    const width = Math.max.apply(null, matrix.map((r) => r.length));
    for (let c = 0; c < width; c++) {
      const line = [];
      for (let r = 0; r < matrix.length; r++) line.push(matrix[r][c] === undefined ? '' : matrix[r][c]);
      t.push(line);
    }
    const newCols = t[0].map((c, i) => String(c).trim() || ('列' + (i + 1)));
    const newRows = t.slice(1).map((r) => r.map(coerce));
    return { columns: dedupeColumns(newCols), rows: newRows };
  }

  function sortRows(columns, rows, colIndex, dir) {
    const mul = dir === 'desc' ? -1 : 1;
    const copy = rows.slice();
    copy.sort((a, b) => {
      const x = a[colIndex], y = b[colIndex];
      const nx = isNumeric(x), ny = isNumeric(y);
      if (nx && ny) return (Number(x) - Number(y)) * mul;
      return String(x).localeCompare(String(y), 'zh-Hans-CN') * mul;
    });
    return copy;
  }

  /** 判断某列是否数值列 */
  function columnIsNumeric(rows, colIndex) {
    let seen = 0, ok = 0;
    for (let i = 0; i < rows.length; i++) {
      const v = rows[i][colIndex];
      if (v === '' || v === null || v === undefined) continue;
      seen++;
      if (isNumeric(v)) ok++;
      if (seen >= 30) break;
    }
    return seen > 0 && ok / seen >= 0.7;
  }

  function columnStats(values) {
    const nums = values.filter(isNumeric).map(Number);
    if (!nums.length) return { count: 0 };
    const sorted = nums.slice().sort((a, b) => a - b);
    const sum = nums.reduce((a, b) => a + b, 0);
    const mean = sum / nums.length;
    const q = (p) => {
      const pos = (sorted.length - 1) * p;
      const base = Math.floor(pos);
      const rest = pos - base;
      return sorted[base + 1] !== undefined
        ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
        : sorted[base];
    };
    const variance = nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / nums.length;
    return {
      count: nums.length,
      sum: sum,
      mean: mean,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: q(0.5),
      q1: q(0.25),
      q3: q(0.75),
      std: Math.sqrt(variance)
    };
  }

  /* ----------------------------------------------------------
     空白数据集
     ---------------------------------------------------------- */
  function blank() {
    return {
      columns: ['类别', '系列A', '系列B'],
      rows: [
        ['项目一', 120, 210],
        ['项目二', 180, 150],
        ['项目三', 150, 260],
        ['项目四', 220, 190],
        ['项目五', 130, 240]
      ]
    };
  }

  /* ----------------------------------------------------------
     示例数据集
     ---------------------------------------------------------- */
  const SAMPLES = [
    {
      id: 'monthly-sales',
      name: '月度销售趋势',
      desc: '12 个月三条产品线销售额，适合柱状图、折线图、堆叠图',
      tag: '分类 + 多系列',
      prefer: 'bar',
      data: {
        columns: ['月份', '线上渠道', '线下门店', '分销代理'],
        rows: [
          ['1月', 186, 142, 96], ['2月', 152, 118, 88], ['3月', 204, 166, 112],
          ['4月', 231, 174, 128], ['5月', 268, 198, 141], ['6月', 312, 226, 168],
          ['7月', 356, 244, 182], ['8月', 341, 238, 176], ['9月', 298, 212, 158],
          ['10月', 322, 246, 174], ['11月', 418, 312, 226], ['12月', 462, 348, 251]
        ]
      }
    },
    {
      id: 'region-compare',
      name: '区域经营对比',
      desc: '六大区域营收 / 成本 / 利润对比，适合分组柱状图与雷达图',
      tag: '分类 + 多系列',
      prefer: 'bar-group',
      data: {
        columns: ['区域', '营业收入', '运营成本', '净利润'],
        rows: [
          ['华东', 1280, 760, 520], ['华南', 980, 610, 370], ['华北', 1120, 705, 415],
          ['西南', 640, 430, 210], ['西北', 380, 268, 112], ['东北', 520, 372, 148]
        ]
      }
    },
    {
      id: 'market-share',
      name: '市场份额占比',
      desc: '单一维度的占比数据，适合饼图、环形图、玫瑰图、矩形树图',
      tag: '名称 + 单值',
      prefer: 'pie-doughnut',
      data: {
        columns: ['品牌', '市场份额'],
        rows: [
          ['云启科技', 28.6], ['繁星数据', 21.3], ['恒信智能', 16.8],
          ['青云网络', 12.4], ['思源信息', 9.7], ['其他', 11.2]
        ]
      }
    },
    {
      id: 'funnel-channel',
      name: '渠道转化漏斗',
      desc: '从曝光到成交的逐级转化，适合漏斗图与阶梯面积图',
      tag: '名称 + 单值',
      prefer: 'funnel',
      data: {
        columns: ['环节', '人数'],
        rows: [
          ['广告曝光', 128000], ['页面访问', 46200], ['商品浏览', 28400],
          ['加入购物车', 12600], ['提交订单', 6800], ['完成支付', 5240]
        ]
      }
    },
    {
      id: 'scatter-ads',
      name: '投入产出散点',
      desc: '两组数值变量的相关性，适合散点图与双轴折线图',
      tag: '双数值',
      prefer: 'scatter',
      data: {
        columns: ['广告投入', '销售额'],
        rows: [
          [12, 86], [18, 118], [24, 142], [31, 176], [37, 198], [44, 236],
          [52, 258], [58, 296], [66, 322], [74, 358], [82, 376], [91, 418],
          [98, 442], [106, 476], [118, 512]
        ]
      }
    },
    {
      id: 'bubble-city',
      name: '城市三维气泡',
      desc: '横轴 / 纵轴 / 气泡大小三列数值，适合气泡图与散点图',
      tag: '三数值',
      prefer: 'scatter-bubble',
      data: {
        columns: ['人均收入', '消费指数', '人口规模'],
        rows: [
          [4.2, 62, 1280], [5.1, 71, 890], [6.3, 78, 2200], [7.4, 84, 1560],
          [8.2, 88, 3100], [3.6, 55, 620], [5.8, 74, 1180], [9.1, 93, 2450],
          [6.9, 81, 1740], [4.8, 66, 980], [7.8, 86, 1960], [5.4, 70, 1420]
        ]
      }
    },
    {
      id: 'heatmap-traffic',
      name: '时段客流热力',
      desc: '星期与时段交叉矩阵，适合热力图',
      tag: '矩阵',
      prefer: 'heatmap',
      data: {
        columns: ['星期', '时段', '客流量'],
        rows: (function () {
          const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
          const slots = ['07时', '10时', '13时', '16时', '19时', '22时'];
          const base = [[12, 38, 52, 44, 61, 33], [11, 36, 49, 42, 63, 35], [13, 40, 55, 47, 66, 38],
            [14, 42, 58, 49, 70, 41], [18, 52, 68, 62, 88, 56], [26, 68, 84, 76, 102, 68], [22, 58, 72, 66, 92, 61]];
          const out = [];
          for (let d = 0; d < days.length; d++) {
            for (let s = 0; s < slots.length; s++) out.push([days[d], slots[s], base[d][s]]);
          }
          return out;
        })()
      }
    },
    {
      id: 'radar-skills',
      name: '团队能力雷达',
      desc: '多维度评分矩阵，适合雷达图与平行坐标图',
      tag: '分类 + 多系列',
      prefer: 'radar',
      data: {
        columns: ['能力维度', '研发组', '产品组', '设计组'],
        rows: [
          ['技术深度', 92, 68, 54], ['协作效率', 78, 88, 82], ['交付质量', 88, 76, 90],
          ['创新指数', 74, 84, 92], ['响应速度', 70, 82, 78], ['成本控制', 82, 72, 66]
        ]
      }
    },
    {
      id: 'candlestick-stock',
      name: '日线行情 K 线',
      desc: '日期 + 开盘 / 收盘 / 最低 / 最高，适合 K 线图',
      tag: '金融时序',
      prefer: 'candlestick',
      data: {
        columns: ['日期', '开盘', '收盘', '最低', '最高'],
        rows: [
          ['01-02', 102.4, 105.8, 101.2, 106.9], ['01-03', 105.9, 103.2, 102.4, 107.1],
          ['01-06', 103.1, 108.6, 102.8, 109.4], ['01-07', 108.7, 112.3, 107.6, 113.8],
          ['01-08', 112.1, 109.4, 108.2, 113.2], ['01-09', 109.6, 115.8, 109.1, 116.4],
          ['01-10', 116.2, 118.9, 114.8, 119.7], ['01-13', 118.6, 114.2, 113.4, 119.2],
          ['01-14', 114.4, 111.8, 110.6, 115.6], ['01-15', 111.9, 117.4, 111.2, 118.1],
          ['01-16', 117.6, 121.8, 116.4, 122.9], ['01-17', 121.5, 124.6, 120.1, 125.8],
          ['01-20', 124.8, 120.4, 119.6, 125.2], ['01-21', 120.2, 123.6, 119.1, 124.4],
          ['01-22', 123.8, 128.2, 123.1, 129.4], ['01-23', 128.4, 131.6, 126.8, 132.8],
          ['01-24', 131.2, 127.4, 126.2, 132.1], ['01-27', 127.6, 133.8, 127.1, 134.6],
          ['01-28', 134.1, 138.4, 132.9, 139.2], ['01-29', 138.6, 142.1, 137.2, 143.4],
          ['01-30', 142.3, 139.6, 138.4, 143.1], ['01-31', 139.8, 145.2, 139.1, 146.6]
        ]
      }
    },
    {
      id: 'sankey-flow',
      name: '用户流转路径',
      desc: '来源 → 去向的流向关系，适合桑基图与关系图',
      tag: '源 + 目标 + 权重',
      prefer: 'sankey',
      data: {
        columns: ['来源', '去向', '用户数'],
        rows: [
          ['搜索广告', '首页', 4200], ['社交推荐', '首页', 3100], ['应用商店', '首页', 2600],
          ['首页', '商品详情', 6100], ['首页', '活动页', 2400], ['首页', '直接离开', 1400],
          ['商品详情', '加购', 3200], ['商品详情', '直接离开', 2900], ['活动页', '加购', 1500],
          ['活动页', '直接离开', 900], ['加购', '下单', 2600], ['加购', '直接离开', 2100],
          ['下单', '支付成功', 2140], ['下单', '支付失败', 460]
        ]
      }
    },
    {
      id: 'graph-network',
      name: '关联网关系网络',
      desc: '实体之间的连接权重，适合关系图与力导向布局',
      tag: '源 + 目标 + 权重',
      prefer: 'graph',
      data: {
        columns: ['节点A', '节点B', '关联强度'],
        rows: [
          ['核心系统', '订单服务', 92], ['核心系统', '用户服务', 88], ['核心系统', '支付网关', 76],
          ['核心系统', '风控引擎', 64], ['订单服务', '库存服务', 81], ['订单服务', '物流服务', 58],
          ['支付网关', '清算中心', 71], ['用户服务', '消息中心', 45], ['风控引擎', '数据仓库', 69],
          ['数据仓库', '报表平台', 86], ['消息中心', '报表平台', 34], ['库存服务', '数据仓库', 52],
          ['清算中心', '对账系统', 77], ['支付网关', '对账系统', 63]
        ]
      }
    },
    {
      id: 'growth-quarter',
      name: '季度增长率（含负值）',
      desc: '包含正负值的数据，适合瀑布图、正负柱状图与双轴图',
      tag: '分类 + 多系列',
      prefer: 'bar-waterfall',
      data: {
        columns: ['季度', '同比增长', '环比增长'],
        rows: [
          ['2024Q1', 12.4, -3.2], ['2024Q2', 18.6, 5.4], ['2024Q3', -6.8, -12.1],
          ['2024Q4', 24.2, 9.6], ['2025Q1', 31.5, 6.2], ['2025Q2', -4.3, -18.7],
          ['2025Q3', 16.9, 11.4], ['2025Q4', 28.7, 8.3]
        ]
      }
    },
    {
      id: 'distribution',
      name: '四组数据分布',
      desc: '用于箱线图与分布对比，每列为一组样本',
      tag: '多组样本',
      prefer: 'boxplot',
      data: {
        columns: ['样本组', '数值'],
        rows: (function () {
          const groups = [
            { name: 'A 组', mu: 62, sd: 11 }, { name: 'B 组', mu: 74, sd: 7 },
            { name: 'C 组', mu: 55, sd: 15 }, { name: 'D 组', mu: 68, sd: 4 }
          ];
          const out = [];
          let seed = 987654321;
          const rnd = () => {
            seed ^= seed << 13; seed >>>= 0; seed ^= seed >> 17; seed ^= seed << 5; seed >>>= 0;
            return seed / 4294967296;
          };
          groups.forEach((g) => {
            for (let i = 0; i < 40; i++) {
              const u1 = Math.max(rnd(), 1e-9), u2 = rnd();
              const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
              out.push([g.name, Math.round((g.mu + z * g.sd) * 10) / 10]);
            }
          });
          return out;
        })()
      }
    },
    {
      id: 'time-series',
      name: '两年月度时序',
      desc: '24 个月连续时序，适合面积图、平滑折线、缩放交互',
      tag: '时间序列',
      prefer: 'line-area',
      data: {
        columns: ['月份', '活跃用户', '新增用户', '付费用户'],
        rows: (function () {
          const out = [];
          for (let i = 0; i < 24; i++) {
            const y = 2025 + Math.floor(i / 12);
            const m = (i % 12) + 1;
            const wave = Math.sin((i / 12) * Math.PI * 2 - 1.2);
            const active = Math.round(3200 + i * 145 + wave * 620 + (i % 3) * 48);
            const fresh = Math.round(620 + i * 26 + Math.cos(i / 2.4) * 175);
            const paid = Math.round(active * (0.18 + (i / 24) * 0.15));
            out.push([y + '年' + m + '月', active, fresh, paid]);
          }
          return out;
        })()
      }
    },
    {
      id: 'store-rank',
      name: '门店销售排行',
      desc: '含负值的横向对比，适合条形图、象形柱图与主题河流',
      tag: '分类 + 单系列',
      prefer: 'bar-horizontal',
      data: {
        columns: ['门店', '销售额'],
        rows: [
          ['滨海旗舰店', 862], ['中环中心店', 745], ['西城广场店', 692],
          ['高新科技店', 634], ['江北新区店', 578], ['老城文化店', 496],
          ['南湖社区店', 421], ['东站枢纽店', 386], ['北苑生活店', 312],
          ['大学城店', 268]
        ]
      }
    }
  ];

  global.Dataset = {
    coerce: coerce,
    isNumeric: isNumeric,
    num: num,
    detectDelimiter: detectDelimiter,
    parseDelimited: parseDelimited,
    parseText: parseText,
    toCSV: toCSV,
    transpose: transpose,
    sortRows: sortRows,
    columnIsNumeric: columnIsNumeric,
    columnStats: columnStats,
    dedupeColumns: dedupeColumns,
    blank: blank,
    SAMPLES: SAMPLES
  };

})(window);
