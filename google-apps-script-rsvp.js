/**
 * Updated Google Apps Script for RSVP Backend
 * This script handles both GET (read) and POST (write) operations for RSVP data
 * 
 * Instructions:
 * 1. Go to script.google.com
 * 2. Open your existing RSVP project
 * 3. Replace the entire Code.gs content with this script
 * 4. Save and deploy as web app with "Anyone" access
 */

function doGet(e) {
  try {
    const params = e.parameter;
    
    // Handle update requests via query parameters
    if (params.action === 'update') {
      return doPost(e);
    }
    
    // Default: return current RSVP data
    return getRSVPData();
    
  } catch (error) {
    console.error('Error in doGet:', error);
    return ContentService.createTextOutput(JSON.stringify({
      error: 'Failed to process request: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    let data;
    
    // Handle both POST body and query parameters
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      data = e.parameter;
    } else {
      throw new Error('No data provided');
    }
    
    const meetingDate = data.meetingDate;
    const kidName = data.kidName;
    // Decode URL-encoded status parameter (for emojis)
    const status = data.status ? decodeURIComponent(data.status) : '';
    
    if (!meetingDate || !kidName || !status) {
      throw new Error('Missing required parameters: meetingDate, kidName, status');
    }
    
    // Update the RSVP data
    updateRSVPData(meetingDate, kidName, status);
    
    // Return success response
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'RSVP updated successfully'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('Error in doPost:', error);
    return ContentService.createTextOutput(JSON.stringify({
      error: 'Failed to update RSVP: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getRSVPData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  if (values.length === 0) {
    // Initialize empty data structure if sheet is empty
    return ContentService.createTextOutput(JSON.stringify([{
      meetingDate: "2025-08-17T07:00:00.000Z",
      kids: [
        { name: "Jasper", status: "" },
        { name: "Asher", status: "" },
        { name: "Kai", status: "" },
        { name: "Jeremiah", status: "" },
        { name: "Luca", status: "" },
        { name: "Ethan", status: "" }
      ]
    }])).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Assuming first row is headers: Meeting Date, Jasper, Asher, Kai, Jeremiah, Luca, Ethan
  const headers = values[0];
  const result = [];
  
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const meetingDate = row[0];
    
    if (!meetingDate) continue;
    
    const kids = [
      { name: "Jasper", status: row[1] || "" },
      { name: "Asher", status: row[2] || "" },
      { name: "Kai", status: row[3] || "" },
      { name: "Jeremiah", status: row[4] || "" },
      { name: "Luca", status: row[5] || "" },
      { name: "Ethan", status: row[6] || "" }
    ];
    
    result.push({
      meetingDate: formatDateForAPI(meetingDate),
      kids: kids
    });
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function updateRSVPData(meetingDate, kidName, status) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  // Initialize sheet if empty
  if (values.length === 0) {
    sheet.getRange(1, 1, 1, 7).setValues([['Meeting Date', 'Jasper', 'Asher', 'Kai', 'Jeremiah', 'Luca', 'Ethan']]);
    values.push(['Meeting Date', 'Jasper', 'Asher', 'Kai', 'Jeremiah', 'Luca', 'Ethan']);
  }
  
  const headers = values[0];
  const kidIndex = headers.indexOf(kidName);
  
  if (kidIndex === -1) {
    throw new Error(`Kid name '${kidName}' not found in headers`);
  }
  
  // Find or create row for this meeting date
  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    const rowDate = values[i][0];
    if (rowDate && formatDateForAPI(rowDate) === formatDateForAPI(meetingDate)) {
      rowIndex = i;
      break;
    }
  }
  
  if (rowIndex === -1) {
    // Create new row for this meeting date
    rowIndex = values.length;
    const newRow = new Array(headers.length).fill('');
    newRow[0] = meetingDate;
    sheet.getRange(rowIndex + 1, 1, 1, headers.length).setValues([newRow]);
  }
  
  // Update the specific cell
  sheet.getRange(rowIndex + 1, kidIndex + 1).setValue(status);
}

function formatDateForAPI(date) {
  if (typeof date === 'string') {
    // If it's already a string, try to parse and format it consistently
    if (date.includes('T')) {
      return date; // Already in ISO format
    } else {
      // Convert YYYY-MM-DD to ISO format
      return new Date(date + 'T07:00:00.000Z').toISOString();
    }
  } else if (date instanceof Date) {
    return date.toISOString();
  }
  return date.toString();
}