export interface Product {
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

export const DEMO_PRODUCTS: Record<string, Product> = {
    item_123: {
      id: 'item_123',
      name: 'Simple wooden chair',
      description: 'A birch wood chair for all your needs. Perfect for everyday use and built to last.',
      base_price: 2999, // $29.99
      available_quantity: 100,
      requires_shipping: true,
      category: 'Furniture > Chairs',
      brand: 'Ikea',
      weight: '1.2 lb',
      image_url: 'https://www.ikea.com/us/en/images/products/pinntorp-chair-light-brown-stained__1296225_pe935730_s5.jpg',
      condition: 'new',
      material: 'Birch wood',
      review_count: 42,
      review_rating: 4.5,
      shipping_info: 'US::Standard:5.00 USD',
    },
    item_456: {
      id: 'item_456',
      name: 'Funky looking chair',
      description: 'The most advanced chair on the market. Premium quality construction with cutting-edge features.',
      base_price: 4999, // $49.99
      available_quantity: 50,
      requires_shipping: true,
      category: 'Furniture > Chairs',
      brand: 'West Coast Modern',
      weight: '1.5 lb',
      image_url: 'https://westcoastmodernla.com/cdn/shop/products/IMG_7948-rotated_f21f9e48-79e2-44ac-a071-635aecc7f872.jpg',
      condition: 'new',
      material: 'Mink Fur',
      review_count: 3342,
      review_rating: 3.4,
      shipping_info: 'US::Standard:5.00 USD',
    },
    item_789: {
      id: 'item_789',
      name: 'Awesome minimalist chair',
      description: 'Your children will love you.',
      base_price: 9900, // $99.00
      available_quantity: 999999,
      requires_shipping: false,
      category: 'Furniture > Chairs',
      brand: 'KidsLoveIt',
      weight: '0.8 lb',
      image_url: 'https://media.printables.com/media/prints/167236/images/1555596_5f9b20f1-726a-4c1a-ac19-90d3ce6534c9/thumbs/inside/1280x960/png/chair-for-boy.webp',
      condition: 'new',
      review_count: 856,
      review_rating: 4.9,
    },
    item_101: {
      id: 'item_101',
      name: 'Classic folding chair',
      description: 'A classic folding chair for all your needs. It will squeak, but it\'s a classic.',
      base_price: 19999, // $199.99
      available_quantity: 25,
      requires_shipping: true,
      category: 'Furniture > Chairs',
      brand: 'HomeGoods',
      weight: '0.8 lb',
      image_url: 'https://www.stagedrop.com/resize/images/nps/NPS-974.jpg',
      condition: 'new',
      material: 'Leather and Metal and Dreams',
      review_count: 312,
      review_rating: 4.7,
      shipping_info: 'US::Standard:5.00 USD',
    },
  };