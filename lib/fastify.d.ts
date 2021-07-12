import { Record, Template } from "./Database/models";

declare module 'fastify' {
  export interface FastifyRequest {
    site: {
      siteName: string,
      settings: Template[];
      collections: Template[];
      pages: Record[];
      showBuild: boolean;
      needsBuild: boolean;
      record: Record | null;
    }
  }
}
