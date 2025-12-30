// 技能包定义
export interface Skill {
  name: string;
  description: string;
  category: string;
  path: string; // 技能包在仓库中的路径
  hasManifest: boolean;
  hasContext: boolean;
  hasTools: boolean;
}

// 仓库配置
export interface RepoConfig {
  name: string;
  url: string;
  branch: string;
}

// 全局配置
export interface PromptPlusConfig {
  defaultRepo: string;
  repos: RepoConfig[];
  outputDir: string;
}

// 技能包元数据（从 manifest.md 解析）
export interface SkillMeta {
  name: string;
  description: string;
  category?: string;
}
