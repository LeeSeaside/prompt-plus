import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { loadSkillsFromDir, copySkill } from './skills';
import { PromptPlusConfig, Skill } from './types';

// 配置文件路径（全局配置）
const getGlobalConfigDir = () =>
  path.join(process.env.HOME || process.env.USERPROFILE || '', '.prompt-plus');
const getGlobalConfigPath = () => path.join(getGlobalConfigDir(), 'config.json');
const getReposDir = () => path.join(getGlobalConfigDir(), 'repos');

// 动态导入 ESM 模块
async function getChalk() {
  return (await import('chalk')).default;
}

async function getInquirer() {
  return (await import('inquirer')).default;
}

// 获取全局配置
function getConfig(): PromptPlusConfig {
  const configPath = getGlobalConfigPath();
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
  return {
    defaultRepo: '',
    repos: [],
    outputDir: '.ai-workspace',
  };
}

// 保存全局配置
function saveConfig(config: PromptPlusConfig) {
  const configDir = getGlobalConfigDir();
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  fs.writeFileSync(getGlobalConfigPath(), JSON.stringify(config, null, 2), 'utf-8');
}

// ==================== 仓库管理 ====================

export async function addRepo(name: string, url: string, options?: { branch?: string }) {
  const chalk = await getChalk();
  const config = getConfig();

  if (config.repos.find((r) => r.name === name)) {
    console.log(chalk.yellow(`\n⚠️  仓库 "${name}" 已存在\n`));
    return;
  }

  config.repos.push({
    name,
    url,
    branch: options?.branch || 'main',
  });

  saveConfig(config);
  console.log(chalk.green(`\n✅ 已添加仓库: ${name}`));
  console.log(chalk.gray(`使用 "pp repo sync ${name}" 同步仓库\n`));
}

export async function removeRepo(name: string) {
  const chalk = await getChalk();
  const config = getConfig();

  const index = config.repos.findIndex((r) => r.name === name);
  if (index === -1) {
    console.log(chalk.red(`\n❌ 未找到仓库: ${name}\n`));
    return;
  }

  config.repos.splice(index, 1);
  saveConfig(config);

  // 删除本地仓库目录
  const repoDir = path.join(getReposDir(), name);
  if (fs.existsSync(repoDir)) {
    fs.rmSync(repoDir, { recursive: true, force: true });
  }

  console.log(chalk.green(`\n✅ 已移除仓库: ${name}\n`));
}

export async function listRepos() {
  const chalk = await getChalk();
  const config = getConfig();

  console.log(chalk.cyan('\n📦 技能包仓库列表:\n'));

  if (config.repos.length === 0) {
    console.log(chalk.gray('  暂无仓库，请先添加:'));
    console.log(chalk.gray('  pp repo add official https://github.com/your-repo/skills.git\n'));
    return;
  }

  for (const repo of config.repos) {
    const repoDir = path.join(getReposDir(), repo.name);
    const synced = fs.existsSync(repoDir);
    const status = synced ? chalk.green('✓ 已同步') : chalk.yellow('未同步');

    // 检查技能包数量
    let skillCount = 0;
    if (synced) {
      const skillsDir = path.join(repoDir, 'skills');
      if (fs.existsSync(skillsDir)) {
        skillCount = loadSkillsFromDir(skillsDir).length;
      }
    }

    console.log(
      chalk.white(`  • ${repo.name}`),
      chalk.gray(`- ${repo.url}`),
      status,
      synced ? chalk.gray(`(${skillCount} 个技能包)`) : ''
    );
  }

  console.log(chalk.gray('\n使用 "pp repo add <name> <url>" 添加仓库'));
  console.log(chalk.gray('使用 "pp repo sync [name]" 同步仓库\n'));
}

