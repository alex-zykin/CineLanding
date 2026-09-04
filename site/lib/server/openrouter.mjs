const OPENROUTER_CHAT_COMPLETIONS_URL =
  'https://openrouter.ai/api/v1/chat/completions';

const MAX_MESSAGE_COUNT = 32;
const MAX_MESSAGE_CHARACTERS = 200_000;
const MAX_TOTAL_MESSAGE_CHARACTERS = 500_000;
const MAX_SCHEMA_CHARACTERS = 100_000;
const MAX_RESPONSE_CHARACTERS = 2_000_000;

function freezePolicy(policy) {
  return Object.freeze({
    ...policy,
    maxPrice: Object.freeze({ ...policy.maxPrice }),
  });
}

export const LLM_MODEL_POLICY = Object.freeze({
  planner: freezePolicy({
    model: 'google/gemini-3.7-flash',
    maxOutputTokens: 6_000,
    timeoutMs: 45_000,
    maxPrice: { prompt: 2, completion: 8 },
  }),
  builder: freezePolicy({
    model: 'openai/gpt-5.6-sol',
    maxOutputTokens: 24_000,
    timeoutMs: 120_000,
    maxPrice: { prompt: 6, completion: 34 },
  }),
  reviewer: freezePolicy({
    model: 'anthropic/claude-opus-5',
    maxOutputTokens: 8_000,
    timeoutMs: 90_000,
    maxPrice: { prompt: 6, completion: 30 },
  }),
});

export class OpenRouterError extends Error {
  constructor(code, message, options = {}) {
    super(message);
    this.name = 'OpenRouterError';
    this.code = code;
    if (Number.isInteger(options.status)) {
      this.status = options.status;
    }
  }
}

function fail(code, message, options) {
  throw new OpenRouterError(code, message, options);
}

function getPolicy(stage) {
  if (typeof stage !== 'string' || !Object.hasOwn(LLM_MODEL_POLICY, stage)) {
    fail('unsupported_stage', 'The requested generation stage is not supported.');
  }

  return LLM_MODEL_POLICY[stage];
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGE_COUNT) {
    fail('invalid_messages', `Messages must contain between 1 and ${MAX_MESSAGE_COUNT} entries.`);
  }

  let totalCharacters = 0;
  const normalized = messages.map((message) => {
    if (!message || typeof message !== 'object' || Array.isArray(message)) {
      fail('invalid_messages', 'Each message must be an object.');
    }

    if (!['system', 'user', 'assistant'].includes(message.role)) {
      fail('invalid_messages', 'A message has an unsupported role.');
    }

    if (typeof message.content !== 'string' || message.content.trim().length === 0) {
      fail('invalid_messages', 'Each message must contain non-empty text.');
    }

    if (message.content.length > MAX_MESSAGE_CHARACTERS) {
      fail('request_too_large', 'A generation message is too large.');
    }

    totalCharacters += message.content.length;
    if (totalCharacters > MAX_TOTAL_MESSAGE_CHARACTERS) {
      fail('request_too_large', 'The generation request is too large.');
    }

    return { role: message.role, content: message.content };
  });

  return normalized;
}

function cloneAndValidateSchema(schema) {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema) || schema.type !== 'object') {
    fail('invalid_schema', 'The response schema must describe a top-level object.');
  }

  let serialized;
  try {
    serialized = JSON.stringify(schema);
  } catch {
    fail('invalid_schema', 'The response schema must be JSON serializable.');
  }

  if (!serialized || serialized.length > MAX_SCHEMA_CHARACTERS) {
    fail('invalid_schema', 'The response schema is empty or too large.');
  }

  return JSON.parse(serialized);
}

function normalizeSchemaName(schemaName) {
  if (typeof schemaName !== 'string' || !/^[a-z][a-z0-9_]{0,63}$/.test(schemaName)) {
    fail(
      'invalid_schema_name',
      'The schema name must start with a lowercase letter and contain only lowercase letters, digits, or underscores.',
    );
  }

  return schemaName;
}

export function createStructuredGenerationRequest({
  stage,
  messages,
  schemaName,
  schema,
}) {
  const policy = getPolicy(stage);

  return {
    model: policy.model,
    messages: normalizeMessages(messages),
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: normalizeSchemaName(schemaName),
        strict: true,
        schema: cloneAndValidateSchema(schema),
      },
    },
    provider: {
      require_parameters: true,
      data_collection: 'deny',
      zdr: true,
      allow_fallbacks: false,
      max_price: { ...policy.maxPrice },
    },
    max_completion_tokens: policy.maxOutputTokens,
    stream: false,
  };
}

