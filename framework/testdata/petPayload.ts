export const petId = Math.floor(Date.now() / 1000);

export const newPetPayload = {
  id: petId,
  name: "TestDoggo",
  status: "available" as const,
  photoUrls: ["https://example.com/testdog.jpg"],
  category: { id: 1, name: "Dogs" },
  tags: [{ id: 1, name: "test" }],
};
