/* ============================================================
   palettes.js — 配色引擎
   提供多色方案库、单色色阶生成、自定义色序与通用色彩工具
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------- 多色方案库 ---------- */
  const MULTI_PALETTES = [
    { id: 'ocean', name: '海洋蓝', colors: ['#4C8DFF', '#39C2D7', '#3ED598', '#F7C948', '#FF8A5B', '#FF5C7A', '#A66BFF', '#6C7CFF', '#2ECC9B', '#8DD35F'] },
    { id: 'business', name: '商务稳重', colors: ['#2F5597', '#4E8AC7', '#7FB2E0', '#A8C9E8', '#C9DDF1', '#E8B93F', '#D98E3F', '#C0584F', '#7B5EA7', '#4E9E8F'] },
    { id: 'macaron', name: '马卡龙', colors: ['#FF9AA2', '#FFB7B2', '#FFDAC1', '#E2F0CB', '#B5EAD7', '#C7CEEA', '#E0BBE4', '#FEC8D8', '#D4F0F0', '#FFF5BA'] },
    { id: 'morandi', name: '莫兰迪', colors: ['#A8B0A5', '#C4B7A6', '#D8C3A5', '#B5A99A', '#8E9AAF', '#9DA9A0', '#C1B2C6', '#A99A8C', '#93A8AC', '#CBC0B0'] },
    { id: 'neon', name: '霓虹光谱', colors: ['#00E5FF', '#00FFA3', '#B4FF39', '#FFD600', '#FF8A00', '#FF3D71', '#E040FB', '#7C4DFF', '#536DFE', '#18FFFF'] },
    { id: 'forest', name: '森野绿', colors: ['#2E7D32', '#43A047', '#66BB6A', '#9CCC65', '#C5E1A5', '#00897B', '#4DB6AC', '#80CBC4', '#AED581', '#DCEDC8'] },
    { id: 'sunset', name: '落日暖橙', colors: ['#D84315', '#F4511E', '#FB8C00', '#FFB300', '#FFD54F', '#FF7043', '#FF8A65', '#BCAAA4', '#8D6E63', '#6D4C41'] },
    { id: 'aurora', name: '极光', colors: ['#00B8A9', '#22D1A8', '#7BE495', '#C5F27C', '#F8F398', '#8AB6F9', '#6C8AE4', '#B18CFF', '#F58FD0', '#6FD6E8'] },
    { id: 'cyber', name: '赛博紫粉', colors: ['#F72585', '#B5179E', '#7209B7', '#560BAD', '#480CA8', '#3A0CA3', '#3F37C9', '#4361EE', '#4895EF', '#4CC9F0'] },
    { id: 'coffee', name: '咖啡大地', colors: ['#4E342E', '#6D4C41', '#8D6E63', '#A1887F', '#BCAAA4', '#D7CCC8', '#5D4037', '#795548', '#A67B5B', '#3E2723'] },
    { id: 'grape', name: '葡萄紫', colors: ['#4A148C', '#6A1B9A', '#8E24AA', '#AB47BC', '#CE93D8', '#7E57C2', '#9575CD', '#B39DDB', '#D1C4E9', '#E1BEE7'] },
    { id: 'steel', name: '钢青灰', colors: ['#37474F', '#455A64', '#546E7A', '#607D8B', '#78909C', '#90A4AE', '#B0BEC5', '#CFD8DC', '#26A69A', '#4DB6AC'] },
    { id: 'coral', name: '珊瑚粉', colors: ['#E53935', '#F4511E', '#FF7043', '#FF8A65', '#FFAB91', '#EC407A', '#F06292', '#F48FB1', '#F8BBD0', '#FFCCBC'] },
    { id: 'ice', name: '冰川', colors: ['#0B4F8A', '#1573B8', '#2E9BD6', '#5FBEE8', '#9BDCF3', '#C9EDFA', '#0E7490', '#22A7B8', '#6ED3DE', '#B6ECF2'] },
    { id: 'candy', name: '糖果缤纷', colors: ['#FF6B6B', '#FFA36B', '#FFD36B', '#8BE86B', '#6BE8C4', '#6BB8FF', '#A98BFF', '#FF8BE8', '#E86BC4', '#B58BFF'] },
    { id: 'contrast', name: '高对比色', colors: ['#E6194B', '#3CB44B', '#FFE119', '#4363D8', '#F58231', '#911EB4', '#46F0F0', '#F032E6', '#BCF60C', '#FABEBE'] }
  ];

  /* ---------- 单色基础色 ---------- */
  const MONO_BASES = [
    { id: 'blue', name: '经典蓝', hex: '#3B82F6' },
    { id: 'cyan', name: '湖水青', hex: '#06B6D4' },
    { id: 'teal', name: '松石绿', hex: '#14B8A6' },
    { id: 'green', name: '自然绿', hex: '#22C55E' },
    { id: 'lime', name: '青柠', hex: '#84CC16' },
    { id: 'amber', name: '琥珀金', hex: '#F59E0B' },
    { id: 'orange', name: '暖橙', hex: '#F97316' },
    { id: 'red', name: '朱红', hex: '#EF4444' },
    { id: 'pink', name: '玫瑰粉', hex: '#EC4899' },
    { id: 'fuchsia', name: '品红', hex: '#D946EF' },
    { id: 'violet', name: '紫罗兰', hex: '#8B5CF6' },
    { id: 'indigo', name: '靛青', hex: '#4F46E5' },
    { id: 'sky', name: '天蓝', hex: '#0EA5E9' },
    { id: 'slate', name: '石板灰', hex: '#64748B' },
    { id: 'navy', name: '深海蓝', hex: '#1E40AF' },
    { id: 'brown', name: '赭石棕', hex: '#92400E' },
    { id: 'emerald', name: '翡翠', hex: '#10B981' },
    { id: 'crimson', name: '深绯红', hex: '#BE123C' },
    { id: 'magenta', name: '洋红', hex: '#C026D3' },
    { id: 'graphite', name: '石墨黑', hex: '#334155' }
  ];

  /* ---------- 色彩工具 ---------- */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function normHex(hex) {
    let h = String(hex || '').trim().replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (h.length === 8) h = h.slice(0, 6);
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    return '#' + h.toLowerCase();
  }

  function hexToRgb(hex) {
    const h = normHex(hex);
    if (!h) return { r: 0, g: 0, b: 0 };
    return {
      r: parseInt(h.slice(1, 3), 16),
      g: parseInt(h.slice(3, 5), 16),
      b: parseInt(h.slice(5, 7), 16)
    };
  }

  function rgbToHex(r, g, b) {
    const f = (v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
    return '#' + f(r) + f(g) + f(b);
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    const d = max - min;
    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        default: h = (r - g) / d + 4;
      }
      h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    s = clamp(s, 0, 100) / 100;
    l = clamp(l, 0, 100) / 100;
    if (s === 0) {
      const v = l * 255;
      return { r: v, g: v, b: v };
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue = (t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return { r: hue(h + 1 / 3) * 255, g: hue(h) * 255, b: hue(h - 1 / 3) * 255 };
  }

  function hexToHsl(hex) {
    const c = hexToRgb(hex);
    return rgbToHsl(c.r, c.g, c.b);
  }

  function fromHsl(h, s, l) {
    const c = hslToRgb(h, s, l);
    return rgbToHex(c.r, c.g, c.b);
  }

  function adjust(hex, dh, ds, dl) {
    const c = hexToHsl(hex);
    return fromHsl(c.h + dh, clamp(c.s + ds, 0, 100), clamp(c.l + dl, 4, 97));
  }

  function lighten(hex, amt) { return adjust(hex, 0, 0, amt); }
  function darken(hex, amt) { return adjust(hex, 0, 0, -amt); }

  /** 两色线性插值，t 属于 [0,1] */
  function mix(hexA, hexB, t) {
    const a = hexToRgb(hexA), b = hexToRgb(hexB);
    t = clamp(t, 0, 1);
    return rgbToHex(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t);
  }

  /** 混入白/黑改变明度 */
  function tint(hex, t) { return mix(hex, '#ffffff', t); }
  function shade(hex, t) { return mix(hex, '#000000', t); }

  function rgba(hex, alpha) {
    const c = hexToRgb(hex);
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + clamp(alpha, 0, 1) + ')';
  }

  /** 计算相对亮度，用于自动选择文字颜色 */
  function luminance(hex) {
    const c = hexToRgb(hex);
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }

  function readableOn(hex) { return luminance(hex) > 0.58 ? '#12203a' : '#ffffff'; }

  /** 确定性伪随机（保证同一输入得到同一序列） */
  function seeded(seed) {
    let s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  /* ---------- 单色色阶生成 ---------- */
  /**
   * 根据基础色生成 count 个色阶
   * mode: shade | dark | light | vivid | grey
   */
  function monoRamp(baseHex, count, mode) {
    const base = normHex(baseHex) || '#3B82F6';
    const c = hexToHsl(base);
    const n = Math.max(1, count | 0);
    const out = [];

    // 每个模式的明度区间与饱和度策略
    const profiles = {
      shade:  { lFrom: 28, lTo: 78, sFrom: 100, sTo: 78, hSpread: 0 },
      dark:   { lFrom: 16, lTo: 52, sFrom: 95,  sTo: 70, hSpread: 0 },
      light:  { lFrom: 48, lTo: 88, sFrom: 62,  sTo: 82, hSpread: 0 },
      vivid:  { lFrom: 34, lTo: 66, sFrom: 100, sTo: 100, hSpread: 6 },
      grey:   { lFrom: 22, lTo: 84, sFrom: 0,   sTo: 0,  hSpread: 0 }
    };
    const p = profiles[mode] || profiles.shade;

    if (n === 1) {
      out.push(fromHsl(c.h, p.sFrom === 0 ? 0 : clamp(c.s, 45, 92), (p.lFrom + p.lTo) / 2));
      return out;
    }

    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const l = p.lFrom + (p.lTo - p.lFrom) * t;
      let s = p.sFrom + (p.sTo - p.sFrom) * t;
      // 与基础色保底融合，避免完全偏离原色相
      s = clamp((s + c.s) / 2, 12, 100);
      const h = c.h + (p.hSpread ? (t - 0.5) * p.hSpread : 0);
      out.push(fromHsl(h, s, l));
    }
    return out;
  }

  /* ---------- 取色器 ---------- */
  /**
   * 构建最终颜色序列
   * opts = { mode, monoBase, monoMode, multiId, custom[], count, opacity, jitter }
   */
  function buildColors(opts) {
    const count = Math.max(1, opts.count | 0);
    let base = [];

    if (opts.mode === 'mono') {
      base = monoRamp(opts.monoBase || '#3B82F6', count, opts.monoMode || 'shade');
    } else if (opts.mode === 'custom') {
      base = (opts.custom && opts.custom.length) ? opts.custom.slice() : MULTI_PALETTES[0].colors.slice();
      while (base.length < count) base.push(base[base.length % Math.max(1, (opts.custom || []).length || 1)]);
      base = base.slice(0, count);
    } else {
      const pal = getMultiPalette(opts.multiId);
      const pool = pal.colors;
      if (opts.multiRepeat === 'shuffle') {
        for (let i = 0; i < count; i++) {
          if (i < pool.length) { base.push(pool[i]); }
          else {
            const a = pool[i % pool.length];
            const b = pool[(i + 1) % pool.length];
            base.push(mix(a, b, 0.45));
          }
        }
      } else {
        for (let i = 0; i < count; i++) base.push(pool[i % pool.length]);
      }
    }

    // 随机扰动，制造自然变化
    const jitter = Number(opts.jitter) || 0;
    if (jitter > 0) {
      const rnd = seeded(20261002 + count * 7 + jitter);
      base = base.map((hex) => {
        const dh = (rnd() - 0.5) * jitter * 1.4;
        const dl = (rnd() - 0.5) * jitter * 0.7;
        const ds = (rnd() - 0.5) * jitter * 1.1;
        return adjust(hex, dh, ds, dl);
      });
    }

    const op = opts.opacity === undefined ? 1 : Number(opts.opacity) / 100;
    if (op < 1) base = base.map((hex) => rgba(hex, op));
    return base;
  }

  function getMultiPalette(id) {
    return MULTI_PALETTES.filter((p) => p.id === id)[0] || MULTI_PALETTES[0];
  }

  function getMonoBase(id) {
    return MONO_BASES.filter((b) => b.id === id)[0] || MONO_BASES[0];
  }

  /** 生成 ECharts 渐变对象 */
  function gradient(ctx, from, to, horizontal, alphaFrom, alphaTo) {
    if (!ctx || !ctx.graphic) return from;
    const g = new ctx.graphic.LinearGradient(
      horizontal ? 0 : 0, horizontal ? 0 : 0,
      horizontal ? 1 : 0, horizontal ? 0 : 1,
      [
        { offset: 0, color: rgba(from, alphaFrom === undefined ? 1 : alphaFrom) },
        { offset: 1, color: rgba(to, alphaTo === undefined ? 0.35 : alphaTo) }
      ]
    );
    return g;
  }

  /** 纵向渐变的柱状色（上亮下暗） */
  function barGradient(ctx, hex, strength) {
    if (!ctx || !ctx.graphic) return hex;
    const k = strength === undefined ? 0.26 : strength;
    return new ctx.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: tint(hex, k) },
      { offset: 1, color: shade(hex, k * 1.1) }
    ]);
  }

  /** 面积图渐隐填充 */
  function areaGradient(ctx, hex, topAlpha, bottomAlpha) {
    if (!ctx || !ctx.graphic) return rgba(hex, topAlpha === undefined ? 0.4 : topAlpha);
    return new ctx.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: rgba(hex, topAlpha === undefined ? 0.42 : topAlpha) },
      { offset: 1, color: rgba(hex, bottomAlpha === undefined ? 0.02 : bottomAlpha) }
    ]);
  }

  /** 深色背景下的文字颜色建议 */
  function textOn(dark) { return dark ? '#dde6f5' : '#334155'; }

  global.Palettes = {
    MULTI_PALETTES: MULTI_PALETTES,
    MONO_BASES: MONO_BASES,
    normHex: normHex,
    hexToRgb: hexToRgb,
    rgbToHex: rgbToHex,
    hexToHsl: hexToHsl,
    fromHsl: fromHsl,
    adjust: adjust,
    lighten: lighten,
    darken: darken,
    mix: mix,
    tint: tint,
    shade: shade,
    rgba: rgba,
    luminance: luminance,
    readableOn: readableOn,
    monoRamp: monoRamp,
    buildColors: buildColors,
    getMultiPalette: getMultiPalette,
    getMonoBase: getMonoBase,
    gradient: gradient,
    barGradient: barGradient,
    areaGradient: areaGradient,
    textOn: textOn
  };

})(window);
