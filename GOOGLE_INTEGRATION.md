# Google Calendar & Google Sheets Integration Guide (Option A)

This guide walks you through connecting your Apex Healthcare Voice Assistant to your **Google Calendar** and **Google Sheets** using Google Apps Script (Option A - Webhook method).

---

## 🚀 Quick Setup (Takes 2 Minutes)

### Step 1: Create a Google Sheet
1. Go to [Google Sheets](https://sheets.new) and create a new blank spreadsheet.
2. Name the sheet **Apex Clinic Appointments**.
3. In the first row (Header row), set up the following 7 columns:
   - **Column A**: `Timestamp`
   - **Column B**: `Patient Name`
   - **Column C**: `Phone Number`
   - **Column D**: `Doctor / Specialty`
   - **Column E**: `Appointment Date & Time`
   - **Column F**: `Status`
   - **Column G**: `Notes`

---

### Step 2: Add Google Apps Script
1. In your Google Sheet, click **Extensions** > **Apps Script** in the top menu bar.
2. Replace all the default code in `Code.gs` with the following snippet:

```javascript
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    var patientName = data.patient_name || data.name || "Valued Patient";
    var phone = data.phone_number || data.phone || "Not provided";
    var doctor = data.doctor_or_specialty || data.doctor || "General Consultation";
    var dateTimeStr = data.date_time || data.dateTime || "As requested";
    var isoDateTime = data.iso_date_time || null;
    var insurance = data.insurance_details || data.insurance || "Self-pay / N/A";
    var notes = data.notes || "Booked via Apex Voice Assistant";
    var timestamp = new Date();

    // 1. Append to Google Sheet (7 Columns: Timestamp, Patient Name, Phone Number, Doctor / Specialty, Appointment Date & Time, Status, Notes)
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    sheet.appendRow([
      timestamp,
      patientName,
      phone,
      doctor,
      dateTimeStr,
      "Confirmed",
      notes
    ]);

    // 2. Create Google Calendar Event
    var calendar = CalendarApp.getDefaultCalendar();
    var eventTitle = "Medical Appointment: " + patientName + " (" + doctor + ")";

    // Parse start time accurately using ISO timestamp or smart relative parser
    var startTime = parseAppointmentDateTime(dateTimeStr, isoDateTime);
    var endTime = new Date(startTime.getTime() + 30 * 60 * 1000); // 30 minutes duration

    var description = "Patient Name: " + patientName + "\n" +
                      "Phone Number: " + phone + "\n" +
                      "Doctor / Specialty: " + doctor + "\n" +
                      "Requested Time: " + dateTimeStr + "\n" +
                      "Insurance / Payment: " + insurance + "\n" +
                      "Notes: " + notes;

    calendar.createEvent(eventTitle, startTime, endTime, {
      description: description
    });

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Appointment saved to Calendar & Sheet",
      scheduledTime: startTime.toString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Intelligent date and time parser for Google Apps Script
 */
function parseAppointmentDateTime(dateTimeStr, isoDateTime) {
  // 1. If pre-formatted ISO timestamp is passed from backend, use it
  if (isoDateTime) {
    var pIso = Date.parse(isoDateTime);
    if (!isNaN(pIso)) {
      return new Date(pIso);
    }
  }

  // 2. Try standard Date.parse
  if (dateTimeStr) {
    var pStr = Date.parse(dateTimeStr);
    if (!isNaN(pStr)) {
      var d = new Date(pStr);
      if (d.getFullYear() > 2000) return d;
    }
  }

  // 3. Natural language fallback parser for relative dates & times
  var rawStr = String(dateTimeStr || "").trim();
  var lower = rawStr.toLowerCase();
  var now = new Date();
  var targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0, 0);

  if (lower.indexOf("day after tomorrow") !== -1) {
    targetDate.setDate(now.getDate() + 2);
  } else if (lower.indexOf("tomorrow") !== -1) {
    targetDate.setDate(now.getDate() + 1);
  } else if (lower.indexOf("today") !== -1) {
    targetDate.setDate(now.getDate());
  } else {
    var days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    for (var i = 0; i < days.length; i++) {
      if (lower.indexOf(days[i]) !== -1) {
        var currentDay = now.getDay();
        var diff = i - currentDay;
        if (diff <= 0) diff += 7;
        targetDate.setDate(now.getDate() + diff);
        break;
      }
    }
  }

  // Convert spelled numbers to digits for common hours (e.g. "four PM" -> "4 PM")
  var wordMap = {
    "one": "1", "two": "2", "three": "3", "four": "4", "five": "5",
    "six": "6", "seven": "7", "eight": "8", "nine": "9", "ten": "10",
    "eleven": "11", "twelve": "12"
  };
  var timeStr = lower;
  for (var key in wordMap) {
    timeStr = timeStr.replace(new RegExp("\\b" + key + "\\b", "g"), wordMap[key]);
  }

  var timeMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    var hours = parseInt(timeMatch[1], 10);
    var minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    var ampm = timeMatch[3] ? timeMatch[3].toLowerCase() : null;

    if (ampm === "pm" && hours < 12) hours += 12;
    if (ampm === "am" && hours === 12) hours = 0;
    if (!ampm && hours >= 1 && hours <= 7) hours += 12;

    targetDate.setHours(hours, minutes, 0, 0);
  }

  return targetDate;
}
```

---

### Step 3: Deploy as Webhook
1. Click **Deploy** (top right) > **New deployment**.
2. Click the gear icon ⚙️ next to *Select type* and select **Web app**.
3. Fill in settings:
   - **Description**: `Apex Clinic Voice Assistant Webhook`
   - **Execute as**: `Me`
   - **Who has access**: `Anyone` (Crucial so your backend can call it)
4. Click **Deploy**.
5. Grant access / authorizations if Google prompts you.
6. Copy the **Web App URL** (looks like `https://script.google.com/macros/s/.../exec`).

---

### Step 4: Add URL to your `.env`
Open `.env` (and/or `agent/.env`) in this repository and paste your Web App URL:

```env
GOOGLE_WEBHOOK_URL=https://script.google.com/macros/s/YOUR_GENERATED_SCRIPT_ID/exec
```

---

## 🧪 Testing the Integration

### Test via cURL or Postman:
You can test your endpoint locally using PowerShell or terminal:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/book-appointment" -Method Post -ContentType "application/json" -Body '{"patient_name": "Rohan Verma", "phone_number": "+91 9876543210", "doctor_or_specialty": "Dr. Rajesh Sharma (General Medicine)", "date_time": "Tomorrow at 10 AM", "insurance_details": "Star Health Insurance", "notes": "Fever and routine health checkup"}'
```

### Test via Voice Assistant Chat:
Speak or type to Priya:
> *"Hi Priya, I want to book an appointment with Dr. Rajesh Sharma tomorrow at 10 AM. My name is Rohan Verma and my phone number is 9876543210."*

Priya will automatically execute the `book_appointment` tool and save the event into your Google Calendar and row into your Google Sheet!