export async function syncRepo(name?: string) {
  const chalk = await getChalk();
  const config = getConfig();

  const reposDir = getReposDir();
  if (!fs.existsSync(reposDir)) {
    fs.mkdirSync(reposDir, { recursive: true });
  }

  const reposToSync = name ? config.repos.filter((r) => r.name === name) : config.repos;

  if (reposToSync.length === 0) {
    if (name) {
      console.log(chalk.red(`\n❌ 未找到仓库: ${name}\n`));
    } else {
      console.log(chalk.yellow('\n⚠️  没有配置任何仓库'));
      console.log(chalk.gray('使用 "pp repo add <name> <url>" 添加仓库\n'));
    }
    return;
  }

  for (const repo of reposToSync) {
    const repoDir = path.join(reposDir, repo.name);
    console.log(chalk.cyan(`\n🔄 同步仓库: ${repo.name}...`));

    try {
      if (fs.existsSync(repoDir)) {
        execSync(`git -C "${repoDir}" pull origin ${repo.branch || 'main'}`, { stdio: 'pipe' });
        console.log(chalk.green(`✅ 已更新: ${repo.name}`));
      } else {
        execSync(`git clone -b ${repo.branch || 'main'} "${repo.url}" "${repoDir}"`, { stdio: 'pipe' });
        console.log(chalk.green(`✅ 已克隆: ${repo.name}`));
      }

      // 显示技能包数量
      const skillsDir = path.join(repoDir, 'skills');
      if (fs.existsSync(skillsDir)) {
        const skills = loadSkillsFromDir(skillsDir);
        console.log(chalk.gray(`   发现 ${skills.length} 个技能包`));
      }
    } catch (error) {
      console.log(chalk.red(`❌ 同步失败: ${repo.name}`));
      console.log(chalk.gray(`   ${(error as Error).message}`));
    }
  }

  console.log();
}

// ==================== 技能包管理 ====================

// 带仓库信息的技能
interface SkillWithRepo extends Skill {
  repoName: string;
}

// 获取所有技能包（按仓库分组）
async function getAllSkillsWithRepo(repoName?: string): Promise<SkillWithRepo[]> {
  const config = getConfig();
  const skills: SkillWithRepo[] = [];

  if (repoName) {
    const repo = config.repos.find((r) => r.name === repoName);
    if (repo) {
      const repoDir = path.join(getReposDir(), repo.name);
      if (fs.existsSync(repoDir)) {
        const repoSkills = loadSkillsFromDir(path.join(repoDir, 'skills'));
        return repoSkills.map((s) => ({ ...s, repoName: repo.name }));
      }
    }
    return [];
  }

  for (const repo of config.repos) {
    const repoDir = path.join(getReposDir(), repo.name);
    if (fs.existsSync(repoDir)) {
      const repoSkills = loadSkillsFromDir(path.join(repoDir, 'skills'));
      skills.push(...repoSkills.map((s) => ({ ...s, repoName: repo.name })));
    }
  }
  return skills;
}

// 列出所有技能包
export async function listSkills(options?: { repo?: string }) {
  const chalk = await getChalk();
  const skills = await getAllSkillsWithRepo(options?.repo);

  if (skills.length === 0) {
    console.log(chalk.yellow('\n⚠️  没有找到技能包'));
    console.log(chalk.gray('请先添加并同步仓库:'));
    console.log(chalk.gray('  pp repo add official <仓库地址>'));
    console.log(chalk.gray('  pp repo sync\n'));
    return;
  }

  console.log(chalk.cyan('\n🎯 可用的技能包:\n'));

  const repoNames = [...new Set(skills.map((s) => s.repoName))];

  for (const repoName of repoNames) {
    console.log(chalk.magenta(`📦 ${repoName}`));
    const repoSkills = skills.filter((s) => s.repoName === repoName);

    for (const skill of repoSkills) {
      const status = [];
      if (skill.hasManifest) status.push(chalk.green('✓manifest'));
      if (skill.hasContext) status.push(chalk.green('✓context'));
      if (skill.hasTools) status.push(chalk.green('✓tools'));

      console.log(
        chalk.white(`  • ${skill.name}`),
        chalk.gray(`- ${skill.description || '无描述'}`),
        chalk.gray(`[${status.join(' ')}]`)
      );
    }
    console.log();
  }

  console.log(chalk.gray('使用 "pp skill install <技能名>" 安装技能包到当前项目\n'));
}

