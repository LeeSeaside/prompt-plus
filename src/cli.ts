#!/usr/bin/env node
import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import {
  addRepo,
  removeRepo,
  listRepos,
  syncRepo,
  listSkills,
  installSkill,
  initWorkspace,
  installedSkills,
} from './commands';

// 读取版本号
const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

const program = new Command();

program
  .name('prompt-plus')
  .description('AI 技能包管理工具 - 基于技能包驱动的开发工作流')
  .version(pkg.version);

// 仓库管理
program
  .command('repo')
  .description('管理技能包仓库')
  .addCommand(
    new Command('add')
      .description('添加技能包仓库')
      .argument('<name>', '仓库名称')
      .argument('<url>', '仓库地址')
      .option('-b, --branch <branch>', '分支名称', 'main')
      .action(addRepo)
  )
  .addCommand(
    new Command('remove')
      .alias('rm')
      .description('移除仓库')
      .argument('<name>', '仓库名称')
      .action(removeRepo)
  )
  .addCommand(
    new Command('list')
      .alias('ls')
      .description('列出所有仓库')
      .action(listRepos)
  )
  .addCommand(
    new Command('sync')
      .description('同步仓库')
      .argument('[name]', '仓库名称（不指定则同步所有）')
      .action(syncRepo)
  );

// 技能包管理
program
  .command('skill')
  .description('管理技能包')
  .addCommand(
    new Command('list')
      .alias('ls')
      .description('列出所有可用技能包')
      .option('-r, --repo <name>', '指定仓库名称')
      .action(listSkills)
  )
  .addCommand(
    new Command('install')
      .alias('i')
      .description('安装技能包到当前项目')
      .argument('[skillName]', '技能包名称')
      .option('-r, --repo <name>', '指定仓库名称')
      .option('-o, --output <path>', '输出路径', '.ai-workspace')
      .action(installSkill)
  )
  .addCommand(
    new Command('installed')
      .description('查看已安装的技能包')
      .option('-o, --output <path>', '工作区路径', '.ai-workspace')
      .action(installedSkills)
  );

// 工作区管理
program
  .command('workspace')
  .alias('ws')
  .description('管理 AI 工作区')
  .addCommand(
    new Command('init')
      .description('初始化 AI 工作区')
      .option('-o, --output <path>', '输出路径', '.ai-workspace')
      .action(initWorkspace)
  );

program.parse();
