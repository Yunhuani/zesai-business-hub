export const ADVISOR_SUGGESTED_PROMPTS = [
  "公司业绩上不去，怎么突破",
  "团队执行力差，该怎么办",
  "获客难，该怎么办",
  "创业融资，怎么写商业计划书",
  "创业合伙，怎么分配股权",
  "老业务增长见顶，怎么找新赛道",
] as const;

export function shouldShowAdvisorSuggestions(messages: Array<{ role: string }> | undefined) {
  return !messages?.some(message => message.role === "user");
}

export function buildDocumentAnalysisPrompt(filename: string, extractedText: string) {
  const textLimit = 3000;
  const boundedText = extractedText.slice(0, textLimit);
  const suffix = extractedText.length > textLimit ? "\n\n（内容过长，已截断）" : "";
  return `我上传了一份文档：${filename}\n\n文档内容：\n${boundedText}${suffix}`;
}
