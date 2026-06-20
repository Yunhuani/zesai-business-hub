import ExcelJS from 'exceljs';

interface Message {
  role: string;
  content: string;
}

/**
 * Extract table data from markdown content
 * Supports markdown tables and structured text
 */
function extractTableData(content: string): { headers: string[], rows: string[][] } | null {
  // Try to extract markdown table
  const tableRegex = /\|(.+)\|[\r\n]+\|[-:\s|]+\|[\r\n]+((?:\|.+\|[\r\n]*)+)/;
  const match = content.match(tableRegex);
  
  if (match) {
    const headerLine = match[1];
    const bodyLines = match[2];
    
    // Parse headers
    const headers = headerLine.split('|')
      .map(h => h.trim())
      .filter(h => h.length > 0);
    
    // Parse rows
    const rows = bodyLines.trim().split('\n')
      .map(line => 
        line.split('|')
          .map(cell => cell.trim())
          .filter((_, index, arr) => index > 0 && index < arr.length - 1) // Remove empty first/last
      )
      .filter(row => row.length > 0);
    
    return { headers, rows };
  }
  
  return null;
}

/**
 * Generate Excel file from message content
 */
export async function generateExcel(
  messages: Message[],
  title: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  
  // Set workbook properties
  workbook.creator = '泽思AI商业智库 | Zenith.ai';
  workbook.created = new Date();
  workbook.modified = new Date();
  
  // Create worksheet
  const worksheet = workbook.addWorksheet(title.substring(0, 31)); // Excel sheet name max 31 chars
  
  // Style definitions
  const headerStyle = {
    font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF5B21B6' } },
    alignment: { vertical: 'middle' as const, horizontal: 'center' as const },
    border: {
      top: { style: 'thin' as const },
      left: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      right: { style: 'thin' as const }
    }
  };
  
  const cellStyle = {
    alignment: { vertical: 'top' as const, horizontal: 'left' as const, wrapText: true },
    border: {
      top: { style: 'thin' as const },
      left: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      right: { style: 'thin' as const }
    }
  };
  
  let currentRow = 1;
  
  // Process each message
  for (const message of messages) {
    if (message.role !== 'assistant') continue;
    
    // Try to extract table data
    const tableData = extractTableData(message.content);
    
    if (tableData) {
      // Add table headers
      const headerRow = worksheet.getRow(currentRow);
      tableData.headers.forEach((header, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = header;
        cell.style = headerStyle;
      });
      headerRow.height = 25;
      currentRow++;
      
      // Add table rows
      tableData.rows.forEach(rowData => {
        const row = worksheet.getRow(currentRow);
        rowData.forEach((cellValue, index) => {
          const cell = row.getCell(index + 1);
          cell.value = cellValue;
          cell.style = cellStyle;
        });
        row.height = 20;
        currentRow++;
      });
      
      // Set column widths
      tableData.headers.forEach((_, index) => {
        worksheet.getColumn(index + 1).width = 20;
      });
      
      currentRow += 2; // Add spacing
    } else {
      // If no table found, add content as text
      const titleRow = worksheet.getRow(currentRow);
      titleRow.getCell(1).value = title;
      titleRow.getCell(1).style = headerStyle;
      titleRow.height = 25;
      currentRow++;
      
      const contentRow = worksheet.getRow(currentRow);
      contentRow.getCell(1).value = message.content;
      contentRow.getCell(1).style = cellStyle;
      contentRow.height = 100;
      currentRow++;
      
      worksheet.getColumn(1).width = 80;
    }
  }
  
  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
