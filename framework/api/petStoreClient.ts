import { APIRequestContext, APIResponse } from "@playwright/test";

export interface Pet {
  id: number;
  name: string;
  status: "available" | "pending" | "sold";
  photoUrls: string[];
  category?: { id: number; name: string };
  tags?: Array<{ id: number; name: string }>;
}

type CreatePetPayload = Omit<Pet, "id"> & { id?: number };

export class PetStoreClient {
  constructor(private readonly request: APIRequestContext) {}

  async createPet(payload: CreatePetPayload): Promise<APIResponse> {
    return this.request.post("pet", { data: payload });
  }

  async getPet(id: number): Promise<APIResponse> {
    return this.request.get(`pet/${id}`);
  }

  async deletePet(id: number): Promise<APIResponse> {
    return this.request.delete(`pet/${id}`);
  }

  async verifyAuth(): Promise<APIResponse> {
    return this.request.get("pet/findByStatus?status=available");
  }
}
