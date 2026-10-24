import { Page } from "@playwright/test";

export class SaucedemoLoginPage {
  constructor(private readonly page: Page) {}

  get usernameField() {
    return this.page.getByLabel("Username");
  }
  get passwordField() {
    return this.page.getByLabel("Password");
  }
  get loginButton() {
    return this.page.locator("[data-test='login-button']");
  }
  get lockedOutUserAlert() {
    return this.page.getByRole("alert");
  }

  async login(username: string, password: string) {
    await this.page.goto("/");
    await this.usernameField.fill(username);
    await this.passwordField.fill(password);
    await this.loginButton.click();
  }
}
