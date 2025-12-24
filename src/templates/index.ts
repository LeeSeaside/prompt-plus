import { Template } from '../types';
import * as fs from 'fs';
import * as path from 'path';

// 解析 Markdown Front Matter
function parseFrontMatter(content: string): { meta: Record<string, string>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { meta: {}, body: content };
  }

  const meta: Record<string, string> = {};
  const yamlContent = match[1];
  const body = match[2];

  yamlContent.split('\n').forEach((line) => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      meta[key] = value;
    }
  });

  return { meta, body };
}

// 从目录加载模板（支持 .md 和 .json）
export function loadTemplatesFromDir(dir: string): Template[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const templates: Template[] = [];
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);

    try {
      if (file.endsWith('.md') && file !== 'README.md') {
        const content = fs.readFileSync(filePath, 'utf-8');
        const { meta, body } = parseFrontMatter(content);

        if (meta.name) {
          templates.push({
            name: meta.name,
            description: meta.description || '',
            category: meta.category || 'other',
            outputFileName: meta.outputFileName || `${meta.name}-prompt.md`,
            content: body.trim(),
          });
        }
      } else if (file.endsWith('.json')) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const template = JSON.parse(content) as Template;
        templates.push(template);
      }
    } catch {
      // 忽略解析错误
    }
  }

  return templates;
}
