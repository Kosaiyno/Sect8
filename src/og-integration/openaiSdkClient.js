export async function tryOpenAISdkCall(baseUrl, headers, payload) {
    try {
        // dynamic import so SDK is optional
        const mod = await import('openai');
        const OpenAI = mod.default || mod.OpenAI || mod;
        // extract apiKey from Authorization header if present
        let apiKey = (headers === null || headers === void 0 ? void 0 : headers.Authorization) || (headers === null || headers === void 0 ? void 0 : headers.authorization) || '';
        if (apiKey.startsWith('Bearer '))
            apiKey = apiKey.slice(7);
        if (!apiKey)
            return null;
        const client = new OpenAI({ baseURL: baseUrl.replace(/\/$/, ''), apiKey });
        // payload expected to contain { model, messages } or similar
        const model = payload.model || (payload === null || payload === void 0 ? void 0 : payload.modelName);
        const messages = payload.messages || (payload === null || payload === void 0 ? void 0 : payload.messages) || (Array.isArray(payload) ? payload : undefined);
        if (!model || !messages)
            return null;
        const completion = await client.chat.completions.create({ model, messages });
        return completion;
    }
    catch (e) {
        // SDK not installed or call failed — caller will fallback
        return null;
    }
}
export default tryOpenAISdkCall;
