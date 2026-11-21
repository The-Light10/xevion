const models = [
    { id: "qwen2.5-coder:7b", provider: "ollama", label: "Qwen2.5 Coder 7B", context: 32768, toolCalling: true, local: true },
    { id: "qwen2.5-coder:3b", provider: "ollama", label: "Qwen2.5 Coder 3B", context: 32768, toolCalling: true, local: true },
    { id: "llama3.2:3b", provider: "ollama", label: "Llama 3.2 3B", context: 8192, toolCalling: true, local: true },
    { id: "phi3.5:3.8b", provider: "ollama", label: "Phi 3.5 mini", context: 128000, toolCalling: false, local: true },
    { id: "gpt-4o-mini", provider: "openai-compatible", label: "GPT-4o mini", context: 128000, toolCalling: true, local: false, priceIn: 0.15, priceOut: 0.6 },
    { id: "gpt-4.1-mini", provider: "openai-compatible", label: "GPT-4.1 mini", context: 1047576, toolCalling: true, local: false, priceIn: 0.4, priceOut: 1.6 },
    { id: "claude-3-5-haiku-latest", provider: "anthropic", label: "Claude 3.5 Haiku", context: 200000, toolCalling: true, local: false, priceIn: 0.8, priceOut: 4 },
    { id: "gemini-2.0-flash", provider: "google", label: "Gemini 2.0 Flash", context: 1048576, toolCalling: true, local: false, priceIn: 0.1, priceOut: 0.4 },
];
export function listModels() {
    return [...models];
}
export function findModel(id) {
    return models.find((model) => model.id === id);
}
export function estimateCost(modelId, inputTokens, outputTokens) {
    const model = findModel(modelId);
    if (!model || model.priceIn === undefined || model.priceOut === undefined)
        return 0;
    return (inputTokens / 1_000_000) * model.priceIn + (outputTokens / 1_000_000) * model.priceOut;
}
export function supportsToolCalling(modelId) {
    return findModel(modelId)?.toolCalling ?? true;
}
//# sourceMappingURL=registry.js.map