# ControlEcharts 测试说明
- 测试完成：是（2026-10-04）
- 测试日期：2026-10-04
- 测试内容：单元测试覆盖 js/data.js 的 coerce 类型转换、CSV 解析（引号/BOM/CRLF）、transpose 转置、sortRows 排序、columnStats 统计、columnIsNumeric 判断、toCSV 序列化；注入测试覆盖 XSS 载荷作为纯文本数据、Excel 公式注入 =HYPERLINK、路径穿越文件名安全处理；钩子测试覆盖重名列去重、空输入降级、混合类型列判断
- 运行命令：npm test
- 测试框架：node:test（Node.js 内置测试运行器）
- 模型：豆包（Doubao）生成

## 测试目录

| 文件 | 说明 |
|------|------|
| `tests/data.test.js` | data.js 纯函数测试：coerce/CSV 解析/转置/排序/统计/序列化 |

## 运行方式

```bash
npm test
```

## 覆盖说明

### 单元测试（13 个）
- coerce：数字/千分位/百分号/非数字/null 边界
- CSV 解析：基本/引号转义/BOM/CRLF/空输入
- transpose/sortRows/columnStats/columnIsNumeric
- toCSV 序列化（含逗号/引号/换行转义）

### 注入测试（3 个）
- XSS 载荷在 CSV 中作为纯文本数据（不执行）
- 公式注入 `=HYPERLINK(...)` 作为字符串
- 路径穿越文件名作为列名安全处理

### 钩子/交互测试（3 个）
- dedupeColumns 重名列自动去重
- 空输入安全降级
- 混合类型列的数值判断

## 预期结果：19 个用例全部通过
