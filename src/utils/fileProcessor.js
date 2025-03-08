import XLSX from 'xlsx-js-style';
import path from 'path';
import { app } from 'electron';

export function processExcelFile(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
}

export function saveToExcel(data) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `event_data_${timestamp}.xlsx`;
    
    // Create a map to store unique events using Event ID as key
    const uniqueEvents = new Map();
    
    // Process each item, keeping only the latest entry for each Event ID
    data.forEach(fields => {
        const eventId = fields['Event ID'] || '';
        if (eventId) {
            uniqueEvents.set(eventId, fields);
        }
    });
    
    // Convert unique events back to array and format for Excel
    const formattedData = Array.from(uniqueEvents.values()).map(fields => ({
        'Event Name': fields['Event name'] || '',
        'Event ID': fields['Event ID'] || '',
        'Section': fields['Section'] || '',
        'Row': fields['Row'] || '',
        'Seat': fields['Seat'] || '',
        'Single Price': parseFloat(fields['Price']) || 0,
        'Single Fees': 0,
        'Total Price': parseFloat(fields['Price']) * (parseInt(fields['Amount']) || 1),
        'Total Fees': 0,
        'Quantity': parseInt(fields['Amount']) || 1,
        'Ticket Type': 'STANDARD TICKET',
        'Status': 'Available',
        'Time Left': fields['Expiration'] || '',
        'Checkout Link': fields['Checkout Link'] || '',
        'Full Checkout Link': fields['Full Checkout Link'] || ''
    }));

    // Add styling and column widths
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(formattedData);
    
    // Define column widths
    ws['!cols'] = [
        { wch: 20 }, // Event Name
        { wch: 10 }, // Event ID
        { wch: 10 }, // Section
        { wch: 8 },  // Row
        { wch: 10 }, // Seat
        { wch: 12 }, // Single Price
        { wch: 12 }, // Single Fees
        { wch: 12 }, // Total Price
        { wch: 12 }, // Total Fees
        { wch: 10 }, // Quantity
        { wch: 20 }, // Ticket Type
        { wch: 15 }, // Status
        { wch: 10 }, // Time Left
        { wch: 20 }, // Checkout Link
        { wch: 20 }  // Full Checkout Link
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Event Data');
    XLSX.writeFile(wb, filename);
}
