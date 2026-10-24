import { test } from "@playwright/test";

export async function attachApiResponse(
  url: string,
  json: unknown,
): Promise<void> {
  await test
    .info()
    .attach("API Request URL", { body: url, contentType: "text/plain" });
  await test.info().attach("API Response", {
    body: JSON.stringify(json, null, 2),
    contentType: "application/json",
  });
}
