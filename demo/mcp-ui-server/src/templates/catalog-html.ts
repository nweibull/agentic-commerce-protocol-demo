import { Product } from '../demo_data.js';

export function generateCatalogHTML(products: Product[], cart: Set<string>, port: number): string {
  // Generate product cards for the carousel
  const productCards = products.map(product => `
    <div class="product-card" onclick="openModal('${product.id}')">
      <div class="product-image-container">
        <img src="${product.image_url}" alt="${product.name}" />
        <div class="product-overlay">
          <div class="product-name">${product.name}</div>
        </div>
      </div>
    </div>
  `).join('');

  // Generate modal content for each product
  const productModals = products.map(product => {
    const priceFormatted = (product.base_price / 100).toFixed(2);
    const stars = '★'.repeat(Math.floor(product.review_rating)) + '☆'.repeat(5 - Math.floor(product.review_rating));
    const inCart = cart.has(product.id);

    return `
    <!-- Modal for ${product.name} -->
    <div id="modal-${product.id}" class="modal">
      <div class="modal-backdrop" onclick="closeModal('${product.id}')"></div>
      <div class="modal-content">
        <!-- Close button -->
        <button class="modal-close" onclick="closeModal('${product.id}')">&times;</button>

        <!-- Left side: Product image -->
        <div class="modal-left">
          <img src="${product.image_url}" alt="${product.name}" />
        </div>

        <!-- Right side: Product details -->
        <div class="modal-right">
          <h3>${product.name}</h3>
          <div class="price">$${priceFormatted}</div>

          <div class="rating">
            <span class="stars">${stars}</span>
            <span class="rating-text">${product.review_rating} (${product.review_count} reviews)</span>
          </div>

          <div class="description">${product.description}</div>

          <div class="details">
            <div class="detail-row">
              <span class="detail-label">Brand:</span>
              <span class="detail-value">${product.brand}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Category:</span>
              <span class="detail-value">${product.category}</span>
            </div>
            ${product.material ? `
            <div class="detail-row">
              <span class="detail-label">Material:</span>
              <span class="detail-value">${product.material}</span>
            </div>
            ` : ''}
            <div class="detail-row">
              <span class="detail-label">Weight:</span>
              <span class="detail-value">${product.weight}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Condition:</span>
              <span class="detail-value">${product.condition}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">In Stock:</span>
              <span class="detail-value">${product.available_quantity} units</span>
            </div>
          </div>

          <!-- Cart button -->
          <button
            id="cart-btn-${product.id}"
            class="cart-button ${inCart ? 'in-cart' : ''}"
            onclick="toggleCart('${product.id}')"
          >
            ${inCart ? 'Remove from Cart' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    ${getCatalogStyles()}
  </style>
</head>
<body>
  <!-- Main catalog view -->
  <div class="catalog-header">
    <h2>Product Catalog</h2>
    <button class="cart-icon-button" onclick="openCartModal()">
      <!-- Shopping cart SVG icon -->
      <svg viewBox="0 0 24 24">
        <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" fill="none"/>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        <circle cx="9" cy="20" r="1"/>
        <circle cx="20" cy="20" r="1"/>
      </svg>
      <span class="cart-badge" id="cart-badge" style="display: none;">0</span>
    </button>
  </div>
  <div class="catalog-container">
    ${productCards}
  </div>

  <!-- Product modals (hidden by default) -->
  ${productModals}

  <!-- Cart modal -->
  <div id="cart-modal" class="modal">
    <div class="modal-backdrop" onclick="closeCartModal()"></div>
    <div class="modal-content">
      <div class="cart-modal-header">
        <h3>Your Cart</h3>
        <button class="modal-close" onclick="closeCartModal()">&times;</button>
      </div>
      <div class="cart-modal-body" id="cart-items-container">
        <div class="cart-empty">Your cart is empty</div>
      </div>
      <div class="cart-total" id="cart-total-section" style="display: none;">
        <div class="cart-total-label">Subtotal (before tax):</div>
        <div class="cart-total-amount" id="cart-total-amount">$0.00</div>
      </div>
      <div class="cart-checkout" id="cart-checkout-section" style="display: none;">
        <button class="checkout-button" onclick="handleCheckout()">Check out!</button>
      </div>
    </div>
  </div>

  <script>
    ${getCatalogScript(products, port)}
  </script>
</body>
</html>
  `;
}

function getCatalogStyles(): string {
  return `
    /* ===== BASE STYLES ===== */
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      padding: 20px;
      margin: 0;
      background: #f8f9fa;
      overflow-y: hidden;
    }
    html {
      overflow-y: hidden;
    }

    /* ===== HEADER ===== */
    .catalog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    h2 {
      margin: 0;
      color: #1a202c;
      font-size: 24px;
      font-weight: 700;
    }
    .cart-icon-button {
      position: relative;
      background: white;
      border: 2px solid #e2e8f0;
      border-radius: 50%;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .cart-icon-button:hover {
      background: #f8f9fa;
      border-color: #cbd5e0;
      transform: scale(1.05);
    }
    .cart-icon-button svg {
      width: 24px;
      height: 24px;
      stroke: #1a202c;
      stroke-width: 2;
      fill: none;
    }
    .cart-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #dc3545;
      color: white;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
    }

    /* ===== CAROUSEL STYLES ===== */
    .catalog-container {
      display: flex;
      gap: 20px;
      overflow-x: auto;
      padding: 20px 0;
      scroll-snap-type: x mandatory;
      scrollbar-width: thin;
      scrollbar-color: #cbd5e0 #f1f5f9;
    }
    .catalog-container::-webkit-scrollbar {
      height: 8px;
    }
    .catalog-container::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 4px;
    }
    .catalog-container::-webkit-scrollbar-thumb {
      background: #cbd5e0;
      border-radius: 4px;
    }
    .catalog-container::-webkit-scrollbar-thumb:hover {
      background: #a0aec0;
    }
    .product-card {
      flex: 0 0 280px;
      scroll-snap-align: start;
    }
    .product-image-container {
      position: relative;
      width: 100%;
      height: 280px;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: pointer;
    }
    .product-image-container:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 12px rgba(0, 0, 0, 0.15);
    }
    .product-image-container img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: filter 0.3s;
    }
    .product-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s;
    }
    .product-image-container:hover .product-overlay {
      opacity: 1;
    }
    .product-name {
      color: white;
      font-size: 18px;
      font-weight: 600;
      text-align: center;
      padding: 0 20px;
      letter-spacing: 0.3px;
    }

    /* ===== MODAL STYLES ===== */
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1000;
      align-items: center;
      justify-content: center;
    }
    .modal.active {
      display: flex;
    }
    .modal-backdrop {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(8px);
    }
    .modal-content {
      position: relative;
      background: white;
      border-radius: 16px;
      width: 90%;
      max-width: 900px;
      max-height: 90vh;
      overflow: hidden;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      display: flex;
      animation: modalSlideIn 0.3s ease-out;
    }
    @keyframes modalSlideIn {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    /* ===== MODAL CLOSE BUTTON ===== */
    .modal-close {
      position: absolute;
      top: 16px;
      right: 16px;
      width: 36px;
      height: 36px;
      border: none;
      background: rgba(0, 0, 0, 0.6);
      color: white;
      font-size: 24px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
      z-index: 10;
      line-height: 1;
      padding: 0;
    }
    .modal-close:hover {
      background: rgba(0, 0, 0, 0.8);
    }

    /* ===== MODAL LEFT (IMAGE) ===== */
    .modal-left {
      flex: 0 0 45%;
      background: #f8f9fa;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .modal-left img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* ===== MODAL RIGHT (DETAILS) ===== */
    .modal-right {
      flex: 1;
      padding: 40px;
      overflow-y: auto;
    }
    .modal-right h3 {
      margin: 0 0 16px 0;
      font-size: 28px;
      font-weight: 700;
      color: #1a202c;
    }
    .price {
      font-size: 32px;
      font-weight: 700;
      color: #2d3748;
      margin-bottom: 16px;
    }
    .rating {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 20px;
      padding-bottom: 20px;
      border-bottom: 1px solid #e2e8f0;
    }
    .stars {
      color: #f59e0b;
      font-size: 18px;
      letter-spacing: 2px;
    }
    .rating-text {
      color: #64748b;
      font-size: 14px;
    }
    .description {
      color: #4a5568;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 24px;
      padding-bottom: 24px;
      border-bottom: 1px solid #e2e8f0;
    }

    /* ===== PRODUCT DETAILS TABLE ===== */
    .details {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
    }
    .detail-label {
      font-weight: 600;
      color: #64748b;
      font-size: 14px;
    }
    .detail-value {
      color: #1a202c;
      font-size: 14px;
      text-align: right;
    }

    /* ===== CART BUTTON ===== */
    .cart-button {
      width: 100%;
      padding: 16px 24px;
      font-size: 16px;
      font-weight: 600;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
      background: #007bff;
      color: white;
    }
    .cart-button:hover {
      background: #0056b3;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 123, 255, 0.3);
    }
    .cart-button:active {
      transform: translateY(0);
    }
    .cart-button.in-cart {
      background: #dc3545;
    }
    .cart-button.in-cart:hover {
      background: #c82333;
      box-shadow: 0 4px 8px rgba(220, 53, 69, 0.3);
    }
    .cart-button:disabled {
      background: #28a745;
      cursor: not-allowed;
      transform: none;
    }

    /* ===== CART MODAL STYLES ===== */
    #cart-modal .modal-content {
      max-width: 600px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
    }
    .cart-modal-header {
      padding: 24px;
      border-bottom: 2px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }
    .cart-modal-header h3 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      color: #1a202c;
    }
    .cart-modal-body {
      padding: 24px;
      overflow-y: auto;
      flex: 1;
      min-height: 0;
    }
    .cart-empty {
      text-align: center;
      padding: 40px 20px;
      color: #64748b;
    }
    .cart-item {
      display: flex;
      gap: 16px;
      padding: 16px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      margin-bottom: 12px;
      transition: background 0.2s;
    }
    .cart-item:hover {
      background: #f8f9fa;
    }
    .cart-item-image {
      width: 80px;
      height: 80px;
      border-radius: 8px;
      object-fit: cover;
      flex-shrink: 0;
    }
    .cart-item-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .cart-item-name {
      font-weight: 600;
      color: #1a202c;
      font-size: 16px;
      margin-bottom: 4px;
    }
    .cart-item-price {
      color: #64748b;
      font-size: 14px;
    }
    .cart-item-remove {
      background: #dc3545;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.2s;
      align-self: flex-start;
    }
    .cart-item-remove:hover {
      background: #c82333;
    }
    .cart-total {
      padding: 16px;
      border-top: 2px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8f9fa;
      flex-shrink: 0;
    }
    .cart-total-label {
      font-size: 14px;
      font-weight: 600;
      color: #64748b;
    }
    .cart-total-amount {
      font-size: 20px;
      font-weight: 700;
      color: #1a202c;
    }
    .cart-checkout {
      padding: 20px 24px;
      border-top: 2px solid #e2e8f0;
      background: #ffffff;
      flex-shrink: 0;
    }
    .checkout-button {
      width: 100%;
      padding: 14px 24px;
      font-size: 16px;
      font-weight: 600;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
      background: #28a745;
      color: white;
    }
    .checkout-button:hover {
      background: #218838;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);
    }
    .checkout-button:active {
      transform: translateY(0);
    }
  `;
}

function getCatalogScript(products: Product[], port: number): string {
  return `
    // Product data embedded in page
    const PRODUCTS = ${JSON.stringify(products.reduce((acc, p) => { acc[p.id] = p; return acc; }, {} as Record<string, any>))};
    const PORT = ${port};

    // Open product modal
    function openModal(productId) {
      const modal = document.getElementById('modal-' + productId);
      if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    }

    // Close product modal
    function closeModal(productId) {
      const modal = document.getElementById('modal-' + productId);
      if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      }
    }

    // Open cart modal
    async function openCartModal() {
      const modal = document.getElementById('cart-modal');
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      await loadCartContents();
    }

    // Close cart modal
    function closeCartModal() {
      const modal = document.getElementById('cart-modal');
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }

    // Load cart contents from server
    async function loadCartContents() {
      try {
        const response = await fetch('http://localhost:' + PORT + '/cart');
        const data = await response.json();
        const cartProducts = data.products || [];

        const container = document.getElementById('cart-items-container');
        const totalSection = document.getElementById('cart-total-section');
        const totalAmount = document.getElementById('cart-total-amount');
        const checkoutSection = document.getElementById('cart-checkout-section');

        if (cartProducts.length === 0) {
          container.innerHTML = '<div class="cart-empty">Your cart is empty</div>';
          totalSection.style.display = 'none';
          checkoutSection.style.display = 'none';
          updateCartBadge(0);
          return;
        }

        // Calculate total and render items using full product details from server
        let total = 0;
        const itemsHtml = cartProducts.map(product => {
          if (!product) return '';

          total += product.base_price;
          const priceFormatted = (product.base_price / 100).toFixed(2);

          return \`
            <div class="cart-item">
              <img src="\${product.image_url}" alt="\${product.name}" class="cart-item-image" />
              <div class="cart-item-details">
                <div>
                  <div class="cart-item-name">\${product.name}</div>
                  <div class="cart-item-price">$\${priceFormatted}</div>
                </div>
              </div>
              <button class="cart-item-remove" onclick="removeFromCartInModal('\${product.id}')">Remove</button>
            </div>
          \`;
        }).join('');

        container.innerHTML = itemsHtml;
        totalAmount.textContent = '$' + (total / 100).toFixed(2);
        totalSection.style.display = 'flex';
        checkoutSection.style.display = 'block';
        updateCartBadge(cartProducts.length);
      } catch (error) {
        console.error('Error loading cart:', error);
      }
    }

    // Handle checkout button click
    function handleCheckout() {
      console.log('Triggering checkout flow');
      window.parent.postMessage({
        type: 'tool',
        payload: {
          toolName: 'collect_buyer_info',
          params: {}
        }
      }, '*');
    }

    // Remove item from cart (called from cart modal)
    async function removeFromCartInModal(productId) {
      try {
        const response = await fetch('http://localhost:' + PORT + '/cart/remove', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId })
        });

        if (response.ok) {
          // Reload cart contents
          await loadCartContents();

          // Update the product modal button if it exists
          const productButton = document.getElementById('cart-btn-' + productId);
          if (productButton) {
            productButton.classList.remove('in-cart');
            productButton.textContent = 'Add to Cart';
            productButton.disabled = false;
          }
        }
      } catch (error) {
        console.error('Error removing from cart:', error);
      }
    }

    // Update cart badge
    function updateCartBadge(count) {
      const badge = document.getElementById('cart-badge');
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }

    // Initialize cart badge on load
    (async function() {
      try {
        const response = await fetch('http://localhost:' + PORT + '/cart');
        const data = await response.json();
        updateCartBadge(data.cart.length);
      } catch (error) {
        console.error('Error initializing cart badge:', error);
      }
    })();

    // Toggle cart - add or remove item
    async function toggleCart(productId) {
      const button = document.getElementById('cart-btn-' + productId);
      const isInCart = button.classList.contains('in-cart');

      // Disable button during request
      button.disabled = true;

      try {
        if (isInCart) {
          // Remove from cart
          const response = await fetch('http://localhost:' + PORT + '/cart/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId })
          });

          if (response.ok) {
            const data = await response.json();
            button.classList.remove('in-cart');
            button.textContent = 'Add to Cart';
            button.disabled = false;
            updateCartBadge(data.cart.length);
          }
        } else {
          // Add to cart
          const response = await fetch('http://localhost:' + PORT + '/cart/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId })
          });

          if (response.ok) {
            const data = await response.json();
            // Show "Added to cart!" briefly
            button.textContent = 'Added to Cart!';

            setTimeout(() => {
              button.classList.add('in-cart');
              button.textContent = 'Remove from Cart';
              button.disabled = false;
            }, 1000);
            updateCartBadge(data.cart.length);
          }
        }
      } catch (error) {
        console.error('Error toggling cart:', error);
        button.disabled = false;
      }
    }

    // Close modal on Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        const activeModal = document.querySelector('.modal.active');
        if (activeModal) {
          const modalId = activeModal.id;
          if (modalId === 'cart-modal') {
            closeCartModal();
          } else {
            const productId = modalId.replace('modal-', '');
            closeModal(productId);
          }
        }
      }
    });
  `;
}
