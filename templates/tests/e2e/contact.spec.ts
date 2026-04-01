import { ContactBuilder } from "../../src/data/builders/contact.builder";
import type { ContactFormData } from "../../src/data/types";
import { test } from "../../src/fixtures";

const validContact: ContactFormData = {
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
  subject: "customer-service",
  message: "I need help with my account.",
};

test.describe("Contact form @smoke", () => {
  test.beforeEach(async ({ contactPage }) => {
    await contactPage.navigate();
  });

  test("should submit successfully with valid data", async ({ contactPage }) => {
    await contactPage.fillContactForm(validContact);
    await contactPage.submitForm();
    await contactPage.expectSuccessMessage();
  });

  test("should submit successfully with random valid data", async ({ contactPage }) => {
    await contactPage.fillContactForm(ContactBuilder.create().build());
    await contactPage.submitForm();
    await contactPage.expectSuccessMessage();
  });

  test("should show validation errors for empty form", async ({ contactPage }) => {
    await contactPage.fillContactForm({
      ...validContact,
      email: "not-an-email",
      firstName: "",
      lastName: "",
      message: "",
    });
    await contactPage.submitForm();
    await contactPage.expectValidationErrors();
  });
});
