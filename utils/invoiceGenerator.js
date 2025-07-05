import pdf from 'html-pdf'

export const generateInvoicePDF = async (item, user) => {
  try {
    const html = generateInvoiceHTML(item, user)

    const options = {
      format: 'A4',
      border: '10mm',
      zoomFactor: 0.75, // Scale to fit one page
      header: {
        height: '10mm',
        contents: ''
      },
      footer: {
        height: '10mm',
        contents: '<span style="color: #666; font-size: 10px;">Page {{page}} of {{pages}}</span>'
      }
    }

    return new Promise((resolve, reject) => {
      pdf.create(html, options).toBuffer((err, buffer) => {
        if (err) {
          console.error('Error generating PDF:', err)
          return reject(err)
        }
        resolve(buffer)
      })
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw error
  }
}

const generateInvoiceHTML = (item, user) => {
  const invoiceDate = item.invoiceData?.invoiceDate || item.createdAt
  const dueDate = item.invoiceData?.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Invoice ${item.invoiceNumber}</title>
  <style>
    body {
      font-family: 'Helvetica', sans-serif;
      margin: 0;
      padding: 20px;
      color: #333;
      background-color: #f4f4f4;
    }

    .container {
      max-width: 800px;
      margin: auto;
      background: #fff;
      padding: 20px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }

    .header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 10px;
    }

    .company-info h1 {
      font-size: 22px;
      margin: 0;
      color: #3b82f6;
    }

    .company-info p {
      font-size: 12px;
      margin: 2px 0;
    }

    .invoice-info {
      text-align: right;
    }

    .invoice-info h2 {
      margin: 0;
      font-size: 18px;
    }

    .status {
      padding: 5px 10px;
      border-radius: 10px;
      color: #fff;
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
    }

    .status-paid { background: #22c55e; }
    .status-unpaid { background: #ef4444; }
    .status-pending { background: #f59e0b; }

    .details {
      margin: 20px 0;
      display: flex;
      justify-content: space-between;
      font-size: 13px;
    }

    .details h3 {
      color: #3b82f6;
      font-size: 14px;
      margin-bottom: 6px;
    }

    .invoice-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-top: 10px;
    }

    .invoice-table th, .invoice-table td {
      padding: 8px;
      border: 1px solid #ccc;
    }

    .invoice-table th {
      background: #3b82f6;
      color: #fff;
    }

    .invoice-table td {
      background: #fafafa;
    }

    .total-section {
      margin-top: 10px;
      text-align: right;
    }

    .total-row {
      display: flex;
      justify-content: flex-end;
      margin: 5px 0;
    }

    .total-label {
      width: 150px;
      text-align: right;
      font-weight: bold;
    }

    .total-amount {
      width: 100px;
      text-align: right;
    }

    .payment-info {
      background: #f8f9fa;
      padding: 10px;
      border-radius: 5px;
      margin-top: 15px;
      font-size: 12px;
    }

    .payment-info h3 {
      margin: 0 0 8px 0;
      color: #3b82f6;
    }

    .bank-details div {
      margin: 3px 0;
    }

    .footer {
      margin-top: 25px;
      text-align: center;
      font-size: 10px;
      color: #666;
      border-top: 1px solid #ddd;
      padding-top: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="company-info">
        <h1>Marketbook&solution</h1>
        <p>Professional Marketplace Management</p>
        <p>Email: ${user.email}</p>
        <p>Phone: ${user.businessInfo?.phoneNumber || '+1 (555) 123-4567'}</p>
      </div>
      <div class="invoice-info">
        <h2>INVOICE</h2>
        <p><strong>#:</strong> ${item.invoiceNumber}</p>
        <p><strong>Status:</strong> <span class="status status-${item.status}">${item.status}</span></p>
      </div>
    </div>

    <div class="details">
      <div>
        <h3>Bill To:</h3>
        <p><strong>${item.invoiceData?.customerName || 'Customer'}</strong><br>
        ${item.invoiceData?.customerEmail || ''}<br>
        ${item.invoiceData?.customerAddress || ''}</p>
      </div>
      <div>
        <h3>Invoice Info:</h3>
        <p><strong>Date:</strong> ${new Date(invoiceDate).toLocaleDateString()}<br>
        <strong>Due:</strong> ${new Date(dueDate).toLocaleDateString()}<br>
        <strong>From:</strong> ${user.firstName} ${user.lastName}</p>
      </div>
    </div>

    <table class="invoice-table">
      <thead>
        <tr>
          <th>Description</th>
          <th>Category</th>
          <th>Qty</th>
          <th>Unit Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>${item.name}</strong><br>${item.description || ''}</td>
          <td>${item.category || 'General'}</td>
          <td>1</td>
          <td>$${item.price.toLocaleString()}</td>
          <td>$${item.price.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>

    <div class="total-section">
      <div class="total-row">
        <div class="total-label">Subtotal:</div>
        <div class="total-amount">$${item.price.toLocaleString()}</div>
      </div>
      <div class="total-row">
        <div class="total-label">Tax (0%):</div>
        <div class="total-amount">$0.00</div>
      </div>
      <div class="total-row">
        <div class="total-label">Total:</div>
        <div class="total-amount">$${item.price.toLocaleString()}</div>
      </div>
    </div>

    ${item.status === 'unpaid' && user.bankDetails ? `
    <div class="payment-info">
      <h3>Payment Information</h3>
      <div class="bank-details">
        <div><strong>Bank:</strong> ${user.bankDetails.bankName || 'N/A'}</div>
        <div><strong>Account Name:</strong> ${user.bankDetails.accountName || 'N/A'}</div>
        <div><strong>Account Number:</strong> ${user.bankDetails.accountNumber || 'N/A'}</div>
        <div><strong>Routing Number:</strong> ${user.bankDetails.routingNumber || 'N/A'}</div>
        ${user.bankDetails.swiftCode ? `<div><strong>SWIFT:</strong> ${user.bankDetails.swiftCode}</div>` : ''}
      </div>
    </div>` : ''}

    <div class="footer">
      <p>Thank you for your business!</p>
      <p>This invoice was generated by Marketbook&solution</p>
      <p>Contact: ${user.email}</p>
    </div>
  </div>
</body>
</html>
`
}


// import pdf from 'html-pdf'
// import fs from 'fs'
// import path from 'path'

// export const generateInvoicePDF = async (item, user) => {
//   try {
//     const html = generateInvoiceHTML(item, user)

//     const options = {
//       format: 'A4',
//       border: '20mm',
//       type: 'pdf',
//       header: {
//         height: '20mm',
//         contents: ''
//       },
//       footer: {
//         height: '15mm',
//         contents: '<span style="color: #666;">Page {{page}} of {{pages}}</span>'
//       }
//     }

//     return new Promise((resolve, reject) => {
//       pdf.create(html, options).toBuffer((err, buffer) => {
//         if (err) {
//           console.error('Error generating PDF:', err)
//           return reject(err)
//         }
//         resolve(buffer)
//       })
//     })
//   } catch (error) {
//     console.error('Error generating PDF:', error)
//     throw error
//   }
// }

// const generateInvoiceHTML = (item, user) => {
//   const invoiceDate = item.invoiceData?.invoiceDate || item.createdAt
//   const dueDate = item.invoiceData?.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  
//   return `
//     <!DOCTYPE html>
//     <html>
//     <head>
//       <meta charset="utf-8">
//       <title>Invoice ${item.invoiceNumber}</title>
//       <style>
//         body {
//           font-family: 'Arial', sans-serif;
//           margin: 0;
//           padding: 20px;
//           color: #333;
//           line-height: 1.6;
//         }
//         .invoice-header {
//           display: flex;
//           justify-content: space-between;
//           align-items: center;
//           margin-bottom: 40px;
//           padding-bottom: 20px;
//           border-bottom: 3px solid #3b82f6;
//         }
//         .company-info h1 {
//           color: #3b82f6;
//           margin: 0;
//           font-size: 28px;
//         }
//         .company-info p {
//           margin: 5px 0;
//           color: #666;
//         }
//         .invoice-title {
//           text-align: right;
//         }
//         .invoice-title h2 {
//           color: #333;
//           margin: 0;
//           font-size: 24px;
//         }
//         .invoice-details {
//           display: flex;
//           justify-content: space-between;
//           margin-bottom: 40px;
//         }
//         .bill-to, .invoice-info {
//           width: 48%;
//         }
//         .bill-to h3, .invoice-info h3 {
//           color: #3b82f6;
//           margin-bottom: 10px;
//           font-size: 16px;
//           text-transform: uppercase;
//         }
//         .invoice-table {
//           width: 100%;
//           border-collapse: collapse;
//           margin-bottom: 30px;
//         }
//         .invoice-table th {
//           background-color: #3b82f6;
//           color: white;
//           padding: 12px;
//           text-align: left;
//           font-weight: bold;
//         }
//         .invoice-table td {
//           padding: 12px;
//           border-bottom: 1px solid #eee;
//         }
//         .invoice-table tr:nth-child(even) {
//           background-color: #f8f9fa;
//         }
//         .total-section {
//           text-align: right;
//           margin-top: 20px;
//         }
//         .total-row {
//           display: flex;
//           justify-content: flex-end;
//           margin-bottom: 10px;
//         }
//         .total-label {
//           width: 150px;
//           font-weight: bold;
//           text-align: right;
//           margin-right: 20px;
//         }
//         .total-amount {
//           width: 100px;
//           text-align: right;
//           font-weight: bold;
//         }
//         .grand-total {
//           font-size: 18px;
//           color: #3b82f6;
//           border-top: 2px solid #3b82f6;
//           padding-top: 10px;
//         }
//         .payment-info {
//           margin-top: 40px;
//           padding: 20px;
//           background-color: #f8f9fa;
//           border-radius: 8px;
//         }
//         .payment-info h3 {
//           color: #3b82f6;
//           margin-bottom: 15px;
//         }
//         .bank-details {
//           display: grid;
//           grid-template-columns: 1fr 1fr;
//           gap: 10px;
//         }
//         .status-badge {
//           display: inline-block;
//           padding: 6px 12px;
//           border-radius: 20px;
//           font-size: 12px;
//           font-weight: bold;
//           text-transform: uppercase;
//         }
//         .status-paid {
//           background-color: #22c55e;
//           color: white;
//         }
//         .status-unpaid {
//           background-color: #ef4444;
//           color: white;
//         }
//         .status-pending {
//           background-color: #f59e0b;
//           color: white;
//         }
//         .footer {
//           margin-top: 50px;
//           text-align: center;
//           color: #666;
//           font-size: 12px;
//           border-top: 1px solid #eee;
//           padding-top: 20px;
//         }
//         .mark-paid-section {
//           margin-top: 30px;
//           padding: 20px;
//           background-color: #fef3c7;
//           border-radius: 8px;
//           text-align: center;
//         }
//         .mark-paid-button {
//           display: inline-block;
//           background-color: #22c55e;
//           color: white;
//           padding: 12px 24px;
//           text-decoration: none;
//           border-radius: 6px;
//           font-weight: bold;
//           margin-top: 10px;
//         }
//         .user-info {
//           background-color: #f0f9ff;
//           padding: 15px;
//           border-radius: 8px;
//           margin-bottom: 20px;
//         }
//         .user-info h4 {
//           color: #1e40af;
//           margin-bottom: 10px;
//         }
//       </style>
//     </head>
//     <body>
//       <div class="invoice-header">
//         <div class="company-info">
//           <h1>Marketbook&solution</h1>
//           <p>Professional Marketplace Management</p>
//           <p>Email: ${user.email}</p>
//           <p>Phone: ${user.businessInfo?.phoneNumber || '+1 (555) 123-4567'}</p>
//         </div>
//         <div class="invoice-title">
//           <h2>INVOICE</h2>
//           <p><strong>Invoice #:</strong> ${item.invoiceNumber}</p>
//           <p><strong>Status:</strong> <span class="status-badge status-${item.status}">${item.status}</span></p>
//         </div>
//       </div>

//       <!-- User Information Section -->
//       <div class="user-info">
//         <h4>Invoice Created By:</h4>
//         <p><strong>Name:</strong> ${user.firstName} ${user.lastName}</p>
//         <p><strong>Email:</strong> ${user.email}</p>
//         ${user.businessInfo?.businessName ? `<p><strong>Business:</strong> ${user.businessInfo.businessName}</p>` : '' }
//         ${user.businessInfo?.phoneNumber ? `<p><strong>Phone:</strong> ${user.businessInfo.phoneNumber}</p>` : '' }
//       </div>

//       <div class="invoice-details">
//         <div class="bill-to">
//           <h3>Bill To:</h3>
//           <p><strong>${item.invoiceData?.customerName || 'Customer'}</strong></p>
//           <p>${item.invoiceData?.customerEmail || ''}</p>
//           <p>${item.invoiceData?.customerAddress || ''}</p>
//         </div>
//         <div class="invoice-info">
//           <h3>Invoice Information:</h3>
//           <p><strong>Invoice Date:</strong> ${new Date(invoiceDate).toLocaleDateString()}</p>
//           <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>
//           <p><strong>From:</strong> ${user.firstName} ${user.lastName}</p>
//           ${user.billingAddress ? ` 
//             <p><strong>Billing Address:</strong></p>
//             <p>${user.billingAddress.street || ''}</p>
//             <p>${user.billingAddress.city || ''}, ${user.billingAddress.state || ''} ${user.billingAddress.zipCode || ''}</p>
//             <p>${user.billingAddress.country || ''}</p>
//           ` : '' }
//         </div>
//       </div>

//       <table class="invoice-table">
//         <thead>
//           <tr>
//             <th>Description</th>
//             <th>Category</th>
//             <th>Quantity</th>
//             <th>Unit Price</th>
//             <th>Total</th>
//           </tr>
//         </thead>
//         <tbody>
//           <tr>
//             <td>
//               <strong>${item.name}</strong>
//               ${item.description ? `<br><small>${item.description}</small>` : ''}
//             </td>
//             <td>${item.category || 'General'}</td>
//             <td>1</td>
//             <td>$${item.price.toLocaleString()}</td>
//             <td>$${item.price.toLocaleString()}</td>
//           </tr>
//         </tbody>
//       </table>

//       <div class="total-section">
//         <div class="total-row">
//           <div class="total-label">Subtotal:</div>
//           <div class="total-amount">$${item.price.toLocaleString()}</div>
//         </div>
//         <div class="total-row">
//           <div class="total-label">Tax (0%):</div>
//           <div class="total-amount">$0.00</div>
//         </div>
//         <div class="total-row grand-total">
//           <div class="total-label">Total Amount:</div>
//           <div class="total-amount">$${item.price.toLocaleString()}</div>
//         </div>
//       </div>

//       ${item.status === 'unpaid' && user.bankDetails ? `
//         <div class="payment-info">
//           <h3>Payment Information</h3>
//           <p>Please use the following bank details to complete your payment:</p>
//           <div class="bank-details">
//             <div><strong>Bank Name:</strong> ${user.bankDetails.bankName || 'N/A'}</div>
//             <div><strong>Account Name:</strong> ${user.bankDetails.accountName || 'N/A'}</div>
//             <div><strong>Account Number:</strong> ${user.bankDetails.accountNumber || 'N/A'}</div>
//             <div><strong>Routing Number:</strong> ${user.bankDetails.routingNumber || 'N/A'}</div>
//             ${user.bankDetails.swiftCode ? `<div><strong>SWIFT Code:</strong> ${user.bankDetails.swiftCode}</div>` : '' }
//           </div>
//         </div>
//       ` : '' }

//       <div class="footer">
//         <p>Thank you for your business!</p>
//         <p>This invoice was generated by Marketbook&solution - Professional Marketplace Management System</p>
//         <p>For any questions regarding this invoice, please contact: ${user.email}</p>
//       </div>
//     </body>
//     </html>
//   `
// }
