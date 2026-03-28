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

function parseDuration(value) {
  return Number.isFinite(Number(value)) ? Math.round(value) : 0;
}

function getStatus(duration) {
  if (duration <= 0) return "en_cours";
  if (duration >= 60) return "appel";
  if (duration >= 20) return "messagerie";
  return "refusé";
}

// ===== ROUTING =====
const CONTACTS = {
  baptiste: { name: "Baptiste", phone: "+33675859240", email: "baptiste@rubiomonocoat.fr" },
  guillaume: { name: "Guillaume", phone: "+33607122212", email: "guillaume@rubiomonocoat.fr" },
  sebastien: { name: "Sébastien", phone: "+33621414949", email: "sebastien@rubiomonocoat.fr" },
};

const ROUTING = {
  "75": CONTACTS.baptiste,
  "41": CONTACTS.guillaume,
};

// ===== GOOGLE SHEETS =====
async function appendRow(data) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A:J`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        new Date().toLocaleString("fr-FR"),
        data.callerNumber,
        data.departmentCode,
        data.reason,
        data.selected,
        data.email,
        data.target,
        data.status,
        data.duration,
        data.callId,
      ]],
    },
  });
}

async function findRowByCaller(callerNumber) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A:J`,
  });

  const rows = res.data.values || [];

  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i][1] === callerNumber && rows[i][7] === "en_cours") {
      return i + 1;
    }
  }
  return null;
}

async function updateRow(callerNumber, status, duration) {
  const row = await findRowByCaller(callerNumber);
  if (!row) return console.log("No row found");

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!H${row}:I${row}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[status, duration]],
    },
  });

  console.log("UPDATED ROW", row);
}

// ===== ROUTE SMART ROUTING =====
app.post("/aircall/smart-routing", checkAuth, async (req, res) => {
  console.log("=== SMART ROUTING ===");
  console.log(JSON.stringify(req.body, null, 2));

  const body = req.body.data || req.body;

  const callerNumber = body.number || body.from || "unknown";
  const callId = body.id || null;

  const departmentCode = normalizeCode(body.raw_digits || body.digits);

  const contact = ROUTING[departmentCode] || CONTACTS.sebastien;

  // réponse immédiate
  res.json({
    routing: {
      targetType: "external",
      targetValue: contact.phone,
    },
  });

  // async
  appendRow({
    callerNumber,
    departmentCode,
    reason: "MATCH",
    selected: contact.name,
    email: contact.email,
    target: contact.phone,
    status: "en_cours",
    duration: 0,
    callId,
  }).catch(console.error);

  transporter.sendMail({
    from: "appel.rubiomonocoat@gmail.com",
    to: contact.email,
    subject: "Nouvel appel",
    text: `Appel de ${callerNumber}`,
  }).catch(console.error);
});

// ===== ROUTE CALL ENDED =====
app.post("/aircall/call-ended", checkAuth, async (req, res) => {
  console.log("=== CALL ENDED ===");
  console.log(JSON.stringify(req.body, null, 2));

  const body = req.body.data || req.body;

  const callerNumber = body.number || body.raw_digits;
  const duration = parseDuration(body.duration);

  const status = getStatus(duration);

  res.json({ ok: true });

  updateRow(callerNumber, status, duration).catch(console.error);
});

// ===== HEALTH =====
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log("SERVER RUNNING");
});
