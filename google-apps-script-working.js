/**
 * Google Apps Script for FLL Team RSVP Management
 * Updated to support both kids and coaches columns
 * 
 * Expected spreadsheet structure:
 * Column A: Meeting Date (YYYY-MM-DD)
 * Columns B-G: Kids (Jasper, Asher, Kai, Jeremiah, Luca, Ethan)
 * Columns H-J: Coaches (Steve H, Steve S, Esther R)
 */

function doGet(e) {
  try {
    console.log('doGet called with:', e);
    
    // Handle case where e or e.parameter is undefined
    if (!e || !e.parameter) {
      console.log('No parameters provided, returning all RSVP data');
      return getAllRSVPData();
    }
    
    const action = e.parameter.action;
    console.log('Action requested:', action);
    
    if (action === 'update') {
      return handleUpdate(e);
    } else {
      return getAllRSVPData();
    }
  } catch (error) {
    console.error('Error in doGet:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  return doGet(e);
}

function getAllRSVPData() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length === 0) {
      return ContentService
        .createTextOutput(JSON.stringify([]))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const headers = data[0];
    console.log('Headers found:', headers);
    
    // Define expected columns
    const expectedColumns = {
      kids: ['Jasper', 'Asher', 'Kai', 'Jeremiah', 'Luca', 'Ethan'],
      coaches: ['Steve H', 'Steve S', 'Esther R']
    };
    
    // Find column indices for all people (kids + coaches)
    const columnMap = {};
    const allPeople = [...expectedColumns.kids, ...expectedColumns.coaches];
    
    allPeople.forEach(name => {
      const index = headers.indexOf(name);
      if (index !== -1) {
        columnMap[name] = index;
        console.log(`Found column for ${name} at index ${index}`);
      } else {
        console.warn(`Column not found for ${name}`);
      }
    });
    
    const result = [];
    
    // Process each meeting row (skip header row)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const meetingDate = row[0];
      
      if (!meetingDate) continue; // Skip empty rows
      
      // Convert date to ISO string if it's a Date object
      let formattedDate;
      if (meetingDate instanceof Date) {
        formattedDate = meetingDate.toISOString().split('T')[0];
      } else {
        // Try to convert the object/string to a Date and then to YYYY-MM-DD
        const dateObj = new Date(meetingDate);
        if (!isNaN(dateObj.getTime())) {
          formattedDate = dateObj.toISOString().split('T')[0];
        } else {
          formattedDate = meetingDate.toString();
        }
      }
      
      const meetingData = {
        meetingDate: formattedDate,
        kids: []
      };
      
      // Add all people (kids + coaches) to the kids array
      // (keeping the same structure for compatibility)
      allPeople.forEach(name => {
        const columnIndex = columnMap[name];
        let status = '';
        
        if (columnIndex !== undefined) {
          const cellValue = row[columnIndex];
          if (cellValue) {
            // Decode URL-encoded emojis if needed
            status = decodeURIComponent(cellValue.toString());
          }
        }
        
        meetingData.kids.push({
          name: name,
          status: status
        });
      });
      
      result.push(meetingData);
    }
    
    console.log('Returning RSVP data:', result);
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in getAllRSVPData:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleUpdate(e) {
  try {
    console.log('handleUpdate called with:', e);
    
    if (!e || !e.parameter) {
      throw new Error('No parameters provided to handleUpdate');
    }
    
    const meetingDate = e.parameter.meetingDate;
    const kidName = e.parameter.kidName; // This now includes coaches too
    const status = decodeURIComponent(e.parameter.status || '');
    
    console.log('Update request:', { meetingDate, kidName, status });
    
    if (!meetingDate || !kidName) {
      throw new Error('Missing required parameters: meetingDate and kidName');
    }
    
    const sheet = SpreadsheetApp.getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length === 0) {
      throw new Error('Spreadsheet is empty');
    }
    
    const headers = data[0];
    
    // Find the column for this person (kid or coach)
    const personColumnIndex = headers.indexOf(kidName);
    if (personColumnIndex === -1) {
      throw new Error(`Column not found for ${kidName}. Available columns: ${headers.join(', ')}`);
    }
    
    // Find the row for this meeting date
    let meetingRowIndex = -1;
    console.log('Looking for meeting date:', meetingDate);
    console.log('Total rows in spreadsheet:', data.length);
    
    for (let i = 1; i < data.length; i++) {
      const rowDate = data[i][0];
      let formattedRowDate;
      
      console.log(`Row ${i}: raw date =`, rowDate, 'Type:', typeof rowDate);
      
      if (rowDate instanceof Date) {
        formattedRowDate = rowDate.toISOString().split('T')[0];
        console.log(`Row ${i}: Date object converted to`, formattedRowDate);
      } else {
        // Try to convert the object/string to a Date and then to YYYY-MM-DD
        const dateObj = new Date(rowDate);
        if (!isNaN(dateObj.getTime())) {
          formattedRowDate = dateObj.toISOString().split('T')[0];
          console.log(`Row ${i}: Object converted via Date() to`, formattedRowDate);
        } else {
          formattedRowDate = rowDate.toString();
          console.log(`Row ${i}: Failed to parse, using toString():`, formattedRowDate);
        }
      }
      
      console.log(`Row ${i}: Comparing "${formattedRowDate}" === "${meetingDate}"`);
      
      if (formattedRowDate === meetingDate) {
        meetingRowIndex = i + 1; // +1 because sheet rows are 1-indexed
        console.log(`✅ Found match at row ${meetingRowIndex}`);
        break;
      }
    }
    
    if (meetingRowIndex === -1) {
      console.log('❌ No matching date found');
    }
    
    if (meetingRowIndex === -1) {
      throw new Error(`Meeting date ${meetingDate} not found in spreadsheet`);
    }
    
    // Update the cell
    const cell = sheet.getRange(meetingRowIndex, personColumnIndex + 1); // +1 because columns are 1-indexed
    cell.setValue(status);
    
    console.log(`Updated ${kidName} for ${meetingDate} to ${status}`);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: true, 
        message: `Updated ${kidName} for ${meetingDate}`,
        data: { meetingDate, kidName, status }
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in handleUpdate:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        error: error.toString() 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Test function to verify the script is working
 * Run this in the Apps Script editor to test
 */
function testGetData() {
  const result = getAllRSVPData();
  const data = JSON.parse(result.getContent());
  console.log('Test result:', data);
  return data;
}

/**
 * Test function to verify updates are working
 * Run this in the Apps Script editor to test
 */
function testUpdate() {
  // Create a mock request object
  const mockRequest = {
    parameter: {
      action: 'update',
      meetingDate: '2025-08-17', // Use an actual date from your sheet
      kidName: 'Steve H',        // Test with a coach name
      status: '👍'
    }
  };
  
  const result = handleUpdate(mockRequest);
  const data = JSON.parse(result.getContent());
  console.log('Test update result:', data);
  return data;
}