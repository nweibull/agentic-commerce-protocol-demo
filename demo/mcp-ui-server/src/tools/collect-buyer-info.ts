import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createUIResource } from '@mcp-ui/server';
import { MerchantSessionService } from '../services/MerchantSessionService.js';

export function registerCollectBuyerInfoTool(
  server: McpServer,
  merchantService: MerchantSessionService,
  sessionId: string,
  port: number
) {
  server.registerTool('collect_buyer_info', {
    title: 'Collect Buyer Info',
    description: 'Collects buyer contact information and shipping address for checkout. Do NOT describe the content of the form. You stop sending messages after this tool call.',
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

    // Get the current session ID from the merchant service
    const currentSession = merchantService.getActiveSession(sessionId);
    const checkoutSessionId = currentSession?.id || '';
    const PORT = port;
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      padding: 20px;
      margin: 0;
      background: #f8f9fa;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .checkout-container {
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
    .step-indicator {
      color: #64748b;
      font-size: 14px;
      margin-bottom: 24px;
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
    }
    .button-primary {
      background: #007bff;
      color: white;
    }
    .button-primary:hover {
      background: #0056b3;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 123, 255, 0.3);
    }
    .button-primary:active {
      transform: translateY(0);
    }
    .button-secondary {
      background: #6c757d;
      color: white;
    }
    .button-secondary:hover {
      background: #5a6268;
    }
    .hidden {
      display: none;
    }
    .review-section {
      background: #f8f9fa;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .review-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
    }
    .review-item:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }
    .review-label {
      font-weight: 600;
      color: #64748b;
    }
    .review-value {
      color: #1a202c;
      text-align: right;
    }
    .error {
      color: #dc3545;
      font-size: 14px;
      margin-top: 4px;
    }
    .test-notice {
      background: #e3f2fd;
      border: 1px solid #2196f3;
      color: #1565c0;
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
      background: #2196f3;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .test-button:hover {
      background: #1976d2;
    }
  </style>
</head>
<body>
  <div class="checkout-container">
    <!-- Step 1: Buyer Info -->
    <div id="step-buyer" class="step">
      <h1>Checkout</h1>
      <div class="step-indicator">Step 1 of 3: Your Information</div>

      <div class="test-notice">
        <strong>Test Mode</strong>
        <button class="test-button" onclick="fillTestBuyerInfo()">Use Test Data</button>
      </div>

      <div class="form-group">
        <label for="firstName">First Name *</label>
        <input type="text" id="firstName" required>
        <div id="firstNameError" class="error hidden">First name is required</div>
      </div>

      <div class="form-group">
        <label for="lastName">Last Name *</label>
        <input type="text" id="lastName" required>
        <div id="lastNameError" class="error hidden">Last name is required</div>
      </div>

      <div class="form-group">
        <label for="email">Email *</label>
        <input type="email" id="email" required>
        <div id="emailError" class="error hidden">Valid email is required</div>
      </div>

      <div class="form-group">
        <label for="phone">Phone Number (optional)</label>
        <input type="tel" id="phone">
      </div>

      <button class="button button-primary" onclick="goToShipping()">Next: Shipping Address →</button>
    </div>

    <!-- Step 2: Shipping Address -->
    <div id="step-shipping" class="step hidden">
      <h1>Checkout</h1>
      <div class="step-indicator">Step 2 of 3: Shipping Address</div>

      <div class="test-notice">
        <strong>Test Mode</strong>
        <button class="test-button" onclick="fillTestAddress()">Use Test Data</button>
      </div>

      <div class="form-group">
        <label for="addressLine1">Address Line 1 *</label>
        <input type="text" id="addressLine1" required>
        <div id="addressLine1Error" class="error hidden">Address is required</div>
      </div>

      <div class="form-group">
        <label for="addressLine2">Address Line 2 (optional)</label>
        <input type="text" id="addressLine2">
      </div>

      <div class="form-group">
        <label for="city">City *</label>
        <input type="text" id="city" required>
        <div id="cityError" class="error hidden">City is required</div>
      </div>

      <div class="form-group">
        <label for="country">Country *</label>
        <select id="country" required onchange="updateStateOptions()">
          <option value="US">United States</option>
          <option value="CA">Canada</option>
        </select>
        <div id="countryError" class="error hidden">Country is required</div>
      </div>

      <div class="form-group">
        <label for="state">State/Province *</label>
        <select id="state" required>
          <option value="">Select a state...</option>
        </select>
        <div id="stateError" class="error hidden">State is required</div>
      </div>

      <div class="form-group">
        <label for="postalCode">Postal/ZIP Code *</label>
        <input type="text" id="postalCode" required>
        <div id="postalCodeError" class="error hidden">Postal code is required</div>
      </div>

      <button class="button button-secondary" onclick="goToBuyer()">← Back</button>
      <button class="button button-primary" onclick="goToReview()">Next: Review →</button>
    </div>

    <!-- Step 3: Review -->
    <div id="step-review" class="step hidden">
      <h1>Checkout</h1>
      <div class="step-indicator">Step 3 of 3: Review Your Information</div>

      <div class="review-section">
        <h3 style="margin-top: 0; margin-bottom: 16px; color: #1a202c;">Contact Information</h3>
        <div class="review-item">
          <span class="review-label">Name:</span>
          <span class="review-value" id="reviewName"></span>
        </div>
        <div class="review-item">
          <span class="review-label">Email:</span>
          <span class="review-value" id="reviewEmail"></span>
        </div>
        <div class="review-item" id="reviewPhoneItem" style="display: none;">
          <span class="review-label">Phone:</span>
          <span class="review-value" id="reviewPhone"></span>
        </div>
      </div>

      <div class="review-section">
        <h3 style="margin-top: 0; margin-bottom: 16px; color: #1a202c;">Shipping Address</h3>
        <div class="review-item">
          <span class="review-label">Address:</span>
          <span class="review-value" id="reviewAddress"></span>
        </div>
        <div class="review-item">
          <span class="review-label">City:</span>
          <span class="review-value" id="reviewCity"></span>
        </div>
        <div class="review-item">
          <span class="review-label">State:</span>
          <span class="review-value" id="reviewState"></span>
        </div>
        <div class="review-item">
          <span class="review-label">Country:</span>
          <span class="review-value" id="reviewCountry"></span>
        </div>
        <div class="review-item">
          <span class="review-label">Postal Code:</span>
          <span class="review-value" id="reviewPostalCode"></span>
        </div>
      </div>

      <p style="text-align: center; color: #64748b; margin-bottom: 20px;">Does this look right?</p>

      <button class="button button-secondary" onclick="goToShipping()">← Back</button>
      <button class="button button-primary" onclick="confirmAndProceed()">Confirm & Continue to Payment →</button>
    </div>
  </div>

  <script>
    // Checkout session ID from merchant
    const checkoutSessionId = '${checkoutSessionId}';

    // Form data storage
    const formData = {
      buyer: {},
      shipping: {}
    };

    // US States
    const US_STATES = {
      'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
      'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
      'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
      'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
      'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
      'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
      'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
      'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
      'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
      'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
    };

    // Canadian Provinces
    const CA_PROVINCES = {
      'AB': 'Alberta', 'BC': 'British Columbia', 'MB': 'Manitoba', 'NB': 'New Brunswick',
      'NL': 'Newfoundland and Labrador', 'NS': 'Nova Scotia', 'NT': 'Northwest Territories',
      'NU': 'Nunavut', 'ON': 'Ontario', 'PE': 'Prince Edward Island', 'QC': 'Quebec',
      'SK': 'Saskatchewan', 'YT': 'Yukon'
    };

    // Update state options based on country
    function updateStateOptions() {
      const country = document.getElementById('country').value;
      const stateSelect = document.getElementById('state');
      const states = country === 'US' ? US_STATES : CA_PROVINCES;

      // Clear existing options
      stateSelect.innerHTML = '<option value="">Select a state...</option>';

      // Add new options
      Object.entries(states).forEach(([code, name]) => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = name;
        stateSelect.appendChild(option);
      });
    }

    // Initialize state options on load
    updateStateOptions();

    // Fill test data functions
    function fillTestBuyerInfo() {
      document.getElementById('firstName').value = 'John';
      document.getElementById('lastName').value = 'Doe';
      document.getElementById('email').value = 'john.doe@example.com';
      document.getElementById('phone').value = '+15551234567';
    }

    function fillTestAddress() {
      document.getElementById('addressLine1').value = '123 Main Street';
      document.getElementById('addressLine2').value = 'Apt 4B';
      document.getElementById('city').value = 'San Francisco';
      document.getElementById('country').value = 'US';
      updateStateOptions();
      document.getElementById('state').value = 'CA';
      document.getElementById('postalCode').value = '94102';
    }

    // Validation helpers
    function validateEmail(email) {
      return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
    }

    function showError(elementId) {
      document.getElementById(elementId).classList.remove('hidden');
    }

    function hideError(elementId) {
      document.getElementById(elementId).classList.add('hidden');
    }

    function hideAllErrors() {
      document.querySelectorAll('.error').forEach(el => el.classList.add('hidden'));
    }

    // Step navigation
    function showStep(stepId) {
      document.querySelectorAll('.step').forEach(step => step.classList.add('hidden'));
      document.getElementById(stepId).classList.remove('hidden');
      hideAllErrors();
    }

    function goToBuyer() {
      showStep('step-buyer');
    }

    async function goToShipping() {
      // Validate buyer info
      const firstName = document.getElementById('firstName').value.trim();
      const lastName = document.getElementById('lastName').value.trim();
      const email = document.getElementById('email').value.trim();
      const phone = document.getElementById('phone').value.trim();

      let isValid = true;

      if (!firstName) {
        showError('firstNameError');
        isValid = false;
      }
      if (!lastName) {
        showError('lastNameError');
        isValid = false;
      }
      if (!email || !validateEmail(email)) {
        showError('emailError');
        isValid = false;
      }

      if (!isValid) return;

      // Store buyer info
      formData.buyer = {
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone_number: phone || undefined
      };

      // Update session with buyer info via MCP server
      try {
        const response = await fetch('http://localhost:' + ${PORT} + '/checkout/buyer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ buyer: formData.buyer })
        });
        if (response.ok) {
          console.log('Updated buyer info');
        } else {
          const error = await response.json();
          console.error('Failed to update buyer info:', error);
        }
      } catch (error) {
        console.error('Failed to update buyer info:', error);
      }

      showStep('step-shipping');
    }

    async function goToReview() {
      // Validate shipping info
      const addressLine1 = document.getElementById('addressLine1').value.trim();
      const addressLine2 = document.getElementById('addressLine2').value.trim();
      const city = document.getElementById('city').value.trim();
      const state = document.getElementById('state').value.trim();
      const country = document.getElementById('country').value.trim();
      const postalCode = document.getElementById('postalCode').value.trim();

      let isValid = true;

      if (!addressLine1) {
        showError('addressLine1Error');
        isValid = false;
      }
      if (!city) {
        showError('cityError');
        isValid = false;
      }
      if (!state) {
        showError('stateError');
        isValid = false;
      }
      if (!country) {
        showError('countryError');
        isValid = false;
      }
      if (!postalCode) {
        showError('postalCodeError');
        isValid = false;
      }

      if (!isValid) return;

      // Store shipping info
      formData.shipping = {
        name: \`\${formData.buyer.first_name} \${formData.buyer.last_name}\`,
        line_one: addressLine1,
        line_two: addressLine2 || undefined,
        city: city,
        state: state,
        country: country,
        postal_code: postalCode
      };

      // Update session with shipping address via MCP server
      try {
        const requestBody = { fulfillment_address: formData.shipping };
        console.log('Sending shipping update:', JSON.stringify(requestBody, null, 2));

        const response = await fetch('http://localhost:' + ${PORT} + '/checkout/shipping', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });

        const responseData = await response.json();
        console.log('Shipping update response:', responseData);

        if (response.ok) {
          console.log('Updated shipping info. Session:', responseData);
        } else {
          console.error('Failed to update shipping info. Status:', response.status, 'Error:', responseData);
          alert('Failed to update shipping address. Check console for details.');
        }
      } catch (error) {
        console.error('Failed to update shipping info:', error);
        alert('Network error updating shipping address.');
      }

      // Populate review
      document.getElementById('reviewName').textContent = \`\${formData.buyer.first_name} \${formData.buyer.last_name}\`;
      document.getElementById('reviewEmail').textContent = formData.buyer.email;

      if (formData.buyer.phone_number) {
        document.getElementById('reviewPhone').textContent = formData.buyer.phone_number;
        document.getElementById('reviewPhoneItem').style.display = 'flex';
      }

      const addressParts = [addressLine1];
      if (addressLine2) addressParts.push(addressLine2);
      document.getElementById('reviewAddress').textContent = addressParts.join(', ');
      document.getElementById('reviewCity').textContent = city;

      // Display state name, not code
      const states = country === 'US' ? US_STATES : CA_PROVINCES;
      document.getElementById('reviewState').textContent = states[state] || state;

      // Display country name, not code
      const countryNames = { 'US': 'United States', 'CA': 'Canada' };
      document.getElementById('reviewCountry').textContent = countryNames[country] || country;

      document.getElementById('reviewPostalCode').textContent = postalCode;

      showStep('step-review');
    }

    function confirmAndProceed() {
      console.log('Confirmed! Proceeding to payment...');
      console.log('Form data:', formData);

      // Trigger the collect_payment_details tool
      window.parent.postMessage({
        type: 'tool',
        payload: {
          toolName: 'collect_payment_details',
          params: {}
        }
      }, '*');
    }
  </script>
</body>
</html>
    `;

    const uiResource = createUIResource({
      uri: `ui://checkout/${Date.now()}` as `ui://${string}`,
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
