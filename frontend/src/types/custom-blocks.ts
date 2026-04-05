export type CustomBlockDefinition = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  category: string;
  template: string;
  skeleton: string;
  variables: string[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateCustomBlockPayload = {
  name: string;
  description?: string;
  category?: string;
  template: string;
  skeleton: string;
  variables?: string[];
};

export type UpdateCustomBlockPayload = {
  name?: string;
  description?: string | null;
  category?: string;
  template?: string;
  skeleton?: string;
  variables?: string[];
};
