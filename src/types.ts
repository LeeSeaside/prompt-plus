export interface Template {
  name: string;
  description: string;
  category: string;
  content: string;
  outputFileName: string;
}

export interface RepoConfig {
  name: string;
  url: string;
  branch?: string;
}

export interface PromptPlusConfig {
  defaultRepo: string;
  repos: RepoConfig[];
  outputDir: string;
}
