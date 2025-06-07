# LinuxDo自习室 🐧

Welcome to the **LinuxDo自习室** repository! This project offers a secure, isolated, and user-friendly online Linux learning environment through a WebSSH system. Each user gets their own container, ensuring a safe and efficient learning experience.

## ✨ 特性

### 🐳 容器隔离
- **独立环境**: 每个用户获得独立的Docker容器。
- **完全隔离**: 用户无法访问宿主机或其他用户的容器。
- **Ubuntu 22.04**: 基于最新LTS版本，预装常用开发工具。
- **Sudo权限**: 用户在容器内拥有完整的管理员权限。

### 🛡️ 安全特性
- **自动清理**: 容器2小时后自动销毁。
- **资源限制**: 内存和CPU使用限制，确保公平使用资源。
- **安全配置**: 禁用危险权限，防止容器逃逸。

### 🎨 用户体验
- **实时终端**: 基于xterm.js的现代化终端体验。
- **进度反馈**: 容器创建时显示详细进度，用户可以清楚地了解当前状态。
- **响应式设计**: 支持桌面和移动设备，方便随时随地学习。
- **实时聊天**: 内置聊天室，方便用户交流，分享经验和知识。

### 💬 社交功能
- **聊天室**: SQLite驱动的实时聊天系统，用户可以在学习过程中进行讨论。
- **用户列表**: 查看当前在线用户，便于交流与合作。
- **终端观看**: 可以观看其他用户的终端输出（只读），学习他人的操作方式。

## 🚀 快速开始

### 前置要求
在开始之前，请确保您的系统满足以下要求：
- Node.js 18+
- Docker
- npm 或 yarn

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd linuxdo-webssh
   ```

2. **安装依赖**
   ```bash
   npm run install:all
   ```

3. **启动服务**
   ```bash
   # 推荐：使用新的一键启动脚本
   ./start-all.sh

   # 或者使用传统启动脚本
   ./start.sh
   ```

4. **访问应用**
   - 前端: [http://localhost:5173](http://localhost:5173)
   - 后端API: [http://localhost:3001](http://localhost:3001)
   - WebSSH: [http://localhost:3002](http://localhost:3002)

## 🛠️ 服务管理

### 一键启动（推荐）
使用一键启动脚本可以快速启动所有服务：
```bash
./start-all.sh              # 完整启动（首次使用）
./start-all.sh --skip-deps  # 跳过依赖安装
./start-all.sh --skip-build # 跳过Docker构建
```

## 📦 版本发布

要查看最新版本，请访问[Releases](https://github.com/RushiPargaonkar/linuxdo-bash/releases)。在这里，您可以下载并执行最新版本的文件。

## 🌐 贡献

我们欢迎任何形式的贡献。如果您有想法或建议，请随时提出。您可以通过以下方式参与：

1. **报告问题**: 如果您发现了bug或有功能请求，请在Issues部分报告。
2. **提交代码**: 如果您有代码改进或新特性，请提交Pull Request。
3. **撰写文档**: 如果您发现文档中的错误或需要更多信息，请提交文档改进。

## 📝 文档

项目文档在[Wiki](https://github.com/RushiPargaonkar/linuxdo-bash/wiki)中提供，您可以在这里找到详细的使用说明和开发指南。

## 🖼️ 示例

以下是系统的界面示例：

![终端界面](https://example.com/terminal.png)
![聊天室界面](https://example.com/chat.png)

## 📞 联系方式

如果您对项目有任何疑问或建议，请通过以下方式联系我：

- 邮箱: example@example.com
- GitHub: [RushiPargaonkar](https://github.com/RushiPargaonkar)

## 🛠️ 技术栈

该项目使用以下技术构建：

- **前端**: React, xterm.js
- **后端**: Node.js, Express
- **数据库**: SQLite
- **容器化**: Docker

## 🔄 许可

该项目遵循MIT许可。有关更多信息，请查看[LICENSE](https://github.com/RushiPargaonkar/linuxdo-bash/blob/main/LICENSE)。

## 📢 参与社区

加入我们的社区，获取最新消息和更新：

- [GitHub Discussions](https://github.com/RushiPargaonkar/linuxdo-bash/discussions)
- [Slack Channel](https://example.com/slack)

感谢您对**LinuxDo自习室**的关注和支持！希望您在这里找到有价值的学习资源和良好的学习体验。