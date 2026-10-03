// ControlEcharts data.js 单元测试 + CSV 解析安全测试
// 运行: node --test --test-force-exit tests/data.test.js
'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

global.window = global;
eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8'));
const D = global.Dataset;

describe('值类型推断 coerce', () => {
  test('数字字符串转 number', () => {
    assert.strictEqual(D.coerce('42'), 42);
    assert.strictEqual(D.coerce('3.14'), 3.14);
    assert.strictEqual(D.coerce('-10'), -10);
  });

  test('千分位和百分号处理', () => {
    assert.strictEqual(D.coerce('1,234'), 1234);
    assert.strictEqual(D.coerce('45.5%'), 45.5);
  });

  test('非数字字符串原样返回', () => {
    assert.strictEqual(D.coerce('hello'), 'hello');
    assert.strictEqual(D.coerce(''), '');
  });

  test('null/undefined 安全', () => {
    assert.strictEqual(D.coerce(null), '');
    assert.strictEqual(D.coerce(undefined), '');
  });
});

describe('CSV 解析', () => {
  test('基本 CSV 解析', () => {
    const result = D.parseText('name,age,city\nAlice,30,Beijing\nBob,25,Shanghai');
    assert.deepStrictEqual(result.columns, ['name', 'age', 'city']);
    assert.strictEqual(result.rows.length, 2);
    assert.strictEqual(result.rows[0][1], 30);
  });

  test('带引号和转义引号', () => {
    const csv = 'name,desc\n"Alice","She said ""hello"""\nBob,"Line1\nLine2"';
    const result = D.parseText(csv);
    assert.strictEqual(result.rows[0][1], 'She said "hello"');
    assert.strictEqual(result.rows[1][1], 'Line1\nLine2');
  });

  test('BOM 头去除', () => {
    const csv = '\uFEFFa,b\n1,2';
    const result = D.parseText(csv);
    assert.strictEqual(result.columns[0], 'a');
  });

  test('CRLF 行尾', () => {
    const result = D.parseText('a,b\r\n1,2\r\n3,4');
    assert.strictEqual(result.rows.length, 2);
  });

  test('空输入返回空数据集', () => {
    const result = D.parseText('');
    assert.deepStrictEqual(result.columns, []);
    assert.deepStrictEqual(result.rows, []);
  });
});

describe('CSV 注入防护', () => {
  test('XSS 载荷在 CSV 中作为纯文本（不执行）', () => {
    const csv = 'name,bio\n"<script>alert(1)</script>",test';
    const result = D.parseText(csv);
    // 解析结果是数据值，不是 HTML
    assert.strictEqual(typeof result.rows[0][0], 'string');
    assert.ok(result.rows[0][0].includes('<script>'));
  });

  test('公式注入 (=cmd|...) 在 CSV 解析中作为纯文本', () => {
    const csv = 'name,value\n"=HYPERLINK(""http://evil.com"")",100';
    const result = D.parseText(csv);
    // 解析为字符串，不执行
    assert.strictEqual(typeof result.rows[0][0], 'string');
  });

  test('路径穿越文件名为列名时安全', () => {
    const csv = '../../../etc/passwd,value\n1,2';
    const result = D.parseText(csv);
    assert.strictEqual(result.columns[0], '../../../etc/passwd');
  });
});

describe('数据变换', () => {
  test('transpose 转置矩阵', () => {
    const r = D.transpose(['a', 'b', 'c'], [[1, 2, 3], [4, 5, 6]]);
    assert.strictEqual(r.columns.length, 3);
    assert.strictEqual(r.rows.length, 2); // 原 2 行 → 2 列
    assert.strictEqual(r.rows[0].length, 3); // 每行 3 个值
  });

  test('sortRows 数值排序', () => {
    const rows = [[3], [1], [2]];
    const sorted = D.sortRows(['v'], rows, 0, 'asc');
    assert.deepStrictEqual(sorted.map(r => r[0]), [1, 2, 3]);
  });

  test('columnStats 统计', () => {
    const stats = D.columnStats([10, 20, 30, 40, 50]);
    assert.strictEqual(stats.count, 5);
    assert.strictEqual(stats.min, 10);
    assert.strictEqual(stats.max, 50);
    assert.strictEqual(stats.median, 30);
  });

  test('columnIsNumeric 判断', () => {
    assert.strictEqual(D.columnIsNumeric([[1], [2], [3]], 0), true);
    assert.strictEqual(D.columnIsNumeric([['a'], ['b'], ['c']], 0), false);
  });
});

describe('toCSV 序列化', () => {
  test('基本序列化', () => {
    const csv = D.toCSV(['a', 'b'], [[1, 2], [3, 4]]);
    assert.strictEqual(csv, 'a,b\n1,2\n3,4');
  });

  test('含逗号/引号的字段被转义', () => {
    const csv = D.toCSV(['name'], [['Doe, John']]);
    assert.strictEqual(csv, 'name\n"Doe, John"');
  });

  test('含换行的字段被引号包裹', () => {
    const csv = D.toCSV(['desc'], [['Line1\nLine2']]);
    assert.strictEqual(csv, 'desc\n"Line1\nLine2"');
  });
});