function normalizeSiteUrl(siteUrl) {
  if (siteUrl === undefined || siteUrl === null || siteUrl === '') {
    return null;
  }

  try {
    const parsed = new URL(siteUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      fail('invalid_site_url', 'The OpenRouter site URL must use HTTP or HTTPS.');
    }
    if (parsed.username || parsed.password) {
      fail('invalid_site_url', 'The OpenRouter site URL must not contain credentials.');
    }
    return parsed.origin;
  } catch (error) {
    if (error instanceof OpenRouterError) throw error;
    fail('invalid_site_url', 'The OpenRouter site URL is invalid.');
  }
}

function isJsonType(value, type) {
  switch (type) {
    case 'object':
      return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    case 'array':
      return Array.isArray(value);
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'integer':
      return Number.isInteger(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'null':
      return value === null;
    default:
      return true;
  }
}

function matchesSchema(value, schema) {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return true;

  if (Array.isArray(schema.enum) && !schema.enum.some((candidate) => Object.is(candidate, value))) {
    return false;
  }
  if (Object.hasOwn(schema, 'const') && !Object.is(schema.const, value)) {
    return false;
  }

  if (Array.isArray(schema.type)) {
    if (!schema.type.some((type) => isJsonType(value, type))) return false;
  } else if (typeof schema.type === 'string' && !isJsonType(value, schema.type)) {
    return false;
  }

  if (typeof value === 'string') {
    if (Number.isInteger(schema.minLength) && value.length < schema.minLength) return false;
    if (Number.isInteger(schema.maxLength) && value.length > schema.maxLength) return false;
    if (typeof schema.pattern === 'string') {
      try {
        if (!new RegExp(schema.pattern, 'u').test(value)) return false;
      } catch {
        return false;
      }
    }
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (typeof schema.minimum === 'number' && value < schema.minimum) return false;
    if (typeof schema.maximum === 'number' && value > schema.maximum) return false;
  }

  if (Array.isArray(value)) {
    if (Number.isInteger(schema.minItems) && value.length < schema.minItems) return false;
    if (Number.isInteger(schema.maxItems) && value.length > schema.maxItems) return false;
    if (schema.items && !value.every((item) => matchesSchema(item, schema.items))) return false;
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const properties = schema.properties && typeof schema.properties === 'object'
      ? schema.properties
      : {};
    if (Array.isArray(schema.required)) {
      if (!schema.required.every((key) => typeof key === 'string' && Object.hasOwn(value, key))) {
        return false;
      }
    }
    for (const [key, child] of Object.entries(value)) {
      if (Object.hasOwn(properties, key)) {
        if (!matchesSchema(child, properties[key])) return false;
      } else if (schema.additionalProperties === false) {
        return false;
      } else if (
        schema.additionalProperties
        && typeof schema.additionalProperties === 'object'
        && !matchesSchema(child, schema.additionalProperties)
      ) {
        return false;
      }
    }
  }

  return true;
}

function requireUsage(payload) {
  const usage = payload?.usage;
  const tokenValues = [usage?.prompt_tokens, usage?.completion_tokens, usage?.total_tokens];
  if (
    !usage
    || !tokenValues.every((value) => Number.isInteger(value) && value >= 0)
    || typeof usage.cost !== 'number'
    || !Number.isFinite(usage.cost)
    || usage.cost < 0
  ) {
    fail('invalid_usage', 'OpenRouter returned an unusable usage record.');
  }

  return {
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
    costUsd: usage.cost,
  };
}

function parseStructuredOutput(payload, schema) {
  if (typeof payload?.id !== 'string' || payload.id.length === 0) {
    fail('invalid_upstream_response', 'OpenRouter returned no generation identifier.');
  }
  if (typeof payload?.model !== 'string' || payload.model.length === 0) {
    fail('invalid_upstream_response', 'OpenRouter returned no model identifier.');
  }

  const choice = payload?.choices?.[0];
  if (!choice || typeof choice !== 'object') {
    fail('invalid_upstream_response', 'OpenRouter returned no completion choice.');
  }
  if (choice.message?.refusal) {
    fail('model_refusal', 'The model refused the generation request.');
  }
  if (choice.finish_reason !== 'stop') {
    fail('incomplete_generation', 'The model did not complete the generation request.');
  }

  const content = choice.message?.content;
  if (typeof content !== 'string' || content.length === 0) {
    fail('invalid_structured_output', 'The model returned no structured output.');
  }

  let output;
  try {
    output = JSON.parse(content);
  } catch {
    fail('invalid_structured_output', 'The model returned malformed structured output.');
  }

  if (!output || typeof output !== 'object' || Array.isArray(output)) {
    fail('invalid_structured_output', 'The structured output must be an object.');
  }
  if (!matchesSchema(output, schema)) {
    fail('schema_mismatch', 'The model output does not match the requested schema.');
  }

  return output;
}

function assertOutboundDataClassification(dataClassification) {
  if (dataClassification === undefined) {
    fail('missing_data_classification', 'Every model request needs an explicit data classification.');
  }
  if (!['public', 'synthetic'].includes(dataClassification)) {
    fail('sensitive_data_blocked', 'Sensitive data is not allowed in hosted model requests.');
  }
}

function normalizeTimeout(timeoutMs, policyTimeoutMs) {
  if (timeoutMs === undefined) return policyTimeoutMs;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > policyTimeoutMs) {
    fail('invalid_timeout', 'The model-request timeout is outside the allowed range.');
  }
  return timeoutMs;
}

