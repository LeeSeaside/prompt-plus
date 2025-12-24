import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { loadTemplatesFromDir } from './templates';
import { PromptPlusConfig, Template } from './types';

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
    outputDir: '.prompts',
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

// 带仓库信息的模板
interface TemplateWithRepo extends Template {
  repoName: string;
}

// 获取所有模板（按仓库分组）
async function getAllTemplatesWithRepo(repoName?: string): Promise<TemplateWithRepo[]> {
  const config = getConfig();
  const templates: TemplateWithRepo[] = [];

  // 指定了具体仓库
  if (repoName) {
    const repo = config.repos.find((r) => r.name === repoName);
    if (repo) {
      const repoDir = path.join(getReposDir(), repo.name);
      if (fs.existsSync(repoDir)) {
        const repoTemplates = loadTemplatesFromDir(path.join(repoDir, 'templates'));
        return repoTemplates.map((t) => ({ ...t, repoName: repo.name }));
      }
    }
    return [];
  }

  // 未指定仓库：合并所有已同步仓库模板
  for (const repo of config.repos) {
    const repoDir = path.join(getReposDir(), repo.name);
    if (fs.existsSync(repoDir)) {
      const repoTemplates = loadTemplatesFromDir(path.join(repoDir, 'templates'));
      templates.push(...repoTemplates.map((t) => ({ ...t, repoName: repo.name })));
    }
  }
  return templates;
}

export async function listTemplates(options?: { repo?: string }) {
  const chalk = await getChalk();
  const templates = await getAllTemplatesWithRepo(options?.repo);

  if (templates.length === 0) {
    console.log(chalk.yellow('\n⚠️  没有找到模板'));
    console.log(chalk.gray('请先添加并同步模板仓库:'));
    console.log(chalk.gray('  prompt-plus repo add official https://github.com/LeeSeaside/prompt-plus-templates.git'));
    console.log(chalk.gray('  prompt-plus repo sync\n'));
    return;
  }

  console.log(chalk.cyan('\n📋 可用的提示词模板:\n'));

  // 按仓库分组
  const repoNames = [...new Set(templates.map((t) => t.repoName))];

  for (const repoName of repoNames) {
    console.log(chalk.magenta(`📦 ${repoName}`));
    const repoTemplates = templates.filter((t) => t.repoName === repoName);

    // 按分类分组
    const categories = [...new Set(repoTemplates.map((t) => t.category))];
    for (const category of categories) {
      console.log(chalk.yellow(`  [${category}]`));
      const categoryTemplates = repoTemplates.filter((t) => t.category === category);
      for (const template of categoryTemplates) {
        console.log(chalk.white(`    • ${template.name}`), chalk.gray(`- ${template.description}`));
      }
    }
    console.log();
  }

  console.log(chalk.gray('使用 "prompt-plus use <模板名>" 或 "prompt-plus use" 交互式选择\n'));
}

export async function useTemplate(templateName?: string, options?: { output?: string; repo?: string }) {
  const chalk = await getChalk();
  const inquirer = await getInquirer();
  const templates = await getAllTemplatesWithRepo(options?.repo);

  let selectedTemplate: TemplateWithRepo | undefined;

  if (templateName) {
    selectedTemplate = templates.find((t) => t.name === templateName);
    if (!selectedTemplate) {
      console.log(chalk.red(`\n❌ 未找到模板: ${templateName}`));
      console.log(chalk.gray('使用 "prompt-plus list" 查看可用模板\n'));
      return;
    }
  } else {
    if (templates.length === 0) {
      console.log(chalk.yellow('\n⚠️  没有可用模板'));
      console.log(chalk.gray('请先添加并同步模板仓库\n'));
      return;
    }

    const choices = templates.map((t) => ({
      name: `[${t.repoName}] ${t.name} - ${t.description}`,
      value: t.name,
    }));

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'template',
        message: '请选择要使用的模板:',
        choices,
      },
    ]);

    selectedTemplate = templates.find((t) => t.name === answer.template);
  }

  if (!selectedTemplate) {
    console.log(chalk.red('\n❌ 模板选择失败'));
    return;
  }

  const baseDir = options?.output || '.prompts';
  const templatesDir = path.join(process.cwd(), baseDir, 'templates');
  const generatedDir = path.join(process.cwd(), baseDir, 'generated');

  if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir, { recursive: true });
  }
  if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true });
  }

  const filePath = path.join(templatesDir, selectedTemplate.outputFileName);
  fs.writeFileSync(filePath, selectedTemplate.content, 'utf-8');

  console.log(chalk.green(`\n✅ 模板已生成: ${filePath}`));
  console.log(chalk.cyan('\n📝 使用方法:'));
  console.log(chalk.white('  1. 打开生成的提示词文件'));
  console.log(chalk.white('  2. 复制内容到AI编辑器（Cursor/Trae等）'));
  console.log(chalk.white('  3. AI会分析你的项目并生成具体的开发提示词'));
  console.log(chalk.white(`  4. 将AI生成的正式提示词保存到: ${chalk.yellow(baseDir + '/generated/')}`));
  console.log(chalk.white('  5. 使用正式提示词进行实际开发\n'));
  console.log(chalk.gray(`📁 目录结构:`));
  console.log(chalk.gray(`   ${baseDir}/`));
  console.log(chalk.gray(`   ├── templates/     # 提示词模板`));
  console.log(chalk.gray(`   └── generated/     # 正式提示词\n`));
}

export async function initConfig() {
  const chalk = await getChalk();
  const configPath = getGlobalConfigPath();

  if (fs.existsSync(configPath)) {
    console.log(chalk.yellow('\n⚠️  配置文件已存在'));
    console.log(chalk.gray(`路径: ${configPath}\n`));
    return;
  }

  const defaultConfig: PromptPlusConfig = {
    defaultRepo: '',
    repos: [],
    outputDir: '.prompts',
  };

  saveConfig(defaultConfig);
  console.log(chalk.green('\n✅ 配置文件已创建'));
  console.log(chalk.gray(`路径: ${configPath}`));
  console.log(chalk.gray('\n下一步: 添加模板仓库'));
  console.log(chalk.gray('  prompt-plus repo add official https://github.com/LeeSeaside/prompt-plus-templates.git\n'));
}

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
  console.log(chalk.gray(`使用 "prompt-plus repo sync ${name}" 同步模板\n`));
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

  console.log(chalk.cyan('\n📦 模板仓库列表:\n'));

  if (config.repos.length === 0) {
    console.log(chalk.gray('  暂无仓库，请先添加:'));
    console.log(chalk.gray('  prompt-plus repo add official https://github.com/LeeSeaside/prompt-plus-templates.git\n'));
    return;
  }

  for (const repo of config.repos) {
    const synced = fs.existsSync(path.join(getReposDir(), repo.name));
    const status = synced ? chalk.green('✓ 已同步') : chalk.yellow('未同步');
    console.log(chalk.white(`  • ${repo.name}`), chalk.gray(`- ${repo.url}`), status);
  }

  console.log(chalk.gray('\n使用 "prompt-plus repo add <name> <url>" 添加仓库'));
  console.log(chalk.gray('使用 "prompt-plus repo sync [name]" 同步仓库\n'));
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
      console.log(chalk.gray('使用 "prompt-plus repo add <name> <url>" 添加仓库\n'));
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
    } catch (error) {
      console.log(chalk.red(`❌ 同步失败: ${repo.name}`));
      console.log(chalk.gray(`   ${(error as Error).message}`));
    }
  }

  console.log();
}
