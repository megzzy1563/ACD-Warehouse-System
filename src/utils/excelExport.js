// src/utils/excelExport.js

/**
 * Export inventory data to Excel file
 * 
 * @param {Array} data - Array of inventory items
 * @param {string} fileName - Name of the Excel file (without extension)
 */
export const exportInventoryToExcel = (data, fileName = 'inventory-export') => {
  try {
    // Convert the data to a format suitable for Excel
    const excelData = data.map(item => ({
      'Date': item.date,
      'Parts Number': item.partsNumber,
      'Parts Name': item.partsName,
      'Component': item.component,
      'Quantity': item.quantity,
      'Item Price': typeof item.itemPrice === 'number' ? item.itemPrice : 
                   parseFloat(String(item.itemPrice).replace(/[^\d.-]/g, '')),
      'Rack': item.rack,
      'Tax': typeof item.tax === 'number' ? item.tax : 
            parseFloat(String(item.tax).replace(/[^\d.-]/g, '')),
      'Total Amount': typeof item.totalAmount === 'number' ? item.totalAmount : 
                     parseFloat(String(item.totalAmount).replace(/[^\d.-]/g, '')),
      'PIC': item.pic,
      'PO Number': item.poNumber,
      'CTPL Number': item.ctplNumber
    }));

    // Create a CSV string from the data
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Add headers
    const headers = Object.keys(excelData[0]);
    csvContent += headers.join(",") + "\r\n";
    
    // Add rows
    excelData.forEach(item => {
      const row = headers.map(header => {
        // Handle values with commas by wrapping in quotes
        const value = item[header];
        return typeof value === 'string' && value.includes(',') ? 
          `"${value}"` : value;
      });
      csvContent += row.join(",") + "\r\n";
    });
    
    // Create a download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    // Generate current date string for the filename
    const dateStr = new Date().toISOString().split('T')[0];
    const fullFileName = `${fileName}-${dateStr}.csv`;
    
    link.setAttribute("download", fullFileName);
    document.body.appendChild(link);
    
    // Trigger the download
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    
    return true;
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return false;
  }
};

/**
 * Export filtered inventory data to Excel
 * 
 * @param {Array} data - Array of inventory items
 * @param {Array} selectedIds - Array of selected item IDs to export (if empty, export all)
 * @param {string} fileName - Name of the Excel file (without extension)
 */
export const exportFilteredInventoryToExcel = (data, selectedIds = [], fileName = 'inventory-export') => {
  // If selectedIds is provided and not empty, filter the data
  const filteredData = selectedIds.length > 0 
    ? data.filter(item => selectedIds.includes(item.id))
    : data;
    
  return exportInventoryToExcel(filteredData, fileName);
};

/**
 * Simple export function for backward compatibility with existing code
 * 
 * @param {Array} data - Array of inventory items to export
 * @param {string} fileName - Optional filename
 */
export const exportToExcel = (data, fileName = 'inventory-export') => {
  return exportInventoryToExcel(data, fileName);
};