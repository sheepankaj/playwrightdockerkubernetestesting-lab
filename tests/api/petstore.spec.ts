import { test, expect } from "../../framework/support/fixtures";
import { petId, newPetPayload } from "../../framework/testdata/petPayload";
import { Pet } from "../../framework/api/petStoreClient";
import { attachApiResponse } from "../../framework/utils/apiHelper";

test.describe.serial("Petstore API - Pet CRUD lifecycle", () => {
  test("Auth: Verify API key is authorized", async ({ petStoreClient }) => {
    const response = await petStoreClient.verifyAuth();
    const json = await response.json();
    await attachApiResponse(response.url(), json);

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
  });

  test("POST: Create a new pet", async ({ petStoreClient }) => {
    const response = await petStoreClient.createPet(newPetPayload);
    const pet: Pet = await response.json();
    await attachApiResponse(response.url(), pet);

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    expect(pet.id).toBe(petId);
    expect(pet.name).toBe(newPetPayload.name);
    expect(pet.status).toBe(newPetPayload.status);
  });

  test("GET: Retrieve and validate the created pet", async ({
    petStoreClient,
  }) => {
    let pet: Pet | undefined;
    let responseUrl = "";

    await expect
      .poll(
        async () => {
          const response = await petStoreClient.getPet(petId);
          responseUrl = response.url();
          if (response.ok()) {
            pet = await response.json();
          }
          return response.status();
        },
        { timeout: 30000, intervals: [2000, 5000, 5000, 5000, 5000] },
      )
      .toBe(200);

    await attachApiResponse(responseUrl, pet!);

    expect(pet!.id).toBe(petId);
    expect(pet!.name).toBe(newPetPayload.name);
    expect(pet!.status).toBe(newPetPayload.status);
    expect(pet!.category?.name).toBe(newPetPayload.category.name);
  });

  test("DELETE: Remove the pet and confirm deletion", async ({
    petStoreClient,
  }) => {
    const deleteResponse = await petStoreClient.deletePet(petId);
    const deleteJson = await deleteResponse.json();
    await attachApiResponse(deleteResponse.url(), deleteJson);

    expect(deleteResponse.ok()).toBeTruthy();

    const getResponse = await petStoreClient.getPet(petId);
    expect(getResponse.status()).toBe(404);
  });
});
