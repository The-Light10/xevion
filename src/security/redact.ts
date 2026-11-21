const PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\b(?:sk-ant-|sk-proj-|sk-live-|sk-)[A-Za-z0-9_\-]{12,}/g, label: "api_key" },
  { re: /\bAIza[0-9A-Za-z_\-]{30,}/g, label: "api_key" },
  { re: /\bgh[pousr]_[A-Za-z0-9]{20,}/g, label: "token" },
  { re: /\bxox[baprs]-[A-Za-z0-9-]{10,}/g, label: "token" },
  { re: /\bAKIA[0-9A-Z]{16}\b/g, label: "access_key" },
  { re: /-----BEGIN (?:RSA|OPENSSH|EC|DSA)? ?PRIVATE KEY-----[\s\S]*?-----END (?:RSA|OPENSSH|EC|DSA)? ?PRIVATE KEY-----/g, label: "private_key" },
];

function environmentSecrets(): string[] {
  const keys = ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "GOOGLE_API_KEY", "GEMINI_API_KEY", "OPENROUTER_API_KEY", "GROQ_API_KEY"];
  const values: string[] = [];
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.length >= 8) values.push(value);
  }
  return values;
}

export function redact(input: string): string {
  let output = input;
  for (const value of environmentSecrets()) {
    output = output.split(value).join("[REDACTED]");
  }
  for (const { re, label } of PATTERNS) {
    output = output.replace(re, `[REDACTED:${label}]`);
  }
  return output;
}

export function redactUnknown(value: unknown): string {
  return redact(typeof value === "string" ? value : JSON.stringify(value, null, 2) ?? String(value));
}
