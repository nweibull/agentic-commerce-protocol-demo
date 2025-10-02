import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createUIResource } from '@mcp-ui/server';
import { MerchantSessionService } from '../services/MerchantSessionService.js';

export function registerCollectPaymentDetailsTool(
  server: McpServer,
  merchantService: MerchantSessionService,
  sessionId: string,
  port: number
) {
  server.registerTool('collect_payment_details', {
    title: 'Collect Payment Details',
    description: 'Collects payment information from the user. Do NOT describe the content of the form. You stop sending messages after this tool call.',
    inputSchema: {},
  }, async () => {
    // Check if user has an active session
    if (!merchantService.hasActiveSession(sessionId)) {
      return {
        content: [{
          type: 'text',
          text: 'Error: No active checkout session. Please add items to your cart first.',
        }],
        isError: true,
      };
    }

    // Check if user has provided contact info and shipping address
    if (!merchantService.hasCompleteContactInfo(sessionId)) {
      return {
        content: [{
          type: 'text',
          text: 'Error: Please provide your contact information (first name, last name, and email) first.',
        }],
        isError: true,
      };
    }

    if (!merchantService.hasShippingAddress(sessionId)) {
      return {
        content: [{
          type: 'text',
          text: 'Error: Please provide your shipping address first.',
        }],
        isError: true,
      };
    }

    // Get session info
    const currentSession = merchantService.getActiveSession(sessionId);
    const totalAmount = currentSession?.totals?.find(t => t.type === 'total')?.amount || 0;
    const PORT = port;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px;
      margin: 0;
      background: #f8f9fa;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .payment-container {
      background: white;
      padding: 40px;
      border-radius: 16px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      max-width: 500px;
      width: 100%;
    }
    h1 {
      margin: 0 0 8px 0;
      color: #1a202c;
      font-size: 28px;
      font-weight: 700;
    }
    .subtitle {
      color: #64748b;
      font-size: 14px;
      margin-bottom: 24px;
    }
    .total-display {
      background: #f8f9fa;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .total-label {
      font-weight: 600;
      color: #64748b;
    }
    .total-amount {
      font-size: 24px;
      font-weight: 700;
      color: #1a202c;
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      margin-bottom: 8px;
      color: #1a202c;
      font-weight: 600;
      font-size: 14px;
    }
    input, select {
      width: 100%;
      padding: 12px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 16px;
      transition: border-color 0.2s;
      background-color: white;
    }
    input:focus, select:focus {
      outline: none;
      border-color: #007bff;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
    }
    .button {
      width: 100%;
      padding: 14px 24px;
      font-size: 16px;
      font-weight: 600;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
      margin-top: 8px;
      background: #28a745;
      color: white;
    }
    .button:hover {
      background: #218838;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);
    }
    .button:active {
      transform: translateY(0);
    }
    .button:disabled {
      background: #6c757d;
      cursor: not-allowed;
      transform: none;
    }
    .error {
      color: #dc3545;
      font-size: 14px;
      margin-top: 4px;
    }
    .hidden {
      display: none;
    }
    .secure-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: #64748b;
      font-size: 12px;
      margin-top: 16px;
    }
    .test-notice {
      background: #fff3cd;
      border: 1px solid #ffc107;
      color: #856404;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 14px;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }
    .test-button {
      background: #ffc107;
      color: #856404;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .test-button:hover {
      background: #ffb300;
    }
  </style>
</head>
<body>
  <div class="payment-container">
    <h1>💳 Payment</h1>
    <div class="subtitle">Secure payment processing</div>

    <div class="test-notice">
      <strong>Test Mode</strong>
      <button class="test-button" onclick="fillTestData()">Use Test Data</button>
    </div>

    <div class="total-display">
      <span class="total-label">Total Amount:</span>
      <span class="total-amount">$${(totalAmount / 100).toFixed(2)}</span>
    </div>

    <div class="form-group">
      <label for="cardName">Cardholder Name *</label>
      <input type="text" id="cardName" required placeholder="John Doe">
      <div id="cardNameError" class="error hidden">Cardholder name is required</div>
    </div>

    <div class="form-group">
      <label for="cardNumber">Card Number *</label>
      <input type="text" id="cardNumber" required placeholder="4242 4242 4242 4242" maxlength="19">
      <div id="cardNumberError" class="error hidden">Valid card number is required</div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="expMonth">Month *</label>
        <select id="expMonth" required>
          <option value="">MM</option>
          <option value="01">01</option>
          <option value="02">02</option>
          <option value="03">03</option>
          <option value="04">04</option>
          <option value="05">05</option>
          <option value="06">06</option>
          <option value="07">07</option>
          <option value="08">08</option>
          <option value="09">09</option>
          <option value="10">10</option>
          <option value="11">11</option>
          <option value="12">12</option>
        </select>
      </div>
      <div class="form-group">
        <label for="expYear">Year *</label>
        <select id="expYear" required>
          <option value="">YYYY</option>
          <option value="2025">2025</option>
          <option value="2026">2026</option>
          <option value="2027">2027</option>
          <option value="2028">2028</option>
          <option value="2029">2029</option>
          <option value="2030">2030</option>
        </select>
      </div>
      <div class="form-group">
        <label for="cvc">CVC *</label>
        <input type="text" id="cvc" required placeholder="123" maxlength="4">
      </div>
    </div>
    <div id="expiryError" class="error hidden">Expiry date is required</div>
    <div id="cvcError" class="error hidden">CVC is required</div>

    <button class="button" onclick="processPayment()" id="payButton">
      Complete Purchase - $${(totalAmount / 100).toFixed(2)}
    </button>

    <div class="secure-badge">
      NOT secure - do not enter real info!
    </div>
  </div>

  <script>
    const totalAmount = ${totalAmount};

    // Fill form with test data
    function fillTestData() {
      document.getElementById('cardName').value = 'Test User';
      document.getElementById('cardNumber').value = '4242 4242 4242 4242';
      document.getElementById('expMonth').value = '12';
      document.getElementById('expYear').value = '2030';
      document.getElementById('cvc').value = '123';
    }

    // Format card number with spaces
    document.getElementById('cardNumber').addEventListener('input', (e) => {
      let value = e.target.value.replace(/\\s/g, '');
      let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
      e.target.value = formattedValue;
    });

    async function processPayment() {
      const button = document.getElementById('payButton');
      button.disabled = true;
      button.textContent = 'Processing...';

      // Hide all errors
      document.querySelectorAll('.error').forEach(el => el.classList.add('hidden'));

      // Get form values
      const cardName = document.getElementById('cardName').value.trim();
      const cardNumber = document.getElementById('cardNumber').value.replace(/\\s/g, '');
      const expMonth = document.getElementById('expMonth').value;
      const expYear = document.getElementById('expYear').value;
      const cvc = document.getElementById('cvc').value.trim();

      // Validate
      let isValid = true;
      if (!cardName) {
        document.getElementById('cardNameError').classList.remove('hidden');
        isValid = false;
      }
      if (!cardNumber || cardNumber.length < 13) {
        document.getElementById('cardNumberError').classList.remove('hidden');
        isValid = false;
      }
      if (!expMonth || !expYear) {
        document.getElementById('expiryError').classList.remove('hidden');
        isValid = false;
      }
      if (!cvc || cvc.length < 3) {
        document.getElementById('cvcError').classList.remove('hidden');
        isValid = false;
      }

      if (!isValid) {
        button.disabled = false;
        button.textContent = \`Complete Purchase - $\${(totalAmount / 100).toFixed(2)}\`;
        return;
      }

      try {
        // Process payment via server (handles PSP delegation + merchant completion)
        console.log('Processing payment...', {
          cardName,
          cardNumber: cardNumber.slice(0, 4) + '****',
          expMonth,
          expYear,
          cvc: '***'
        });
        const response = await fetch('http://localhost:' + ${PORT} + '/payment/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cardName,
            cardNumber,
            expMonth,
            expYear,
            cvc
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Payment failed');
        }

        const result = await response.json();
        console.log('Payment completed successfully');

        // Success!
        button.textContent = '✓ Payment Successful!';
        button.style.background = '#28a745';

        setTimeout(() => {
          alert('Payment completed successfully! Order ID: ' + result.orderId);
        }, 500);

      } catch (error) {
        console.error('Payment error:', error);
        alert('Payment failed: ' + error.message);
        button.disabled = false;
        button.textContent = \`Complete Purchase - $\${(totalAmount / 100).toFixed(2)}\`;
      }
    }
  </script>
</body>
</html>
    `;

    const uiResource = createUIResource({
      uri: `ui://payment/${Date.now()}` as `ui://${string}`,
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