// 安装技能包到当前项目
export async function installSkill(skillName?: string, options?: { repo?: string; output?: string }) {
  const chalk = await getChalk();
  const inquirer = await getInquirer();
  const skills = await getAllSkillsWithRepo(options?.repo);

  let selectedSkill: SkillWithRepo | undefined;

  if (skillName) {
    selectedSkill = skills.find((s) => s.name === skillName);
    if (!selectedSkill) {
      console.log(chalk.red(`\n❌ 未找到技能包: ${skillName}`));
      console.log(chalk.gray('使用 "pp skill list" 查看可用技能包\n'));
      return;
    }
  } else {
    if (skills.length === 0) {
      console.log(chalk.yellow('\n⚠️  没有可用技能包'));
      console.log(chalk.gray('请先添加并同步仓库\n'));
      return;
    }

    const choices = skills.map((s) => ({
      name: `[${s.repoName}] ${s.name} - ${s.description || '无描述'}`,
      value: s.name,
    }));

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'skill',
        message: '请选择要安装的技能包:',
        choices,
      },
    ]);

    selectedSkill = skills.find((s) => s.name === answer.skill);
  }

  if (!selectedSkill) {
    console.log(chalk.red('\n❌ 技能包选择失败'));
    return;
  }

  const baseDir = options?.output || '.ai-workspace';
  const targetDir = path.join(process.cwd(), baseDir, 'skills', selectedSkill.name);

  // 检查是否已安装
  if (fs.existsSync(targetDir)) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `技能包 "${selectedSkill.name}" 已存在，是否覆盖？`,
        default: false,
      },
    ]);

    if (!overwrite) {
      console.log(chalk.yellow('\n⚠️  已取消安装\n'));
      return;
    }

    fs.rmSync(targetDir, { recursive: true, force: true });
  }

  // 复制技能包
  copySkill(selectedSkill.path, targetDir);

  // 确保 RULES.md 存在
  const rulesPath = path.join(process.cwd(), baseDir, 'RULES.md');
  if (!fs.existsSync(rulesPath)) {
    await initWorkspace({ output: baseDir });
  }

  console.log(chalk.green(`\n✅ 技能包已安装: ${targetDir}`));
  console.log(chalk.cyan('\n📝 下一步:'));
  console.log(chalk.white(`  1. 查看 ${baseDir}/skills/${selectedSkill.name}/tools/init.md`));
  console.log(chalk.white('  2. 复制初始化提示词发送给 AI'));
  console.log(chalk.white('  3. AI 会扫描项目并填充 context.md\n'));
}

