import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '@/integrations/supabase/client';

export interface InvoiceData {
  order: {
    id: string;
    order_number: string;
    created_at: string;
    total_amount: number;
    discount_amount: number;
    discount_code: string | null;
    customer_info: any;
    shipping_address: any;
    delivery_details: any;
    status: string;
    order_items: any[];
  };
  companyInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
    logo?: string;
  };
}

// Generate unique document numbers
export const generateDocumentNumber = async (type: 'invoice' | 'receipt'): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = type === 'invoice' ? 'INV' : 'REC';
  
  // Get the latest document number for this year and type
  const { data, error } = await supabase
    .from('invoice_receipts')
    .select('document_number')
    .like('document_number', `${prefix}-${year}-%`)
    .eq('document_type', type)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching latest document number:', error);
  }

  let nextNumber = 1;
  if (data && data.length > 0) {
    const lastNumber = data[0].document_number.split('-')[2];
    nextNumber = parseInt(lastNumber) + 1;
  }

  return `${prefix}-${year}-${nextNumber.toString().padStart(5, '0')}`;
};

// Save document metadata
export const saveDocumentMetadata = async (
  orderId: string,
  documentType: 'invoice' | 'receipt',
  documentNumber: string,
  generatedBy: string
) => {
  const { error } = await supabase
    .from('invoice_receipts')
    .insert({
      order_id: orderId,
      document_type: documentType,
      document_number: documentNumber,
      generated_by: generatedBy
    });

  if (error) {
    console.error('Error saving document metadata:', error);
    throw error;
  }
};

