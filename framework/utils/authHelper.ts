export function getApiAuthHeaders(): Record<string, string> {
  return {
    api_key: process.env.PETSTORE_API_KEY!,
  };
}
