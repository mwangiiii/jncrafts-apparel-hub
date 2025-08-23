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

// Create printable invoice HTML
export const createInvoiceHTML = (data: InvoiceData, invoiceNumber: string): string => {
  const subtotal = data.order.total_amount + (data.order.discount_amount || 0);
  const deliveryCost = data.order.delivery_details?.cost || 0;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${invoiceNumber}</title>
      <style>
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
        
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background: white;
          color: black;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          border-bottom: 2px solid #000;
          padding-bottom: 20px;
        }
        
        .logo {
          max-width: 150px;
          max-height: 80px;
        }
        
        .company-info {
          text-align: right;
        }
        
        .invoice-title {
          font-size: 28px;
          font-weight: bold;
          margin: 20px 0;
          text-align: center;
        }
        
        .invoice-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 30px;
        }
        
        .customer-info, .invoice-info {
          padding: 15px;
          border: 1px solid #ddd;
        }
        
        .section-title {
          font-weight: bold;
          font-size: 16px;
          margin-bottom: 10px;
          color: #333;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        
        .items-table th, .items-table td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        
        .items-table th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        
        .totals {
          float: right;
          width: 300px;
          margin-top: 20px;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
        }
        
        .final-total {
          font-weight: bold;
          font-size: 18px;
          border-top: 2px solid #000;
          padding-top: 10px;
        }
        
        .footer {
          margin-top: 50px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          ${data.companyInfo.logo ? `<img src="${data.companyInfo.logo}" alt="Company Logo" class="logo">` : ''}
          <div>
            <h2>${data.companyInfo.name}</h2>
            <p>${data.companyInfo.address}</p>
            <p>Phone: ${data.companyInfo.phone}</p>
            <p>Email: ${data.companyInfo.email}</p>
          </div>
        </div>
        <div class="company-info">
          <h1>INVOICE</h1>
          <p><strong>Invoice #:</strong> ${invoiceNumber}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>Order #:</strong> ${data.order.order_number}</p>
        </div>
      </div>

      <div class="invoice-details">
        <div class="customer-info">
          <div class="section-title">Bill To:</div>
          <p><strong>${data.order.customer_info?.fullName || 'N/A'}</strong></p>
          <p>${data.order.customer_info?.email || ''}</p>
          <p>${data.order.customer_info?.phone || ''}</p>
          ${data.order.shipping_address ? `
            <p>${data.order.shipping_address.street || ''}</p>
            <p>${data.order.shipping_address.city || ''}, ${data.order.shipping_address.state || ''}</p>
            <p>${data.order.shipping_address.zipCode || ''}</p>
          ` : ''}
        </div>
        
        <div class="invoice-info">
          <div class="section-title">Order Details:</div>
          <p><strong>Order Date:</strong> ${new Date(data.order.created_at).toLocaleDateString()}</p>
          <p><strong>Order Status:</strong> ${data.order.status.toUpperCase()}</p>
          <p><strong>Payment Method:</strong> Cash on Delivery</p>
          ${data.order.delivery_details?.method ? `<p><strong>Delivery Method:</strong> ${data.order.delivery_details.method}</p>` : ''}
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Size</th>
            <th>Color</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${data.order.order_items?.map(item => `
            <tr>
              <td>${item.product_name}</td>
              <td>${item.size}</td>
              <td>${item.color}</td>
              <td>${item.quantity}</td>
              <td>KSh ${item.price?.toLocaleString()}</td>
              <td>KSh ${(item.price * item.quantity)?.toLocaleString()}</td>
            </tr>
          `).join('') || ''}
        </tbody>
      </table>

      <div class="totals">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>KSh ${subtotal.toLocaleString()}</span>
        </div>
        ${data.order.discount_amount > 0 ? `
          <div class="total-row">
            <span>Discount (${data.order.discount_code}):</span>
            <span>-KSh ${data.order.discount_amount.toLocaleString()}</span>
          </div>
        ` : ''}
        ${deliveryCost > 0 ? `
          <div class="total-row">
            <span>Delivery:</span>
            <span>KSh ${deliveryCost.toLocaleString()}</span>
          </div>
        ` : ''}
        <div class="total-row final-total">
          <span>Total Amount:</span>
          <span>KSh ${data.order.total_amount.toLocaleString()}</span>
        </div>
      </div>

      <div style="clear: both;"></div>

      <div class="footer">
        <p>Thank you for your business!</p>
        <p>This is a computer-generated invoice.</p>
      </div>

      <div class="no-print" style="text-align: center; margin-top: 20px;">
        <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px;">Print Invoice</button>
      </div>
    </body>
    </html>
  `;
};

// Create printable receipt HTML
export const createReceiptHTML = (data: InvoiceData, receiptNumber: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Receipt ${receiptNumber}</title>
      <style>
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
        
        body {
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background: white;
          color: black;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #000;
          padding-bottom: 20px;
        }
        
        .logo {
          max-width: 120px;
          max-height: 60px;
          margin-bottom: 10px;
        }
        
        .receipt-title {
          font-size: 24px;
          font-weight: bold;
          margin: 20px 0;
        }
        
        .receipt-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin: 20px 0;
        }
        
        .info-item {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
          border-bottom: 1px dotted #ccc;
        }
        
        .amount-paid {
          font-size: 20px;
          font-weight: bold;
          text-align: center;
          margin: 30px 0;
          padding: 20px;
          border: 2px solid #000;
        }
        
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="header">
        ${data.companyInfo.logo ? `<img src="${data.companyInfo.logo}" alt="Company Logo" class="logo">` : ''}
        <h2>${data.companyInfo.name}</h2>
        <p>${data.companyInfo.address}</p>
        <p>Phone: ${data.companyInfo.phone} | Email: ${data.companyInfo.email}</p>
      </div>

      <div class="receipt-title">PAYMENT RECEIPT</div>

      <div class="receipt-info">
        <div>
          <div class="info-item">
            <span><strong>Receipt #:</strong></span>
            <span>${receiptNumber}</span>
          </div>
          <div class="info-item">
            <span><strong>Date:</strong></span>
            <span>${new Date().toLocaleDateString()}</span>
          </div>
          <div class="info-item">
            <span><strong>Order #:</strong></span>
            <span>${data.order.order_number}</span>
          </div>
          <div class="info-item">
            <span><strong>Customer:</strong></span>
            <span>${data.order.customer_info?.fullName || 'N/A'}</span>
          </div>
        </div>
        
        <div>
          <div class="info-item">
            <span><strong>Payment Method:</strong></span>
            <span>Cash on Delivery</span>
          </div>
          <div class="info-item">
            <span><strong>Transaction ID:</strong></span>
            <span>COD-${data.order.order_number}</span>
          </div>
          <div class="info-item">
            <span><strong>Payment Status:</strong></span>
            <span>${data.order.status === 'delivered' ? 'PAID' : 'PENDING'}</span>
          </div>
          <div class="info-item">
            <span><strong>Balance:</strong></span>
            <span>KSh 0.00</span>
          </div>
        </div>
      </div>

      <div class="amount-paid">
        <div>AMOUNT PAID</div>
        <div>KSh ${data.order.total_amount.toLocaleString()}</div>
      </div>

      <div class="footer">
        <p>Thank you for your payment!</p>
        <p>This receipt serves as proof of payment.</p>
        <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
      </div>

      <div class="no-print" style="text-align: center; margin-top: 20px;">
        <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px;">Print Receipt</button>
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
    
    // Create temporary container
    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    container.style.width = '800px';
    document.body.appendChild(container);
    
    // Convert to canvas then PDF
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    
    let position = 0;
    
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    // Clean up
    document.body.removeChild(container);
    
    // Save metadata
    await saveDocumentMetadata(data.order.id, 'invoice', invoiceNumber, userId);
    
    // Download PDF
    pdf.save(`invoice-${invoiceNumber}.pdf`);
    
    return invoiceNumber;
  } catch (error) {
    console.error('Error exporting invoice PDF:', error);
    throw error;
  }
};

// Export receipt as PDF
export const exportReceiptPDF = async (data: InvoiceData, userId: string) => {
  try {
    const receiptNumber = await generateDocumentNumber('receipt');
    const html = createReceiptHTML(data, receiptNumber);
    
    // Create temporary container
    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    container.style.width = '600px';
    document.body.appendChild(container);
    
    // Convert to canvas then PDF
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    
    // Clean up
    document.body.removeChild(container);
    
    // Save metadata
    await saveDocumentMetadata(data.order.id, 'receipt', receiptNumber, userId);
    
    // Download PDF
    pdf.save(`receipt-${receiptNumber}.pdf`);
    
    return receiptNumber;
  } catch (error) {
    console.error('Error exporting receipt PDF:', error);
    throw error;
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