// Create the HTML content for an invoice
export const createInvoiceHTML = (data: InvoiceData, invoiceNumber: string): string => {
  const currentDate = new Date().toLocaleDateString();
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice #${invoiceNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #2d3748;
          background: #ffffff;
        }
        
        .invoice-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
          background: white;
          box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          
          .invoice-container {
            padding: 20px;
            box-shadow: none;
          }
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          padding-bottom: 25px;
          position: relative;
        }
        
        .header::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(135deg, #2d4a5e 0%, #5a9fb8 100%);
          border-radius: 2px;
        }
        
        .company-info {
          flex: 1;
        }
        
        .company-logo {
          font-size: 3rem;
          font-weight: bold;
          color: #2d3748;
          margin-bottom: 12px;
          background: linear-gradient(135deg, #2d4a5e 0%, #5a9fb8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .logo-crafts {
          color: #d4af84;
        }
        
        .company-tagline {
          color: #4a5568;
          font-style: italic;
          font-size: 0.95rem;
          margin-bottom: 8px;
        }
        
        .company-details {
          color: #4a5568;
          font-size: 0.9rem;
          line-height: 1.6;
        }
        
        .invoice-details {
          text-align: right;
          color: #4a5568;
          background: linear-gradient(145deg, #f8fafc 0%, #edf2f7 100%);
          padding: 25px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }
        
        .invoice-title {
          font-size: 2.2rem;
          font-weight: bold;
          background: linear-gradient(135deg, #2d4a5e 0%, #5a9fb8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 12px;
        }
        
        .invoice-number {
          font-size: 1.1rem;
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 8px;
        }
        
        .status-badge {
          background: linear-gradient(135deg, #48bb78 0%, #68d391 100%);
          color: white;
          padding: 8px 20px;
          border-radius: 25px;
          font-size: 0.85rem;
          font-weight: 600;
          display: inline-block;
          margin-top: 12px;
          box-shadow: 0 2px 8px rgba(72, 187, 120, 0.3);
        }
        
        .customer-section {
          margin: 35px 0;
          padding: 30px;
          background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        }
        
        .section-title {
          font-size: 1.3rem;
          font-weight: bold;
          color: #2d3748;
          margin-bottom: 20px;
          position: relative;
          padding-bottom: 8px;
        }
        
        .section-title::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 50px;
          height: 3px;
          background: linear-gradient(135deg, #2d4a5e 0%, #5a9fb8 100%);
          border-radius: 2px;
        }
        
        .customer-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 25px;
        }
        
        .customer-info p {
          margin: 6px 0;
          color: #4a5568;
          font-size: 0.95rem;
        }
        
        .customer-info strong {
          color: #2d3748;
          font-weight: 600;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 35px 0;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        
        .items-table th {
          background: linear-gradient(135deg, #2d4a5e 0%, #4a6572 100%);
          color: white;
          padding: 18px 15px;
          text-align: left;
          font-weight: 600;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .items-table td {
          padding: 16px 15px;
          border-bottom: 1px solid #e2e8f0;
          color: #4a5568;
          font-size: 0.9rem;
        }
        
        .items-table tr:nth-child(even) {
          background-color: #f8fafc;
        }
        
        .items-table tr:hover {
          background-color: #edf2f7;
          transform: translateY(-1px);
          transition: all 0.3s ease;
        }
        
        .text-right {
          text-align: right;
        }
        
        .font-medium {
          font-weight: 600;
          color: #2d3748;
        }
        
        .totals-section {
          margin-top: 35px;
          padding: 30px;
          background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        }
        
        .totals-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          color: #4a5568;
          font-size: 1rem;
        }
        
        .totals-row.grand-total {
          border-top: 3px solid #e2e8f0;
          margin-top: 20px;
          padding-top: 20px;
          font-size: 1.4rem;
          font-weight: bold;
          background: linear-gradient(135deg, #2d4a5e 0%, #5a9fb8 100%);
          color: white;
          padding: 20px 25px;
          border-radius: 12px;
          margin: 20px -10px 0;
          box-shadow: 0 4px 15px rgba(45, 74, 94, 0.3);
        }
        
        .delivery-section {
          margin: 25px 0;
          padding: 25px;
          background: linear-gradient(145deg, #f0fff4 0%, #c6f6d5 100%);
          border-radius: 16px;
          border-left: 5px solid #48bb78;
          box-shadow: 0 4px 15px rgba(72, 187, 120, 0.1);
        }
        
        .footer {
          margin-top: 60px;
          padding-top: 30px;
          border-top: 3px solid #e2e8f0;
          text-align: center;
          color: #4a5568;
        }
        
        .thank-you {
          font-size: 1.3rem;
          font-weight: 600;
          background: linear-gradient(135deg, #2d4a5e 0%, #5a9fb8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 20px;
        }
        
        .contact-info {
          font-size: 0.9rem;
          line-height: 1.6;
          color: #4a5568;
        }
        
        .brand-gradient {
          background: linear-gradient(135deg, #2d4a5e 0%, #5a9fb8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <div class="company-info">
            <div class="company-logo">
              jn<span class="logo-crafts">CRAFTS</span>
            </div>
            <div class="company-tagline">Premium Streetwear & Fashion</div>
            <div class="company-details">
              Nairobi, Kenya<br>
              Email: info@jncrafts.com<br>
              Phone: +254 700 000 000<br>
              Web: www.jncrafts.com
            </div>
          </div>
          <div class="invoice-details">
            <div class="invoice-title">INVOICE</div>
            <div class="invoice-number">#${invoiceNumber}</div>
            <p><strong>Date:</strong> ${currentDate}</p>
            <div class="status-badge">${data.order.status.toUpperCase()}</div>
          </div>
        </div>

        <div class="customer-section">
          <div class="section-title">Customer Information</div>
          <div class="customer-grid">
            <div class="customer-info">
              <p><strong>Name:</strong> ${data.order.customer_info.fullName}</p>
              <p><strong>Email:</strong> ${data.order.customer_info.email}</p>
              <p><strong>Phone:</strong> ${data.order.customer_info.phone}</p>
            </div>
            <div class="customer-info">
              <p><strong>Order #:</strong> ${data.order.order_number}</p>
              <p><strong>Order Date:</strong> ${new Date(data.order.created_at).toLocaleDateString()}</p>
              <p><strong>Payment Status:</strong> <span class="brand-gradient">Paid</span></p>
            </div>
          </div>
        </div>

        ${data.order.shipping_address ? `
        <div class="delivery-section">
          <div class="section-title">Shipping Address</div>
          <p><strong>${data.order.shipping_address.address}</strong></p>
          <p>${data.order.shipping_address.city}, ${data.order.shipping_address.county}</p>
          <p>${data.order.shipping_address.country}</p>
        </div>
        ` : ''}

        <table class="items-table">
          <thead>
            <tr>
              <th>Product Details</th>
              <th>Size</th>
              <th>Color</th>
              <th class="text-right">Qty</th>
              <th class="text-right">Unit Price</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${data.order.order_items.map((item: any) => `
              <tr>
                <td class="font-medium">${item.product_name}</td>
                <td><span class="font-medium">${item.size}</span></td>
                <td><span class="font-medium">${item.color}</span></td>
                <td class="text-right font-medium">${item.quantity}</td>
                <td class="text-right">KSh ${Number(item.price).toFixed(2)}</td>
                <td class="text-right font-medium">KSh ${(Number(item.price) * item.quantity).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals-section">
          <div class="totals-row">
            <span><strong>Subtotal:</strong></span>
            <span><strong>KSh ${(Number(data.order.total_amount) - Number(data.order.discount_amount || 0)).toFixed(2)}</strong></span>
          </div>
          ${data.order.discount_amount > 0 ? `
          <div class="totals-row">
            <span>Discount${data.order.discount_code ? ` (${data.order.discount_code})` : ''}:</span>
            <span style="color: #e53e3e;">-KSh ${Number(data.order.discount_amount).toFixed(2)}</span>
          </div>
          ` : ''}
          <div class="totals-row">
            <span>Delivery Fee:</span>
            <span>KSh 0.00</span>
          </div>
          <div class="totals-row grand-total">
            <span>TOTAL AMOUNT:</span>
            <span>KSh ${Number(data.order.total_amount).toFixed(2)}</span>
          </div>
        </div>

        <div class="footer">
          <div class="thank-you">Thank you for choosing jnCrafts!</div>
          <div class="contact-info">
            For any inquiries, please contact us at <strong>info@jncrafts.com</strong> or visit <strong>www.jncrafts.com</strong><br>
            Follow us on social media <strong>@jncrafts</strong> for latest collections and updates<br><br>
            <em>This invoice was generated on ${currentDate} and serves as your official receipt.</em>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Create the HTML content for a receipt
export const createReceiptHTML = (data: InvoiceData, receiptNumber: string): string => {
  const currentDate = new Date().toLocaleDateString();
  const currentTime = new Date().toLocaleTimeString();
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Receipt #${receiptNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.5;
          color: #2d3748;
          background: #ffffff;
        }
        
        .receipt-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 35px;
          background: white;
          box-shadow: 0 0 25px rgba(0,0,0,0.1);
          border-radius: 16px;
        }
        
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          
          .receipt-container {
            padding: 20px;
            box-shadow: none;
            border-radius: 0;
          }
        }
        
        .header {
          text-align: center;
          margin-bottom: 35px;
          padding-bottom: 25px;
          position: relative;
        }
        
        .header::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 100px;
          height: 4px;
          background: linear-gradient(135deg, #2d4a5e 0%, #5a9fb8 100%);
          border-radius: 2px;
        }
        
        .company-logo {
          font-size: 2.8rem;
          font-weight: bold;
          margin-bottom: 12px;
          background: linear-gradient(135deg, #2d4a5e 0%, #5a9fb8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .logo-crafts {
          color: #d4af84;
        }
        
        .receipt-title {
          font-size: 2rem;
          font-weight: bold;
          background: linear-gradient(135deg, #2d4a5e 0%, #5a9fb8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 15px 0 10px;
        }
        
        .receipt-subtitle {
          color: #4a5568;
          font-size: 1rem;
          font-style: italic;
        }
        
        .receipt-details {
          background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
          border-radius: 12px;
          padding: 25px;
          margin: 25px 0;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        }
        
        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 12px 0;
          color: #4a5568;
          font-size: 0.95rem;
        }
        
        .detail-row strong {
          color: #2d3748;
          font-weight: 600;
        }
        
        .customer-section {
          margin: 25px 0;
          padding: 25px;
          background: linear-gradient(145deg, #f0fff4 0%, #c6f6d5 100%);
          border-radius: 12px;
          border-left: 5px solid #48bb78;
          box-shadow: 0 4px 15px rgba(72, 187, 120, 0.1);
        }
        
        .section-title {
          font-size: 1.2rem;
          font-weight: bold;
          color: #2d3748;
          margin-bottom: 15px;
          position: relative;
          padding-bottom: 8px;
        }
        
        .section-title::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 40px;
          height: 2px;
          background: linear-gradient(135deg, #2d4a5e 0%, #5a9fb8 100%);
          border-radius: 2px;
        }
        
        .payment-summary {
          margin: 30px 0;
          padding: 30px;
          background: linear-gradient(135deg, #2d4a5e 0%, #5a9fb8 100%);
          color: white;
          border-radius: 16px;
          text-align: center;
          box-shadow: 0 8px 25px rgba(45, 74, 94, 0.3);
          position: relative;
          overflow: hidden;
        }
        
        .payment-summary::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 30% 20%, rgba(255,255,255,0.1) 0%, transparent 50%);
          pointer-events: none;
        }
        
        .amount-paid {
          font-size: 2.5rem;
          font-weight: bold;
          margin: 15px 0;
          text-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .payment-status {
          font-size: 1.1rem;
          font-weight: 600;
          background: rgba(255,255,255,0.2);
          padding: 10px 20px;
          border-radius: 25px;
          display: inline-block;
          margin-top: 15px;
          border: 2px solid rgba(255,255,255,0.3);
        }
        
        .balance-info {
          font-size: 1.1rem;
          margin-top: 10px;
          opacity: 0.9;
        }
        
        .footer {
          margin-top: 40px;
          text-align: center;
          color: #4a5568;
          font-size: 0.9rem;
          line-height: 1.6;
          padding-top: 25px;
          border-top: 2px solid #e2e8f0;
        }
        
        .thank-you {
          font-size: 1.2rem;
          font-weight: 600;
          background: linear-gradient(135deg, #2d4a5e 0%, #5a9fb8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 15px;
        }
        
        .transaction-id {
          font-family: 'Courier New', monospace;
          background: linear-gradient(145deg, #f8fafc 0%, #edf2f7 100%);
          padding: 8px 15px;
          border-radius: 8px;
          color: #2d3748;
          font-weight: 600;
          display: inline-block;
          margin: 5px 0;
          border: 1px solid #e2e8f0;
          font-size: 0.9rem;
        }
        
        .security-note {
          background: linear-gradient(145deg, #fffaf0 0%, #fef5e7 100%);
          border: 1px solid #f6ad55;
          border-radius: 8px;
          padding: 15px;
          margin: 20px 0;
          font-size: 0.85rem;
          color: #744210;
          text-align: left;
        }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="header">
          <div class="company-logo">
            jn<span class="logo-crafts">CRAFTS</span>
          </div>
          <div class="receipt-title">PAYMENT RECEIPT</div>
          <div class="receipt-subtitle">Official Transaction Record</div>
        </div>

        <div class="receipt-details">
          <div class="detail-row">
            <span><strong>Receipt Number:</strong></span>
            <span class="transaction-id">#${receiptNumber}</span>
          </div>
          <div class="detail-row">
            <span><strong>Order ID:</strong></span>
            <span><strong>${data.order.order_number}</strong></span>
          </div>
          <div class="detail-row">
            <span><strong>Date & Time:</strong></span>
            <span>${currentDate} at ${currentTime}</span>
          </div>
          <div class="detail-row">
            <span><strong>Payment Method:</strong></span>
            <span>Online Payment</span>
          </div>
          <div class="detail-row">
            <span><strong>Transaction ID:</strong></span>
            <span class="transaction-id">TXN${Date.now().toString().slice(-8)}</span>
          </div>
          <div class="detail-row">
            <span><strong>Order Status:</strong></span>
            <span style="color: #48bb78; font-weight: 600;">${data.order.status.toUpperCase()}</span>
          </div>
        </div>

        <div class="customer-section">
          <div class="section-title">Customer Details</div>
          <div class="detail-row">
            <span><strong>Name:</strong></span>
            <span>${data.order.customer_info.fullName}</span>
          </div>
          <div class="detail-row">
            <span><strong>Phone:</strong></span>
            <span>${data.order.customer_info.phone}</span>
          </div>
          <div class="detail-row">
            <span><strong>Email:</strong></span>
            <span>${data.order.customer_info.email}</span>
          </div>
        </div>

        <div class="payment-summary">
          <div style="font-size: 1.3rem; margin-bottom: 10px; opacity: 0.9;">Total Amount Paid</div>
          <div class="amount-paid">KSh ${Number(data.order.total_amount).toFixed(2)}</div>
          <div class="balance-info">Outstanding Balance: <strong>KSh 0.00</strong></div>
          <div class="payment-status">✓ PAYMENT COMPLETED</div>
        </div>

        <div class="security-note">
          <strong>⚠️ Important:</strong> This receipt serves as your official proof of payment. Please retain this document for your records and any potential returns or exchanges.
        </div>

        <div class="footer">
          <div class="thank-you">Thank you for choosing jnCrafts!</div>
          <div>
            Your payment has been successfully processed and your order is being prepared.<br>
            You will receive order updates via email and SMS.<br><br>
            <strong>jnCrafts Premium Streetwear</strong><br>
            Email: <strong>info@jncrafts.com</strong> | Phone: <strong>+254 700 000 000</strong><br>
            Visit: <strong>www.jncrafts.com</strong> | Follow: <strong>@jncrafts</strong><br><br>
            <em>Receipt generated on ${currentDate} at ${currentTime}</em>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Print invoice in new window
export const printInvoice = async (data: InvoiceData, userId: string) => {
  try {
    const invoiceNumber = await generateDocumentNumber('invoice');
    const html = createInvoiceHTML(data, invoiceNumber);
    
    // Save metadata
    await saveDocumentMetadata(data.order.id, 'invoice', invoiceNumber, userId);
    
    // Open in new window and print
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      
      // Auto-trigger print dialog after content loads
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };
    }
    
    return invoiceNumber;
  } catch (error) {
    console.error('Error printing invoice:', error);
    throw error;
  }
};

// Export invoice as PDF
export const exportInvoicePDF = async (data: InvoiceData, userId: string) => {
  try {
    const invoiceNumber = await generateDocumentNumber('invoice');
    const html = createInvoiceHTML(data, invoiceNumber);
    
    console.log('Generating invoice PDF...', { invoiceNumber, orderId: data.order.id });
    
    // Create temporary container with better visibility for html2canvas
    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.cssText = `
      position: absolute;
      top: 0;
      left: -9999px;
      width: 800px;
      background: white;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #2d3748;
      z-index: 1000;
      visibility: visible;
      opacity: 1;
      transform: scale(1);
      overflow: visible;
      box-sizing: border-box;
      pointer-events: none;
    `;
    
    document.body.appendChild(container);
    
    // Wait for DOM to update and fonts to load
    await new Promise(resolve => {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => setTimeout(resolve, 300));
      } else {
        setTimeout(resolve, 500);
      }
    });
    
    // Force layout calculation
    container.offsetHeight;
    
    // Get actual content dimensions
    const actualHeight = Math.max(
      container.scrollHeight, 
      container.offsetHeight, 
      container.getBoundingClientRect().height,
      1200
    );
    
    console.log('Container dimensions:', { 
      scrollHeight: container.scrollHeight,
      offsetHeight: container.offsetHeight,
      actualHeight
    });
    
    // Convert to canvas with proper settings
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: true,
      width: 800,
      height: actualHeight,
      windowWidth: 800,
      windowHeight: actualHeight,
      onclone: (clonedDoc) => {
        const clonedContainer = clonedDoc.querySelector('div');
        if (clonedContainer) {
          clonedContainer.style.visibility = 'visible';
          clonedContainer.style.opacity = '1';
        }
      }
    });
    
    console.log('Canvas generated:', { 
      width: canvas.width, 
      height: canvas.height,
      hasContent: canvas.width > 0 && canvas.height > 0
    });
    
    // Clean up container
    if (container.parentNode) {
      document.body.removeChild(container);
    }
    
    // Validate canvas
    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error('Canvas is empty - failed to render content');
    }
    
    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Calculate dimensions
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const availableWidth = pdfWidth - (2 * margin);
    const availableHeight = pdfHeight - (2 * margin);
    
    const imgWidth = availableWidth;
    const imgHeight = (canvas.height * availableWidth) / canvas.width;
    
    // Convert canvas to image data
    const imgData = canvas.toDataURL('image/png', 1.0);
    
    console.log('PDF dimensions:', { 
      pdfWidth, pdfHeight, 
      imgWidth, imgHeight,
      willFitOnOnePage: imgHeight <= availableHeight
    });
    
    // Add content to PDF
    if (imgHeight <= availableHeight) {
      // Single page
      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
    } else {
      // Multiple pages
      let remainingHeight = imgHeight;
      let currentY = 0;
      let pageNumber = 0;
      
      while (remainingHeight > 0) {
        if (pageNumber > 0) {
          pdf.addPage();
        }
        
        const pageContentHeight = Math.min(remainingHeight, availableHeight);
        const sourceY = (currentY * canvas.height) / imgHeight;
        const sourceHeight = (pageContentHeight * canvas.height) / imgHeight;
        
        // Create canvas slice for this page
        const pageCanvas = document.createElement('canvas');
        const pageCtx = pageCanvas.getContext('2d');
        
        if (pageCtx) {
          pageCanvas.width = canvas.width;
          pageCanvas.height = sourceHeight;
          
          // Fill with white background
          pageCtx.fillStyle = '#ffffff';
          pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          
          // Draw the slice
          pageCtx.drawImage(
            canvas,
            0, sourceY, canvas.width, sourceHeight,
            0, 0, pageCanvas.width, pageCanvas.height
          );
          
          const pageImgData = pageCanvas.toDataURL('image/png', 1.0);
          pdf.addImage(pageImgData, 'PNG', margin, margin, imgWidth, pageContentHeight);
        }
        
        remainingHeight -= pageContentHeight;
        currentY += pageContentHeight;
        pageNumber++;
      }
    }
    
    // Save metadata
    try {
      await saveDocumentMetadata(data.order.id, 'invoice', invoiceNumber, userId);
    } catch (metadataError) {
      console.warn('Failed to save metadata, but PDF was generated successfully:', metadataError);
    }
    
    // Download PDF
    pdf.save(`JNCrafts-Invoice-${invoiceNumber}.pdf`);
    
    console.log('Invoice PDF generated successfully:', invoiceNumber);
    return invoiceNumber;
    
  } catch (error) {
    console.error('Error exporting invoice PDF:', error);
    throw new Error(`Failed to generate invoice PDF: ${error.message}`);
  }
};

// Export receipt as PDF
export const exportReceiptPDF = async (data: InvoiceData, userId: string) => {
  try {
    const receiptNumber = await generateDocumentNumber('receipt');
    const html = createReceiptHTML(data, receiptNumber);
    
    console.log('Generating receipt PDF...', { receiptNumber, orderId: data.order.id });
    
    // Create temporary container with better visibility for html2canvas
    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.cssText = `
      position: absolute;
      top: 0;
      left: -9999px;
      width: 600px;
      background: white;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.4;
      color: #2d3748;
      z-index: 1000;
      visibility: visible;
      opacity: 1;
      transform: scale(1);
      overflow: visible;
      box-sizing: border-box;
      pointer-events: none;
    `;
    
    document.body.appendChild(container);
    
    // Wait for DOM to update and fonts to load
    await new Promise(resolve => {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => setTimeout(resolve, 300));
      } else {
        setTimeout(resolve, 500);
      }
    });
    
    // Force layout calculation
    container.offsetHeight;
    
    // Get actual content dimensions
    const actualHeight = Math.max(
      container.scrollHeight, 
      container.offsetHeight, 
      container.getBoundingClientRect().height,
      800
    );
    
    console.log('Container dimensions:', { 
      scrollHeight: container.scrollHeight,
      offsetHeight: container.offsetHeight,
      actualHeight
    });
    
    // Convert to canvas with proper settings
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: true,
      width: 600,
      height: actualHeight,
      windowWidth: 600,
      windowHeight: actualHeight,
      onclone: (clonedDoc) => {
        const clonedContainer = clonedDoc.querySelector('div');
        if (clonedContainer) {
          clonedContainer.style.visibility = 'visible';
          clonedContainer.style.opacity = '1';
        }
      }
    });
    
    console.log('Canvas generated:', { 
      width: canvas.width, 
      height: canvas.height,
      hasContent: canvas.width > 0 && canvas.height > 0
    });
    
    // Clean up container
    if (container.parentNode) {
      document.body.removeChild(container);
    }
    
    // Validate canvas
    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error('Canvas is empty - failed to render content');
    }
    
    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Calculate dimensions for receipt (centered and properly sized)
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const availableWidth = pdfWidth - (2 * margin);
    const availableHeight = pdfHeight - (2 * margin);
    
    // Make receipt 70% of available width for better proportions
    const imgWidth = availableWidth * 0.7;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Center the receipt
    const xPosition = (pdfWidth - imgWidth) / 2;
    
    // Convert canvas to image data
    const imgData = canvas.toDataURL('image/png', 1.0);
    
    console.log('PDF dimensions:', { 
      pdfWidth, pdfHeight, 
      imgWidth, imgHeight,
      willFitOnOnePage: imgHeight <= availableHeight
    });
    
    // Add content to PDF - optimized for single page
    if (imgHeight <= availableHeight) {
      // Content fits on one page - center it vertically too
      const yPosition = Math.max(margin, (pdfHeight - imgHeight) / 2);
      pdf.addImage(imgData, 'PNG', xPosition, yPosition, imgWidth, imgHeight);
    } else {
      // Content needs to be scaled down to fit one page
      const scaledHeight = availableHeight * 0.9; // Leave some margin
      const scaledWidth = (canvas.width * scaledHeight) / canvas.height;
      const scaledXPosition = (pdfWidth - scaledWidth) / 2;
      const scaledYPosition = (pdfHeight - scaledHeight) / 2;
      
      pdf.addImage(imgData, 'PNG', scaledXPosition, scaledYPosition, scaledWidth, scaledHeight);
    }
    
    // Save metadata
    try {
      await saveDocumentMetadata(data.order.id, 'receipt', receiptNumber, userId);
    } catch (metadataError) {
      console.warn('Failed to save metadata, but PDF was generated successfully:', metadataError);
    }
    
    // Download PDF
    pdf.save(`JNCrafts-Receipt-${receiptNumber}.pdf`);
    
    console.log('Receipt PDF generated successfully:', receiptNumber);
    return receiptNumber;
    
  } catch (error) {
    console.error('Error exporting receipt PDF:', error);
    throw new Error(`Failed to generate receipt PDF: ${error.message}`);
  }
};

// Get company info from settings (placeholder - implement based on your settings structure)
export const getCompanyInfo = async () => {
  // This should fetch from your settings table
  return {
    name: 'JN Crafts',
    address: '123 Business St, Nairobi, Kenya',
    phone: '+254 700 000 000',
    email: 'info@jncrafts.com',
    logo: '/lovable-uploads/company-logo.png' // You can add this to your uploads
  };
};