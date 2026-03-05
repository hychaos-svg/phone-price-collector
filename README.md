# 手机价格采集系统

自动采集手机价格数据，支持多云部署的价格监控系统。

## 功能特性

- 🔄 **自动采集**：支持9大品牌（华为、苹果、荣耀、小米、OPPO、VIVO、IQOO、真我、一加）
- 📊 **可视化界面**：现代化Web界面，实时查看采集状态和数据统计
- ✅ **智能校验**：自动检测和修正异常价格数据
- 📁 **Excel导出**：自动生成带日期的Excel文件
- ☁️ **多云部署**：支持Docker、阿里云函数计算等多种部署方式

## 快速开始

### 本地运行

```bash
# 安装依赖
npm install

# 启动服务
npm start

# 访问 http://localhost:3001
```

### Docker部署

```bash
docker-compose up -d
```

### 阿里云函数计算部署

```bash
# 安装 Serverless Devs
npm install -g @serverless-devs/s

# 配置阿里云凭证
s config add

# 部署
s deploy
```

## API端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/collect` | GET | 触发采集 |
| `/api/files` | GET | 文件列表 |
| `/api/stats` | GET | 统计数据 |
| `/api/download/{filename}` | GET | 下载Excel文件 |

## 数据校验

系统自动对采集的价格数据进行智能校验：

- **价格分类区间**：
  - 普通手机：100 - 8,000 元
  - 高端旗舰：3,000 - 15,000 元
  - 折叠屏：6,000 - 25,000 元
  - 特殊机型：10,000 - 30,000 元

- **异常检测**：
  - 末尾多零自动修正
  - 价格突变检测
  - 格式异常过滤

## 环境变量

复制 `.env.example` 为 `.env` 并配置：

```
STORAGE_TYPE=local
PORT=3001
```

## 项目结构

```
├── src/
│   ├── index.js        # Web服务入口
│   ├── collector.js    # 采集核心逻辑
│   ├── validator.js    # 数据校验模块
│   ├── storage.js      # 存储模块
│   └── exporter.js     # Excel导出
├── public/
│   ├── index.html      # Web界面
│   ├── style.css       # 样式
│   └── app.js          # 前端逻辑
├── Dockerfile
├── docker-compose.yml
└── s.yaml              # 阿里云函数计算配置
```

## License

MIT