async function readLimitedResponseText(response) {
  const contentLength = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_CHARACTERS) {
    fail('invalid_upstream_response', 'OpenRouter returned an unexpectedly large response.', {
      status: response.status,
    });
  }

  if (!response.body || typeof response.body.getReader !== 'function') {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_CHARACTERS) {
      fail('invalid_upstream_response', 'OpenRouter returned an unexpectedly large response.', {
        status: response.status,
      });
    }
    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytesRead += value.byteLength;
    if (bytesRead > MAX_RESPONSE_CHARACTERS) {
      await reader.cancel().catch(() => {});
      fail('invalid_upstream_response', 'OpenRouter returned an unexpectedly large response.', {
        status: response.status,
      });
    }
    text += decoder.decode(value, { stream: true });
  }

  return text + decoder.decode();
}

export async function runStructuredGeneration({
  apiKey,
  stage,
  messages,
  schemaName,
  schema,
  fetchImpl = globalThis.fetch,
  siteUrl,
  signal,
  timeoutMs,
  dataClassification,
}) {
  const policy = getPolicy(stage);
  assertOutboundDataClassification(dataClassification);
  if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    fail('missing_api_key', 'OpenRouter is not configured.');
  }
  if (typeof fetchImpl !== 'function') {
    fail('missing_fetch', 'No HTTP client is available for OpenRouter.');
  }

  const body = createStructuredGenerationRequest({
    stage,
    messages,
    schemaName,
    schema,
  });

  const headers = {
    Authorization: `Bearer ${apiKey.trim()}`,
    'Content-Type': 'application/json',
    'X-OpenRouter-Title': 'CineLanding',
  };
  const normalizedSiteUrl = normalizeSiteUrl(siteUrl);
  if (normalizedSiteUrl) {
    headers['HTTP-Referer'] = normalizedSiteUrl;
  }

  const effectiveTimeoutMs = normalizeTimeout(timeoutMs, policy.timeoutMs);
  const timeoutController = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    timeoutController.abort();
  }, effectiveTimeoutMs);
  const requestSignal = signal
    ? AbortSignal.any([signal, timeoutController.signal])
    : timeoutController.signal;

  let response;
  let responseText;
  try {
    response = await fetchImpl(OPENROUTER_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: requestSignal,
    });
    if (!response.ok) {
      await response.body?.cancel?.().catch(() => {});
      fail('upstream_error', 'OpenRouter rejected the generation request.', {
        status: response.status,
      });
    }
    responseText = await readLimitedResponseText(response);
  } catch (error) {
    if (error instanceof OpenRouterError) throw error;
    if (timedOut) {
      fail('request_timeout', 'OpenRouter did not respond before the request deadline.');
    }
    if (signal?.aborted) {
      fail('request_aborted', 'The OpenRouter request was cancelled.');
    }
    fail('network_error', 'OpenRouter could not be reached.');
  } finally {
    clearTimeout(timer);
  }

  let payload;
  try {
    payload = JSON.parse(responseText);
  } catch {
    fail('invalid_upstream_response', 'OpenRouter returned invalid JSON.', {
      status: response.status,
    });
  }

  const output = parseStructuredOutput(payload, body.response_format.json_schema.schema);
  const usage = requireUsage(payload);

  return {
    id: payload.id,
    model: payload.model,
    output,
    usage,
  };
}
