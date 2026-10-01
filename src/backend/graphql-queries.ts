/**
 * GraphQL Queries and Mutations conforming to the Sitecore Authoring and Management GraphQL API
 * Reference: https://doc.sitecore.com/xp/en/developers/105/sitecore-experience-manager/query-examples-for-authoring-operations.html
 */

export const GET_ITEM_BY_PATH_OR_ID_QUERY = /* GraphQL */ `
  query GetAuthoringItem($where: ItemQueryInput!) {
    item(where: $where) {
      itemId
      name
      path
      fields(ownFields: true, excludeStandardFields: true) {
        nodes {
          name
          value
        }
      }
      children {
        nodes {
          itemId
          name
          path
          template {
            name
          }
        }
      }
    }
  }
`;

export const GET_CONFIGURED_SITES_QUERY = /* GraphQL */ `
  query GetSites {
    sites {
      name
      domain
      rootPath
      startPath
      browserTitle
      rootItem {
        itemId
      }
    }
  }
`;

export const GET_AUTHORING_SINGLE_ITEM_QUERY = /* GraphQL */ `
  query GetAuthoringSingleItem($where: ItemQueryInput!) {
    item(where: $where) {
      itemId
      name
      path
      template {
        name
      }
    }
  }
`;

export const GET_AUTHORING_ITEM_TREE_QUERY = /* GraphQL */ `
  query GetAuthoringItemTree($where: ItemQueryInput!) {
    item(where: $where) {
      itemId
      name
      path
      template {
        name
      }
      children {
        nodes {
          itemId
          name
          path
        }
      }
    }
  }
`;

export const CREATE_ITEM_MUTATION = /* GraphQL */ `
  mutation CreateAuthoringItem($input: CreateItemInput!) {
    createItem(input: $input) {
      item {
        itemId
        name
        path
        fields(ownFields: true, excludeStandardFields: true) {
          nodes {
            name
            value
          }
        }
      }
    }
  }
`;

export const UPLOAD_MEDIA_MUTATION = /* GraphQL */ `
  mutation RequestMediaUpload($itemPath: String!) {
    uploadMedia(input: { itemPath: $itemPath }) {
      presignedUploadUrl
    }
  }
`;

export const UPDATE_ITEM_MUTATION = /* GraphQL */ `
  mutation UpdateAuthoringItem($input: UpdateItemInput!) {
    updateItem(input: $input) {
      item {
        itemId
        name
        path
        fields(ownFields: true) {
          nodes {
            name
            value
          }
        }
      }
    }
  }
`;

export const SEARCH_ITEMS_UNDER_PATH_QUERY = /* GraphQL */ `
  query SearchSitecoreItems($query: SearchQueryInput!) {
    search(query: $query) {
      totalCount
      results {
        innerItem {
          itemId
          name
          path
          field(name: "Title") {
            value
          }
        }
      }
    }
  }
`;
