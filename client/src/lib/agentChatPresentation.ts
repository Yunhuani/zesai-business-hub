export const ADVISOR_SUGGESTED_PROMPTS = [
  "我的获客成本越来越高，应该先排查什么？",
  "公司增长停滞，问题可能出在哪里？",
  "两个合伙人股权怎么分更合理？",
  "团队执行力差，应该先改组织还是目标？",
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
