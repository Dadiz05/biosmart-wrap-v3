type LogLevel = "debug" | "info" | "warn" | "error";

function normalizeLogLevel(value: string | undefined): LogLevel {
  if (value === "debug" || value === "info" || value === "warn" || value === "error") {
    return value;
  }
  return "info";
}

const env = import.meta.env;

export const appEnv = {
  apiBaseUrl: env.VITE_API_BASE_URL || "",
  logLevel: normalizeLogLevel(env.VITE_LOG_LEVEL),
  enableDebugUi: env.VITE_ENABLE_DEBUG_UI === "true",
  mode: env.MODE,
} as const;
