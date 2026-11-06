/** 环境配置。与 Python 侧的智谱配置保持同源,部署时两边用同一组 key。 */

function required(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required env var: ${name}`);
    }
    return value;
}

export const config = {
    zhipuApiKey: () => required("ZHIPU_API_KEY"),
    zhipuBaseUrl: process.env.ZHIPU_BASE_URL ?? "https://open.bigmodel.cn/api/paas/v4",
    zhipuChatModel: process.env.ZHIPU_CHAT_MODEL ?? "glm-4-flash",
    javaBackendUrl: process.env.JAVA_BACKEND_URL ?? "http://localhost:8080",
    pythonRagUrl: process.env.PYTHON_RAG_URL ?? "http://localhost:8001",
    port: Number(process.env.PORT ?? 8002),
};
