#!/usr/bin/env node
import { Command } from 'commander';
import {
  listTemplates,
  useTemplate,
  initConfig,
  addRepo,
  removeRepo,
  listRepos,
  syncRepo,
} from './commands';

const program = new Command();

program
  .name('prompt-plus')
  .description('AI提示词模板管理工具 - 生成符合项目规范的提示词')
  .version('1.0.0');

program
  .command('list')
  .alias('ls')
  .description('列出所有可用的提示词模板')
  .option('-r, --repo <name>', '指定仓库名称')
  .action(listTemplates);

program
  .command('use [templateName]')
  .description('选择并使用模板生成提示词')
  .option('-o, --output <path>', '输出路径', '.prompts')
  .option('-r, --repo <name>', '指定仓库名称')
  .action(useTemplate);

program
  .command('init')
  .description('初始化配置文件')
  .action(initConfig);

program
  .command('repo')
  .description('管理模板仓库')
  .addCommand(
    new Command('add')
      .description('添加模板仓库')
      .argument('<name>', '仓库名称')
      .argument('<url>', '仓库地址')
      .option('-b, --branch <branch>', '分支名称', 'main')
      .action(addRepo)
  )
  .addCommand(
    new Command('remove')
      .alias('rm')
      .description('移除模板仓库')
      .argument('<name>', '仓库名称')
      .action(removeRepo)
  )
  .addCommand(
    new Command('list')
      .alias('ls')
      .description('列出所有模板仓库')
      .action(listRepos)
  )
  .addCommand(
    new Command('sync')
      .description('同步模板仓库')
      .argument('[name]', '仓库名称（不指定则同步所有）')
      .action(syncRepo)
  );

program.parse();
