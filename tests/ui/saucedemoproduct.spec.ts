import { test, expect } from "../../framework/support/fixtures";

test.describe(
  "Saucedemo Login and Shopping Tests",
  { tag: "@LoginAndProductPage" },
  () => {
    test("Validate standard user login functionality", async ({
      page,
      saucedemoLoginPage,
    }) => {
      test
        .info()
        .annotations.push(
          { type: "Author", description: "QA Team" },
          { type: "TestType", description: "Smoke" },
          { type: "Jira", description: "PW-101" },
        );

      await saucedemoLoginPage.login(
        process.env.STANDARD_USERNAME!,
        process.env.PASSWORD!,
      );

      await expect(page.locator(".app_logo")).toBeVisible();
    });

    test(
      "Validate locked_out user login functionality",
      { tag: "@NegativeTest" },
      async ({ page, saucedemoLoginPage }) => {
        await saucedemoLoginPage.login(
          process.env.LOCKED_OUT_USER!,
          process.env.PASSWORD!,
        );

        await expect(page.getByRole("alert")).toHaveText(
          "Epic sadface: Sorry, this user has been locked out.",
        );
      },
    );
  },
);
