export function reportError(error: unknown, context: string) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[BioSmartWrap] ${context}:`, message, error);
}