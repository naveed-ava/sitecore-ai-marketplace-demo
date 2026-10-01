import { ContentTreeNode } from "@/src/components/ui/tree-view";

export interface SitecoreAppDefinition {
  id: string;
  name: string;
  displayName: string;
  description: string;
  environment: string;
  rootPath: string;
  contentTree: ContentTreeNode;
}

export const MOCK_SITECORE_APPS: SitecoreAppDefinition[] = [
  {
    id: "app-corporate",
    name: "Corporate-Website",
    displayName: "Corporate Portal (XM Cloud)",
    description: "Main enterprise multi-language brand portal and customer experience hub",
    environment: "XM Cloud Production (East US)",
    rootPath: "/sitecore/content/Corporate/Home",
    contentTree: {
      id: "root-corporate",
      name: "Corporate",
      displayName: "Corporate Website",
      path: "/sitecore/content/Corporate",
      template: "Site",
      children: [
        {
          id: "node-home-1",
          name: "Home",
          displayName: "Home (Landing)",
          path: "/sitecore/content/Corporate/Home",
          template: "Page",
          children: [
            {
              id: "page-about",
              name: "About Us",
              displayName: "About Us",
              path: "/sitecore/content/Corporate/Home/About Us",
              template: "Page",
              children: [
                {
                  id: "page-leadership",
                  name: "Leadership",
                  displayName: "Executive Leadership",
                  path: "/sitecore/content/Corporate/Home/About Us/Leadership",
                  template: "Page",
                },
              ],
            },
            {
              id: "page-services",
              name: "Services",
              displayName: "Our Services & Capabilities",
              path: "/sitecore/content/Corporate/Home/Services",
              template: "Page",
            },
            {
              id: "page-contact",
              name: "Contact",
              displayName: "Contact & Inquiries",
              path: "/sitecore/content/Corporate/Home/Contact",
              template: "Page",
            },
            {
              id: "folder-articles",
              name: "Newsroom",
              displayName: "Media & Newsroom",
              path: "/sitecore/content/Corporate/Home/Newsroom",
              template: "Folder",
              children: [
                {
                  id: "page-press-2025",
                  name: "Press-Releases",
                  displayName: "Press Releases 2025",
                  path: "/sitecore/content/Corporate/Home/Newsroom/Press-Releases",
                  template: "Page",
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: "app-storefront",
    name: "Commerce-Storefront",
    displayName: "Commerce & Retail Storefront",
    description: "Next.js headless digital commerce app powered by OrderCloud and XM Cloud",
    environment: "XM Cloud Production (West Europe)",
    rootPath: "/sitecore/content/Storefront/Home",
    contentTree: {
      id: "root-storefront",
      name: "Storefront",
      displayName: "Global Retail Storefront",
      path: "/sitecore/content/Storefront",
      template: "Site",
      children: [
        {
          id: "node-home-2",
          name: "Home",
          displayName: "Storefront Home",
          path: "/sitecore/content/Storefront/Home",
          template: "Page",
          children: [
            {
              id: "page-products",
              name: "Catalog",
              displayName: "Product Catalog",
              path: "/sitecore/content/Storefront/Home/Catalog",
              template: "Folder",
              children: [
                {
                  id: "page-apparel",
                  name: "Apparel",
                  displayName: "Seasonal Apparel",
                  path: "/sitecore/content/Storefront/Home/Catalog/Apparel",
                  template: "Page",
                },
                {
                  id: "page-electronics",
                  name: "Electronics",
                  displayName: "Consumer Electronics",
                  path: "/sitecore/content/Storefront/Home/Catalog/Electronics",
                  template: "Page",
                },
              ],
            },
            {
              id: "page-offers",
              name: "Special-Promotions",
              displayName: "Special Promotions",
              path: "/sitecore/content/Storefront/Home/Special-Promotions",
              template: "Page",
            },
          ],
        },
      ],
    },
  },
  {
    id: "app-devportal",
    name: "Developer-Partner-Hub",
    displayName: "Developer & Partner Documentation",
    description: "Technical SDK documentation, Marketplace app guidelines, and API references",
    environment: "XM Cloud Staging (East US)",
    rootPath: "/sitecore/content/DevPortal/Home",
    contentTree: {
      id: "root-devportal",
      name: "DevPortal",
      displayName: "Developer Portal",
      path: "/sitecore/content/DevPortal",
      template: "Site",
      children: [
        {
          id: "node-home-3",
          name: "Home",
          displayName: "Developer Hub Home",
          path: "/sitecore/content/DevPortal/Home",
          template: "Page",
          children: [
            {
              id: "page-guides",
              name: "Getting-Started",
              displayName: "Getting Started Guide",
              path: "/sitecore/content/DevPortal/Home/Getting-Started",
              template: "Page",
            },
            {
              id: "page-api-ref",
              name: "API-Reference",
              displayName: "Marketplace SDK Reference",
              path: "/sitecore/content/DevPortal/Home/API-Reference",
              template: "Page",
            },
          ],
        },
      ],
    },
  },
];
