import { test as base, expect } from "@playwright/test";
import { SaucedemoLoginPage } from "../pages/saucedemologinPage";
import { PetStoreClient } from "../api/petStoreClient";
import { getApiAuthHeaders } from "../utils/authHelper";

type AllFixtures = {
  saucedemoLoginPage: SaucedemoLoginPage;
  petStoreClient: PetStoreClient;
};

export const test = base.extend<AllFixtures>({
  saucedemoLoginPage: async ({ page }, use) => {
    await use(new SaucedemoLoginPage(page));
  },
  petStoreClient: async ({ playwright }, use) => {
    const apiContext = await playwright.request.newContext({
      baseURL: "https://petstore.swagger.io/v2/",
      extraHTTPHeaders: getApiAuthHeaders(),
    });
    await use(new PetStoreClient(apiContext));
    await apiContext.dispose();
  },
});
export { expect };
