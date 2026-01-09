// 测试时间格式化
const utcTimeString = "2026-01-09 07:20:00";

// 方法1：直接解析（不可靠）
const date1 = new Date(utcTimeString);
console.log("方法1 - 直接解析:", date1.toISOString());

// 方法2：添加Z（可能不可靠）
const date2 = new Date(utcTimeString + 'Z');
console.log("方法2 - 添加Z:", date2.toISOString());

// 方法3：替换空格为T并添加Z（正确的ISO格式）
const isoString = utcTimeString.replace(' ', 'T') + 'Z';
const date3 = new Date(isoString);
console.log("方法3 - ISO格式:", date3.toISOString());

// 转换为北京时间
console.log("\n北京时间显示:");
console.log("方法3结果:", date3.toLocaleString("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit"
}));

// 预期：UTC 07:20 + 8小时 = 北京时间 15:20
console.log("\n预期结果: 2026/01/09 15:20");
