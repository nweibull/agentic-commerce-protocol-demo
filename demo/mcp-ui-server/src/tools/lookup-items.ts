import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createUIResource } from '@mcp-ui/server';
import { generateCatalogHTML } from '../templates/catalog-html.js';
import { MerchantSessionService } from '../services/MerchantSessionService.js';
import { ProductSearchService } from '../services/ProductSearchService.js';
import { z } from 'zod';

export function registerLookupItemsTool(
  server: McpServer,
  merchantService: MerchantSessionService,
  productSearchService: ProductSearchService,
  sessionId: string,
  port: number
) {
  server.registerTool('lookup_items', {
    title: 'Lookup Items',
    description: `
      Search for products using natural language queries. Shows the user the 
      most relevant products with images. Use this when the user asks for specific 
      types of products (e.g., "show me laptops", "find comfortable chairs", "I need 
      makeup products"). ONLY CALL THIS ONCE PER QUERY. You may BRIEFLY describe the products.
      The user will see the carousel AFTER you finish your text, so be brief after using this.
    `,
    inputSchema: {
      query: z.string().describe('Natural language search query describing what products to find'),
    },
  }, async ({ query }) => {
    console.log('lookup_items tool called with query:', query);
    const limit = 5;

    // Search for products using semantic similarity
    const searchResults = await productSearchService.search(query, limit);

    // Get cart items from merchant session
    const cartItems = new Set<string>();

    if (merchantService.hasActiveSession(sessionId)) {
      const activeSession = merchantService.getActiveSession(sessionId);
      activeSession?.line_items.forEach(li => cartItems.add(li.item.id));
    }

    // Generate HTML carousel with search results
    const htmlContent = generateCatalogHTML(searchResults, cartItems, port);

    const uiResource = createUIResource({
      uri: `ui://search/${Date.now()}` as `ui://${string}`,
      content: {
        type: 'rawHtml',
        htmlString: htmlContent,
      },
      encoding: 'text',
    });

    return {
      content: [uiResource],
    };
  });
}