// 初始化 AI 工作区
export async function initWorkspace(options?: { output?: string }) {
  const chalk = await getChalk();
  const baseDir = options?.output || '.ai-workspace';
  const workspaceDir = path.join(process.cwd(), baseDir);
  const rulesPath = path.join(workspaceDir, 'RULES.md');

  if (fs.existsSync(rulesPath)) {
    console.log(chalk.yellow('\n⚠️  AI 工作区已存在'));
    console.log(chalk.gray(`路径: ${workspaceDir}\n`));
    return;
  }

  // 创建目录结构
  fs.mkdirSync(path.join(workspaceDir, 'skills'), { recursive: true });

  // 创建 RULES.md
  const rulesContent = `# AI WORKSPACE - SYSTEM PROTOCOL

> 此文件定义 AI 助手的强制性工作流规则，适用于所有 AI 编辑器（Cursor、Copilot、Kiro、Claude 等）

## PRIORITY: ABSOLUTE (最高优先级)

你是一个基于"技能包"驱动的开发助手。在处理任何开发任务之前，必须强制执行以下协议。

## SKILL DISCOVERY

**动态发现技能**：扫描 \`.ai-workspace/skills/\` 目录，每个子目录即为一个技能包。

## SKILL STRUCTURE

每个技能包的标准结构：
\`\`\`
skills/[skill_name]/
├── manifest.md    # 执行流程和规范（必读）
├── context.md     # 项目配置（需初始化）
├── input/         # 该技能的输入文档
├── output/        # 该技能的输出文档
└── tools/         # 该技能的提示词工具
\`\`\`

## MANDATORY WORKFLOW

### 1. Skill Discovery (技能发现)
- 扫描 \`skills/\` 目录，列出所有可用技能
- 读取每个技能的 \`manifest.md\` 了解其用途

### 2. Skill Selection (技能选择)
- 根据用户任务类型，选择对应的技能包
- 如果不确定，询问用户或列出可用技能供选择

### 3. Load Skill (加载技能)
- 读取 \`skills/[skill]/manifest.md\` 获取执行流程
- 读取 \`skills/[skill]/context.md\` 获取项目配置

### 4. Context Check (上下文检查)
- 如果 \`context.md\` 未初始化，**终止任务**
- 提示用户："请先执行项目初始化，参考 \`skills/[skill]/tools/init.md\`"

### 5. Input Acquisition (获取输入)
- 从 \`skills/[skill]/input/\` 读取需求文档

### 6. Execute Task (执行任务)
- 按照 \`manifest.md\` 定义的流程执行
- 代码输出到项目源码目录（由 context.md 指定）

### 7. Output Documentation (输出文档)
- 执行日志输出到 \`skills/[skill]/output/\`

## CONSTRAINTS

- 严格遵循所选技能的 manifest.md 流程
- 代码路径受控于 context.md
- 禁止跨技能读写 input/output
- 禁止臆造依赖库或目录
- 新技能自动可用，无需修改此文件
`;

  fs.writeFileSync(rulesPath, rulesContent, 'utf-8');

  console.log(chalk.green('\n✅ AI 工作区已创建'));
  console.log(chalk.gray(`路径: ${workspaceDir}`));
  console.log(chalk.cyan('\n📝 下一步:'));
  console.log(chalk.gray('  pp skill list          # 查看可用技能包'));
  console.log(chalk.gray('  pp skill install       # 安装技能包\n'));
}

// 查看已安装的技能包
export async function installedSkills(options?: { output?: string }) {
  const chalk = await getChalk();
  const baseDir = options?.output || '.ai-workspace';
  const skillsDir = path.join(process.cwd(), baseDir, 'skills');

  if (!fs.existsSync(skillsDir)) {
    console.log(chalk.yellow('\n⚠️  未找到 AI 工作区'));
    console.log(chalk.gray('使用 "pp workspace init" 初始化工作区\n'));
    return;
  }

  const skills = loadSkillsFromDir(skillsDir);

  if (skills.length === 0) {
    console.log(chalk.yellow('\n⚠️  未安装任何技能包'));
    console.log(chalk.gray('使用 "pp skill install" 安装技能包\n'));
    return;
  }

  console.log(chalk.cyan('\n🎯 已安装的技能包:\n'));

  for (const skill of skills) {
    const status = [];
    if (skill.hasManifest) status.push(chalk.green('✓manifest'));
    if (skill.hasContext) status.push(chalk.green('✓context'));
    if (skill.hasTools) status.push(chalk.green('✓tools'));

    console.log(
      chalk.white(`  • ${skill.name}`),
      chalk.gray(`- ${skill.description || '无描述'}`),
      chalk.gray(`[${status.join(' ')}]`)
    );
  }

  console.log(chalk.gray(`\n📁 位置: ${skillsDir}\n`));
}
