# prompt-plus

AI 提示词模板管理工具 - 生成符合项目规范的提示词

## 安装

```bash
npm install -g prompt-plus
```

## 快速开始

```bash
# 1. 添加官方模板仓库
prompt-plus repo add official https://github.com/LeeSeaside/prompt-plus-templates.git

# 2. 同步模板
prompt-plus repo sync

# 3. 查看可用模板
prompt-plus list

# 4. 使用模板
prompt-plus use backend-api
```

## 命令

### 模板操作

```bash
# 列出所有模板
prompt-plus list
prompt-plus ls

# 使用模板（交互式选择）
prompt-plus use

# 使用指定模板
prompt-plus use <模板名>

# 指定输出目录
prompt-plus use <模板名> -o ./my-prompts
```

### 仓库管理

```bash
# 查看仓库列表
prompt-plus repo ls

# 添加仓库
prompt-plus repo add <名称> <Git地址>
prompt-plus repo add official https://github.com/LeeSeaside/prompt-plus-templates.git

# 添加私有仓库（指定分支）
prompt-plus repo add company git@github.com:company/prompts.git -b develop

# 同步仓库
prompt-plus repo sync          # 同步所有
prompt-plus repo sync official # 同步指定仓库

# 移除仓库
prompt-plus repo rm <名称>
```

## 自建模板仓库

创建 Git 仓库，在 `templates/` 目录下放置 Markdown 模板文件：

```
my-templates/
└── templates/
    ├── my-template-1.md
    └── my-template-2.md
```

模板格式（Markdown + Front Matter）：

```markdown
---
name: my-template
description: 模板描述
category: backend
outputFileName: my-template-prompt.md
---

# 模板标题

## 任务
模板内容...
```

## 工作流程

```
模板 → 正式提示词 → 对接文档/代码

.prompts/
├── templates/     # 提示词模板
└── generated/     # 正式提示词（AI 生成）

docs/
└── api/           # 对接文档（业务相关）
```

## 本地开发

```bash
npm install
npm run build
npm link
prompt-plus list
```

## License

MIT
