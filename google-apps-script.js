/**
 * FLL Team RSVP and Snack Management Google Apps Script
 * 
 * This script manages two sheets:
 * 1. "RSVPs" - for meeting attendance tracking
 * 2. "Snacks" - for snack assignment coordination
 * 
 * Deploy as a web app with execute permissions for "Anyone"
 */

function doGet(e) {
  try {
    const action = e.parameter.action;
    
    // RSVP Actions
    if (!action || action === 'get') {
      // Optional meetingDate filter to reduce payload
      const meetingDate = e && e.parameter && e.parameter.meetingDate ? e.parameter.meetingDate : null;
      return getRSVPs(meetingDate);
    } else if (action === 'update') {
      return updateRSVP(e.parameter.meetingDate, e.parameter.kidName, e.parameter.status);
    }
    
    // Snack Actions
    else if (action === 'getSnacks') {
      // Optional meetingDate filter to reduce payload
      const meetingDate = e && e.parameter && e.parameter.meetingDate ? e.parameter.meetingDate : null;
      return getSnacks(meetingDate);
    } else if (action === 'assignSnack') {
      return assignSnack(e.parameter.meetingDate, e.parameter.kidName);
    } else if (action === 'removeSnack') {
      return removeSnack(e.parameter.meetingDate, e.parameter.kidName);
    }
    
    // Unknown action
    else {
      return ContentService.createTextOutput(JSON.stringify({ 
        error: `Unknown action: ${action}` 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
  } catch (error) {
    console.error('Error in doGet:', error);
    return ContentService.createTextOutput(JSON.stringify({ 
      error: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================================
// RSVP FUNCTIONS
// ============================================================================

function getRSVPs(filterDate) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('RSVPs');
    if (!sheet) {
      throw new Error('RSVPs sheet not found');
    }
    
    const data = sheet.getDataRange().getValues();
    
    if (data.length === 0) {
      return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    }
    
    const headers = data[0];
    const meetings = [];
    
    // Process each row (skip header)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rawMeetingDate = row[0];
      
      if (!rawMeetingDate) continue;
      
      // Normalize the date format to YYYY-MM-DD
      let meetingDate;
      if (rawMeetingDate instanceof Date) {
        const year = rawMeetingDate.getFullYear();
        const month = String(rawMeetingDate.getMonth() + 1).padStart(2, '0');
        const day = String(rawMeetingDate.getDate()).padStart(2, '0');
        meetingDate = `${year}-${month}-${day}`;
      } else {
        // If it's already a string, try to normalize it
        const dateStr = String(rawMeetingDate).trim();
        // If it looks like a date string, try to parse and format it
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          const year = parsedDate.getFullYear();
          const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
          const day = String(parsedDate.getDate()).padStart(2, '0');
          meetingDate = `${year}-${month}-${day}`;
        } else {
          meetingDate = dateStr; // Keep as-is if we can't parse it
        }
      }
      
      const kids = [];
      
      // Process each child column (skip date column)
      for (let j = 1; j < headers.length; j++) {
        const childName = headers[j];
        const status = row[j] || '';
        
        kids.push({
          name: childName,
          status: status
        });
      }
      
      meetings.push({
        meetingDate: meetingDate,
        kids: kids
      });
    }
    
    // If a filterDate is provided, return only that meeting
    if (filterDate) {
      const normalizedFilter = String(filterDate).trim();
      const filtered = meetings.filter(m => {
        const dateStr = String(m.meetingDate).trim();
        if (dateStr === normalizedFilter) return true;
        // Attempt to normalize if date looks parseable
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          const iso = `${parsed.getFullYear()}-${String(parsed.getMonth()+1).padStart(2,'0')}-${String(parsed.getDate()).padStart(2,'0')}`;
          return iso === normalizedFilter;
        }
        return false;
      });
      return ContentService.createTextOutput(JSON.stringify(filtered)).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify(meetings)).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('Error in getRSVPs:', error);
    return ContentService.createTextOutput(JSON.stringify({ 
      error: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function updateRSVP(meetingDate, kidName, status) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('RSVPs');
    if (!sheet) {
      throw new Error('RSVPs sheet not found');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find or create the meeting row - bulletproof comparison
    let meetingRow = -1;
    for (let i = 1; i < data.length; i++) {
      const rowDate = data[i][0];
      
      if (!rowDate) continue; // Skip empty cells
      
      // Convert both to strings and trim whitespace
      const rowDateStr = String(rowDate).trim();
      const meetingDateStr = String(meetingDate).trim();
      
      // Try exact match first
      if (rowDateStr === meetingDateStr) {
        meetingRow = i + 1;
        break;
      }
      
      // If it's a Date object, convert to YYYY-MM-DD
      if (rowDate instanceof Date) {
        const year = rowDate.getFullYear();
        const month = String(rowDate.getMonth() + 1).padStart(2, '0');
        const day = String(rowDate.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        
        if (formattedDate === meetingDateStr) {
          meetingRow = i + 1;
          break;
        }
      }
    }
    
    // If meeting doesn't exist, create new row
    if (meetingRow === -1) {
      sheet.appendRow([meetingDate]);
      meetingRow = sheet.getLastRow();
    }
    
    // Find the child column
    const kidColumn = headers.indexOf(kidName) + 1; // +1 for 1-based indexing
    if (kidColumn === 0) {
      throw new Error(`Child ${kidName} not found in headers`);
    }
    
    // Update the cell
    sheet.getRange(meetingRow, kidColumn).setValue(status);
    
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true 
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('Error in updateRSVP:', error);
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================================
// SNACK FUNCTIONS
// ============================================================================

function getSnacks(filterDate) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Snacks');
    if (!sheet) {
      // If Snacks sheet doesn't exist, return empty array
      return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    }
    
    const data = sheet.getDataRange().getValues();
    
    if (data.length === 0) {
      return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    }
    
    const headers = data[0];
    const meetings = [];
    
    // Process each row (skip header)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const meetingDate = row[0];
      
      if (!meetingDate) continue;
      
      const kids = [];
      
      // Check each child column for cake emoji
      for (let j = 1; j < headers.length; j++) {
        const childName = headers[j];
        const cellValue = row[j];
        
        // Only include children who have the cake assignment
        if (cellValue === '🍰') {
          kids.push({
            name: childName,
            status: '🍰'
          });
        }
      }
      
      meetings.push({
        meetingDate: meetingDate,
        kids: kids
      });
    }
    
    // If a filterDate is provided, return only that meeting
    if (filterDate) {
      const normalizedFilter = String(filterDate).trim();
      const filtered = meetings.filter(m => {
        const dateStr = String(m.meetingDate).trim();
        if (dateStr === normalizedFilter) return true;
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          const iso = `${parsed.getFullYear()}-${String(parsed.getMonth()+1).padStart(2,'0')}-${String(parsed.getDate()).padStart(2,'0')}`;
          return iso === normalizedFilter;
        }
        return false;
      });
      return ContentService.createTextOutput(JSON.stringify(filtered)).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify(meetings)).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('Error in getSnacks:', error);
    return ContentService.createTextOutput(JSON.stringify({ 
      error: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function assignSnack(meetingDate, kidName) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Snacks');
    if (!sheet) {
      throw new Error('Snacks sheet not found');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find or create the meeting row - bulletproof comparison
    let meetingRow = -1;
    for (let i = 1; i < data.length; i++) {
      const rowDate = data[i][0];
      
      if (!rowDate) continue; // Skip empty cells
      
      // Convert both to strings and trim whitespace
      const rowDateStr = String(rowDate).trim();
      const meetingDateStr = String(meetingDate).trim();
      
      // Try exact match first
      if (rowDateStr === meetingDateStr) {
        meetingRow = i + 1;
        break;
      }
      
      // If it's a Date object, convert to YYYY-MM-DD
      if (rowDate instanceof Date) {
        const year = rowDate.getFullYear();
        const month = String(rowDate.getMonth() + 1).padStart(2, '0');
        const day = String(rowDate.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        
        if (formattedDate === meetingDateStr) {
          meetingRow = i + 1;
          break;
        }
      }
    }
    
    // If meeting doesn't exist, create new row
    if (meetingRow === -1) {
      sheet.appendRow([meetingDate]);
      meetingRow = sheet.getLastRow();
    }
    
    // Find the child column
    const kidColumn = headers.indexOf(kidName) + 1; // +1 for 1-based indexing
    if (kidColumn === 0) {
      throw new Error(`Child ${kidName} not found in headers`);
    }
    
    // Clear all other assignments for this meeting (binary logic - only one family can bring snacks)
    for (let j = 2; j <= headers.length; j++) {
      sheet.getRange(meetingRow, j).setValue('');
    }
    
    // Set the cake emoji for this child
    sheet.getRange(meetingRow, kidColumn).setValue('🍰');
    
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true 
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('Error in assignSnack:', error);
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function removeSnack(meetingDate, kidName) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Snacks');
    if (!sheet) {
      throw new Error('Snacks sheet not found');
    }
    
    const data = sheet.getDataRange().getValues();
    
    // Find the meeting row - bulletproof comparison
    let meetingRow = -1;
    for (let i = 1; i < data.length; i++) {
      const rowDate = data[i][0];
      
      if (!rowDate) continue; // Skip empty cells
      
      // Convert both to strings and trim whitespace
      const rowDateStr = String(rowDate).trim();
      const meetingDateStr = String(meetingDate).trim();
      
      // Try exact match first
      if (rowDateStr === meetingDateStr) {
        meetingRow = i + 1;
        break;
      }
      
      // If it's a Date object, convert to YYYY-MM-DD
      if (rowDate instanceof Date) {
        const year = rowDate.getFullYear();
        const month = String(rowDate.getMonth() + 1).padStart(2, '0');
        const day = String(rowDate.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        
        if (formattedDate === meetingDateStr) {
          meetingRow = i + 1;
          break;
        }
      }
    }
    
    if (meetingRow === -1) {
      // Meeting doesn't exist, nothing to remove
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Clear all assignments for this meeting
    const headers = data[0];
    // Start from column 2 (first child) and go through all child columns
    for (let j = 2; j <= headers.length; j++) {
      sheet.getRange(meetingRow, j).setValue('');
    }
    
    // Force a flush to ensure changes are saved
    SpreadsheetApp.flush();
    
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true 
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('Error in removeSnack:', error);
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Creates the Snacks sheet if it doesn't exist
 * Call this function manually if you need to set up the sheet structure
 */
function createSnacksSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName('Snacks');
  
  if (!sheet) {
    sheet = spreadsheet.insertSheet('Snacks');
    
    // Set up headers: Date, then child names
    const headers = ['Meeting Date', 'Jasper', 'Asher', 'Kai', 'Jeremiah', 'Luca', 'Ethan'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Format the header row
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#dc2626');
    headerRange.setFontColor('white');
    
    console.log('Snacks sheet created successfully');
  } else {
    console.log('Snacks sheet already exists');
  }
}

/**
 * Creates the RSVPs sheet if it doesn't exist
 * Call this function manually if you need to set up the sheet structure
 */
function createRSVPsSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName('RSVPs');
  
  if (!sheet) {
    sheet = spreadsheet.insertSheet('RSVPs');
    
    // Set up headers: Date, then child names
    const headers = ['Meeting Date', 'Jasper', 'Asher', 'Kai', 'Jeremiah', 'Luca', 'Ethan'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Format the header row
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#dc2626');
    headerRange.setFontColor('white');
    
    console.log('RSVPs sheet created successfully');
  } else {
    console.log('RSVPs sheet already exists');
  }
}

function testRemove() {
  const result = removeSnack('2025-08-10', 'Jasper');
  console.log('Result:', result);
}
