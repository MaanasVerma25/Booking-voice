# Google Calendar & Google Sheets Integration Guide (Option A)

This guide walks you through connecting your Apex Healthcare Voice Assistant to your **Google Calendar** and **Google Sheets** using Google Apps Script (Option A - Webhook method).

---

## 🚀 Quick Setup (Takes 2 Minutes)

### Step 1: Create a Google Sheet
1. Go to [Google Sheets](https://sheets.new) and create a new blank spreadsheet.
2. Name the sheet **Apex Clinic Appointments**.
3. In the first row (Header row), set up the following columns:
   - **Column A**: `Timestamp`
   - **Column B**: `Patient Name`
   - **Column C**: `Phone Number`
   - **Column D**: `Doctor / Specialty`
   - **Column E**: `Appointment Date & Time`
   - **Column F**: `Insurance / Payment`
   - **Column G**: `Status`
   - **Column H**: `Notes`

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
    var insurance = data.insurance_details || data.insurance || "Self-pay / N/A";
    var notes = data.notes || "Booked via Apex Voice Assistant";
    var timestamp = new Date();

    // 1. Append to Google Sheet
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    sheet.appendRow([
      timestamp,
      patientName,
      phone,
      doctor,
      dateTimeStr,
      insurance,
      "Confirmed",
      notes
    ]);

    // 2. Create Google Calendar Event
    var calendar = CalendarApp.getDefaultCalendar();
    var eventTitle = "Medical Appointment: " + patientName + " (" + doctor + ")";

    // Parse start time (or default to tomorrow 10 AM if parsing is flexible)
    var startTime = new Date();
    startTime.setDate(startTime.getDate() + 1);
    startTime.setHours(10, 0, 0, 0);

    var parsed = Date.parse(dateTimeStr);
    if (!isNaN(parsed)) {
      startTime = new Date(parsed);
    }

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
      message: "Appointment saved to Calendar & Sheet"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
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
