# ControlEcharts 测试说明

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
