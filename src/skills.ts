import * as fs from 'fs';
import * as path from 'path';
import { Skill, SkillMeta } from './types';

// 从 manifest.md 解析技能元数据
function parseSkillMeta(manifestPath: string): SkillMeta | null {
  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  const content = fs.readFileSync(manifestPath, 'utf-8');
  const lines = content.split('\n');

  // 解析标题作为名称
  const titleMatch = content.match(/^#\s+(?:Skill Manifest:\s*)?(.+)/m);
  const name = titleMatch ? titleMatch[1].trim() : '';

  // 解析描述（## 技能描述 或 ## 核心职责 下的内容）
  let description = '';
  const descMatch = content.match(/##\s*(?:技能描述|核心职责)\s*\n([^\n#]+)/);
  if (descMatch) {
    description = descMatch[1].trim();
  }

  // 解析分类（如果有）
  let category = 'general';
  const categoryMatch = content.match(/category:\s*(\w+)/i);
  if (categoryMatch) {
    category = categoryMatch[1];
  }

  return { name, description, category };
}

// 从目录加载技能包
export function loadSkillsFromDir(skillsDir: string): Skill[] {
  if (!fs.existsSync(skillsDir)) {
    return [];
  }

  const skills: Skill[] = [];
  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillPath = path.join(skillsDir, entry.name);
    const manifestPath = path.join(skillPath, 'manifest.md');
    const contextPath = path.join(skillPath, 'context.md');
    const toolsPath = path.join(skillPath, 'tools');

    const meta = parseSkillMeta(manifestPath);

    skills.push({
      name: entry.name,
      description: meta?.description || '',
      category: meta?.category || 'general',
      path: skillPath,
      hasManifest: fs.existsSync(manifestPath),
      hasContext: fs.existsSync(contextPath),
      hasTools: fs.existsSync(toolsPath),
    });
  }

  return skills;
}

// 复制技能包到目标目录
export function copySkill(skillPath: string, targetDir: string): void {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  copyDirRecursive(skillPath, targetDir);
}

// 递归复制目录
function copyDirRecursive(src: string, dest: string): void {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
