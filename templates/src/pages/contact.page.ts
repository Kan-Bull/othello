import { expect } from "@playwright/test";
import { BasePage } from "../core/base.page";
import type { ContactFormData } from "../data/types";

export class ContactPage extends BasePage {
  readonly path = "/contact";
  readonly pageTitle = /Contact Us/;

  // -- Locators (private -- never exposed to tests) --

  // Form fields
  private readonly firstNameInput = this.page.getByTestId("first-name");
  private readonly lastNameInput = this.page.getByTestId("last-name");
  private readonly emailInput = this.page.getByTestId("email");
  private readonly subjectSelect = this.page.getByTestId("subject");
  private readonly messageTextarea = this.page.getByTestId("message");
  private readonly submitButton = this.page.getByTestId("contact-submit");
  private readonly successMessage = this.page.getByRole("alert");

  // Validation errors
  private readonly firstNameError = this.page.getByTestId("first-name-error");
  private readonly lastNameError = this.page.getByTestId("last-name-error");
  private readonly emailError = this.page.getByTestId("email-error");
  private readonly messageError = this.page.getByTestId("message-error");

  // -- Actions --

  async fillContactForm(data: ContactFormData): Promise<void> {
    this.log.step(`Filling contact form for ${data.email}`);
    await this.fill(this.firstNameInput, data.firstName, "first name");
    await this.fill(this.lastNameInput, data.lastName, "last name");
    await this.fill(this.emailInput, data.email, "email");
    await this.selectOption(this.subjectSelect, data.subject, "subject");
    await this.fill(this.messageTextarea, data.message, "message");
  }

  async submitForm(): Promise<void> {
    this.log.step("Submitting contact form");
    await this.click(this.submitButton, "Submit button");
  }

  // -- Assertions --

  async expectSuccessMessage(): Promise<void> {
    this.log.step("Verifying success message");
    await expect(this.successMessage).toBeVisible();
    this.log.success("Success alert visible");
  }

  async expectValidationErrors(): Promise<void> {
    this.log.step("Verifying validation errors");
    await expect(this.firstNameError).toBeVisible();
    await expect(this.lastNameError).toBeVisible();
    await expect(this.emailError).toBeVisible();
    await expect(this.messageError).toBeVisible();
    this.log.success("All validation errors visible");
  }
}
