// Add this function to your Google Apps Script to see what the web page is sending

function debugWebRequest(meetingDate, kidName) {
  console.log('=== DEBUG WEB REQUEST ===');
  console.log('Received meetingDate:', meetingDate);
  console.log('Type:', typeof meetingDate);
  console.log('Length:', meetingDate ? meetingDate.length : 'null');
  console.log('Received kidName:', kidName);
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Snacks');
  const data = sheet.getDataRange().getValues();
  
  console.log('=== SHEET DATA ===');
  for (let i = 1; i < data.length; i++) {
    const rowDate = data[i][0];
    console.log(`Row ${i}: "${rowDate}" (type: ${typeof rowDate})`);
    
    // Test exact match
    if (rowDate && rowDate.toString().trim() === meetingDate) {
      console.log(`EXACT MATCH found at row ${i}`);
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true, 
        message: 'Found exact match',
        rowFound: i 
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  console.log('NO EXACT MATCH FOUND');
  return ContentService.createTextOutput(JSON.stringify({ 
    success: false, 
    message: 'No match found',
    receivedDate: meetingDate 
  })).setMimeType(ContentService.MimeType.JSON);
}

// Update your doGet function to include this:
function doGet(e) {
  const action = e.parameter.action;
  
  // Add this debug action
  if (action === 'debug') {
    return debugWebRequest(e.parameter.meetingDate, e.parameter.kidName);
  }
  
  // ... rest of your existing doGet code
}