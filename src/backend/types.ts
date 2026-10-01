/**
 * Types and interfaces for Sitecore Authoring and Management GraphQL API
 * Reference: https://doc.sitecore.com/xp/en/developers/105/sitecore-experience-manager/sitecore-authoring-and-management-graphql-api.html
 */

export interface SitecoreEndpointConfig {
  endpoint: string; // e.g. https://<instance>/sitecore/api/authoring/graphql/v1/ or https://xmc-<env>.sitecorecloud.io/sitecore/api/authoring/graphql/v1/
  apiKey?: string;   // sc_apikey or Bearer token
  token?: string;    // JWT Bearer token
  database?: string; // usually 'master'
  language?: string; // e.g. 'en'
  defaultTemplateId?: string; // Template GUID for created pages
}

export interface SitecoreFieldInput {
  name: string;
  value: string;
  reset?: boolean;
}

export interface CreateItemInput {
  name: string;
  templateId: string;
  parent: string; // Item GUID or Path
  language?: string;
  fields?: SitecoreFieldInput[];
}

export interface UpdateItemInput {
  itemId?: string;
  path?: string;
  database?: string;
  language?: string;
  version?: number;
  fields: SitecoreFieldInput[];
}

export interface SitecoreAuthoringItem {
  itemId: string;
  name: string;
  path: string;
  fields?: {
    nodes: Array<{
      name: string;
      value: string;
    }>;
  };
  children?: {
    nodes: Array<{
      itemId: string;
      name: string;
      path: string;
      template?: {
        name: string;
      };
    }>;
  };
}

export interface SitecoreSiteInfo {
  name: string;
  domain?: string;
  rootPath: string;
  startPath?: string;
  browserTitle?: string;
}

export interface ImportPagePayload {
  id?: string;
  explicitPath?: string;
  name: string;
  title: string;
  body: string;
  imageUrl: string;
  status: "CREATE" | "UPDATE";
  targetParentPath: string;
  targetFullPath: string;
  matchingNodeId?: string;
}

export interface ImportExecutionRequest {
  config: SitecoreEndpointConfig;
  appId: string;
  startingPointPath: string;
  pages: ImportPagePayload[];
}

export interface ImportItemExecutionResult {
  title: string;
  name: string;
  targetPath: string;
  action: "CREATE" | "UPDATE";
  success: boolean;
  itemId?: string;
  error?: string;
  timestamp: string;
  queryOrMutationUsed: string;
}

export interface ImportExecutionResponse {
  success: boolean;
  total: number;
  created: number;
  updated: number;
  failed: number;
  logs: string[];
  results: ImportItemExecutionResult[];
}
