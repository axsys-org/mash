/** Small lexical colorizer; source remains text and is never interpreted as markup. */
export function sourceTokens(
  source: string,
): { kind: "plain" | "comment" | "string" | "keyword" | "number"; text: string }[] {
  const pattern =
    /(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->)|(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|\b(?:const|let|var|function|return|if|else|for|while|class|extends|import|from|export|default|async|await|new|type|interface|true|false|null|undefined|throw|try|catch|public|private|readonly|static)\b|\b\d+(?:\.\d+)?\b/g;
  const result: ReturnType<typeof sourceTokens> = [];
  let offset = 0;
  for (const match of source.matchAll(pattern)) {
    if (match.index > offset)
      result.push({ kind: "plain", text: source.slice(offset, match.index) });
    const text = match[0];
    const kind = /^(\/\/|\/\*|<!--)/.test(text)
      ? "comment"
      : /^["'`]/.test(text)
        ? "string"
        : /^\d/.test(text)
          ? "number"
          : "keyword";
    result.push({ kind, text });
    offset = match.index + text.length;
  }
  if (offset < source.length) result.push({ kind: "plain", text: source.slice(offset) });
  return result;
}
