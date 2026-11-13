import { test as base, expect } from "@playwright/test";
import { label } from "allure-js-commons";
import { SaucedemoLoginPage } from "../pages/saucedemologinPage";
import { PetStoreClient } from "../api/petStoreClient";
import { getApiAuthHeaders } from "../utils/authHelper";

type AllFixtures = {
  saucedemoLoginPage: SaucedemoLoginPage;
  petStoreClient: PetStoreClient;
  browserLabel: void;
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
  browserLabel: [
    async ({}, use, testInfo) => {
      await label("browser", testInfo.project.name);
      await use();
    },
    { auto: true },
  ],
});
export { expect };
