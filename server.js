require("dotenv").config();

const express = require("express");
const nodemailer = require("nodemailer");
const { google } = require("googleapis");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_BEARER_TOKEN = process.env.API_BEARER_TOKEN || "change-me";

// ===== SMTP =====
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "appel.rubiomonocoat@gmail.com",
    pass: process.env.SMTP_PASS,
  },
});

// ===== GOOGLE SHEETS =====
const SHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const SHEET_NAME = "Logs";

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

// ===== AUTH =====
function checkAuth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token !== API_BEARER_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// ===== HELPERS =====
function normalizeCode(input) {
  if (!input) return "";
  let code = String(input).replace(/\D/g, "");
  return code.length === 1 ? "0" + code : code.slice(0, 2);
}

// ===== CONTACTS =====
const CONTACTS = {
  baptiste: {
    name: "Baptiste",
    phone: "+33675859240",
    email: "baptiste@rubiomonocoat.fr",
  },
  guillaume: {
    name: "Guillaume",
    phone: "+33607122212",
    email: "guillaume@rubiomonocoat.fr",
  },
  sebastien: {
    name: "Sébastien",
    phone: "+33621414949",
    email: "sebastien@rubiomonocoat.fr",
  },
};

// ===== ROUTING =====
const ROUTING = {
  "75": CONTACTS.baptiste,
  "41": CONTACTS.guillaume,
};

// ===== GOOGLE SHEETS WRITE =====
async function appendRow(data) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A:I`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [[
        new Date().toLocaleString("fr-FR"),
        data.callerNumber,
        data.departmentCode,
        data.reason,
        data.selected,
        data.email,
        data.target,
        "en_cours",
        0,
      ]],
    },
  });

  console.log("ROW WRITTEN IN GOOGLE SHEETS");
}

// ===== ROUTE SMART ROUTING =====
app.post("/aircall/smart-routing", checkAuth, async (req, res) => {
  console.log("=== SMART ROUTING ===");
  console.log(JSON.stringify(req.body, null, 2));

  const callerNumber = req.body.callerNumber || "unknown";
  const rawCode = req.body.departmentCode || "";
  const callId = req.body.callId || "";

  const departmentCode = normalizeCode(rawCode);

  const contact = ROUTING[departmentCode] || CONTACTS.sebastien;

  console.log("callerNumber =", callerNumber);
  console.log("departmentCode =", departmentCode);
  console.log("callId =", callId);
  console.log("target =", contact.name);

  // 🔥 IMPORTANT : répondre immédiatement
  res.json({
    routing: {
      targetType: "external",
      targetValue: contact.phone,
    },
  });

  // ===== EMAIL =====
  transporter.sendMail({
    from: "appel.rubiomonocoat@gmail.com",
    to: contact.email,
    subject: "Nouvel appel entrant",
    text: `Appel de ${callerNumber}`,
  }).catch(console.error);

  // ===== GOOGLE SHEET =====
  appendRow({
    callerNumber,
    departmentCode,
    reason: "MATCH",
    selected: contact.name,
    email: contact.email,
    target: contact.phone,
    callId,
  }).catch(console.error);
});

// ===== HEALTH =====
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("API RUNNING ON PORT " + PORT);
});
