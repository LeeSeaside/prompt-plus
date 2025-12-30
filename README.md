# prompt-plus

AI 技能包管理工具 - 基于技能包驱动的开发工作流

> ⚠️ **v1.1.0 断档式更新**：不兼容旧版本，请重新安装

## 安装

```bash
npm install -g prompt-plus
```

## 快速开始

```bash
# 1. 添加技能包仓库
pp repo add official https://github.com/your-repo/skills.git

# 2. 同步仓库
pp repo sync

# 3. 查看可用技能包
pp skill list

# 4. 安装技能包到当前项目
pp skill install backend_api

# 5. 查看已安装的技能包
pp skill installed
```

## 命令列表

### 仓库管理

```bash
pp repo add <name> <url>     # 添加技能包仓库
pp repo add <name> <url> -b <branch>  # 指定分支
pp repo remove <name>        # 移除仓库
pp repo list                 # 列出所有仓库
pp repo sync                 # 同步所有仓库
pp repo sync <name>          # 同步指定仓库
```

### 技能包管理

```bash
pp skill list                # 列出所有可用技能包
pp skill list -r <repo>      # 列出指定仓库的技能包
pp skill install             # 交互式安装技能包
pp skill install <name>      # 安装指定技能包
pp skill installed           # 查看已安装的技能包
```

### 工作区管理

```bash
pp workspace init            # 初始化 AI 工作区
pp ws init                   # 简写
```

---

## 技能包仓库格式

如果你想创建自己的技能包仓库，请按以下格式组织：

```
your-repo/
└── skills/
    ├── backend_api/
    │   ├── manifest.md      # 执行流程和规范（必需）
    │   ├── context.md       # 项目配置模板（必需）
    │   ├── input/           # 输入文档目录
    │   │   └── .gitkeep
    │   ├── output/          # 输出文档目录
    │   │   └── .gitkeep
    │   └── tools/           # 提示词工具
    │       ├── init.md      # 初始化提示词
    │       └── dev.md       # 开发提示词
    ├── frontend_api/
    │   ├── manifest.md
    │   ├── context.md
    │   └── ...
    └── another_skill/
        └── ...
```

### manifest.md 格式

```markdown
# Skill Manifest: 技能名称

## 技能描述
简要说明这个技能包的用途。

## 执行协议
定义 AI 执行任务的步骤流程。

### 1. Context Check (上下文检查)
...

### 2. Input Acquisition (获取需求)
...

### 3. Code Generation (代码生成)
...

### 4. Documentation Output (文档输出)
...

## 约束条件
- 约束 1
- 约束 2
```

### context.md 格式

```markdown
# Project Context Configuration

> ⚠️ 此文件需要初始化

## Tech Stack
- **Framework**: <!-- 待填充 -->
- **ORM**: <!-- 待填充 -->

## Directory Mapping
- **Controller Path**: <!-- 待填充 -->
- **Service Path**: <!-- 待填充 -->

## Code Style
- **Naming Convention**: <!-- 待填充 -->
```

### tools/init.md 格式

```markdown
# 技能名 - 初始化提示词

## 使用方法
复制以下内容发送给 AI

---

\`\`\`
请执行 xxx 技能初始化：
1. 扫描项目结构
2. 识别技术栈
3. 将结果写入 context.md
\`\`\`
```

---

## 安装后的项目结构

```
your-project/
├── .ai-workspace/
│   ├── RULES.md             # AI 工作流规则
│   └── skills/
│       ├── backend_api/
│       │   ├── manifest.md
│       │   ├── context.md   # 需要初始化
│       │   ├── input/
│       │   ├── output/
│       │   └── tools/
│       └── frontend_api/
│           └── ...
└── (你的项目源码)
```

## 使用流程

1. **安装技能包**：`pp skill install backend_api`
2. **初始化配置**：查看 `tools/init.md`，复制提示词发送给 AI
3. **AI 扫描项目**：AI 会分析项目并填充 `context.md`
4. **开始开发**：将需求文档放入 `input/`，使用 `tools/dev.md` 的提示词

## License

MIT
