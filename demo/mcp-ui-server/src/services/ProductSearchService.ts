import { pipeline, Pipeline } from '@xenova/transformers';
import { ProductFeedService } from './ProductFeedService.js';

interface Product {
  id: string;
  name: string;
  description: string;
  base_price: number;
  available_quantity: number;
  requires_shipping: boolean;
  category: string;
  brand: string;
  weight: string;
  image_url: string;
  condition: string;
  material?: string;
  review_count: number;
  review_rating: number;
  shipping_info?: string;
}

interface ProductWithEmbedding {
  product: Product;
  embedding: number[];
}

export class ProductSearchService {
  private embeddingModel: Pipeline | null = null;
  private productVectors: ProductWithEmbedding[] = [];
  private isInitialized = false;
  private productFeedService: ProductFeedService;

  constructor(productFeedService: ProductFeedService) {
    this.productFeedService = productFeedService;
  }

  /**
   * Initialize the search service: load embedding model and index products from feed service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🔍 Initializing product search...');

    // Load lightweight embedding model (all-MiniLM-L6-v2, ~25MB)
    console.log('   Loading embedding model...');
    this.embeddingModel = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    );

    // Get products from the already-cached product feed
    console.log('   Getting products from feed cache...');
    const products = this.productFeedService.getAllProducts();

    if (products.length === 0) {
      console.warn('   No products available in feed cache - search index will be empty');
    }

    // Embed and index all products
    console.log(`   Indexing ${products.length} products...`);
    this.productVectors = await Promise.all(
      products.map(async (product) => {
        // Combine name and description for richer semantic search
        const text = `${product.name}. ${product.description}`;
        const embedding = await this.embed(text);

        return {
          product,
          embedding,
        };
      })
    );

    this.isInitialized = true;
    console.log('✅ Product search ready\n');
  }

  /**
   * Generate embedding for a text string
   */
  private async embed(text: string): Promise<number[]> {
    if (!this.embeddingModel) {
      throw new Error('Embedding model not initialized');
    }

    const output = await this.embeddingModel(text, {
      pooling: 'mean',
      normalize: true,
    });

    return Array.from(output.data);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Search for products using semantic similarity
   * @param query Natural language search query
   * @param k Number of results to return (default 5)
   * @returns Array of top k matching products
   */
  async search(query: string, k: number = 5): Promise<Product[]> {
    if (!this.isInitialized) {
      throw new Error('ProductSearchService not initialized');
    }

    // Generate embedding for the query
    const queryEmbedding = await this.embed(query);

    // Calculate similarity for all products
    const similarities = this.productVectors.map((pv) => ({
      product: pv.product,
      score: this.cosineSimilarity(queryEmbedding, pv.embedding),
    }));

    // Sort by score and return top k
    similarities.sort((a, b) => b.score - a.score);
    return similarities.slice(0, k).map((s) => s.product);
  }
}
