require("dotenv").config();

const express = require("express");
const nodemailer = require("nodemailer");
const { google } = require("googleapis");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_BEARER_TOKEN = process.env.API_BEARER_TOKEN || "change-me";

// =========================
// SMTP Gmail
// =========================
const SMTP_HOST = "smtp.gmail.com";
const SMTP_PORT = 465;
const SMTP_SECURE = true;
const SMTP_USER = "appel.rubiomonocoat@gmail.com";
const SMTP_PASS = process.env.SMTP_PASS;
const MAIL_FROM = "appel.rubiomonocoat@gmail.com";

// =========================
// Google Sheets
// =========================
const SHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY =
  process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

const SHEET_NAME_LOGS = "Logs";
const SHEET_NAME_COMPTA = "compta";
const SHEET_NAME_SUIVI_COMMANDE = "suivi_commande";

// =========================
// Cibles fixes
// =========================
const BARBARA_EMAIL = "barbara@rubiomonocoat.fr";
const SERVICE_TARGET_NUMBER = "+33760078204";

// =========================
// Contacts commerciaux
// =========================
const CONTACTS = {
  baptiste: {
    id: "baptiste",
    name: "Baptiste Verriele",
    email: "baptiste@rubiomonocoat.fr",
    targetType: "external",
    targetValue: "+33675859240",
  },
  guillaume: {
    id: "guillaume",
    name: "Guillaume Nepveu",
    email: "guillaume@rubiomonocoat.fr",
    targetType: "external",
    targetValue: "+33607122212",
  },
  laurent: {
    id: "laurent",
    name: "Laurent Moreau",
    email: "laurent@rubiomonocoat.fr",
    targetType: "external",
    targetValue: "+33608660394",
  },
  antony: {
    id: "antony",
    name: "Antony Grasser",
    email: "antony@rubiomonocoat.fr",
    targetType: "external",
    targetValue: "+33698281840",
  },
  benjamin: {
    id: "benjamin",
    name: "Benjamin Hardial",
    email: "benjamin@rubiomonocoat.fr",
    targetType: "external",
    targetValue: "+33786358881",
  },
  sebastien: {
    id: "sebastien",
    name: "Sébastien",
    email: "sebastien@rubiomonocoat.fr",
    targetType: "external",
    targetValue: "+33621414949",
  },
};

const ROUTING = {
  "02": CONTACTS.baptiste,
  "08": CONTACTS.baptiste,
  "27": CONTACTS.baptiste,
  "51": CONTACTS.baptiste,
  "59": CONTACTS.baptiste,
  "60": CONTACTS.baptiste,
  "62": CONTACTS.baptiste,
  "75": CONTACTS.baptiste,
  "76": CONTACTS.baptiste,
  "77": CONTACTS.baptiste,
  "78": CONTACTS.baptiste,
  "80": CONTACTS.baptiste,
  "91": CONTACTS.baptiste,
  "92": CONTACTS.baptiste,
  "93": CONTACTS.baptiste,
  "94": CONTACTS.baptiste,
  "95": CONTACTS.baptiste,

  "03": CONTACTS.guillaume,
  "14": CONTACTS.guillaume,
  "18": CONTACTS.guillaume,
  "22": CONTACTS.guillaume,
  "28": CONTACTS.guillaume,
  "29": CONTACTS.guillaume,
  "35": CONTACTS.guillaume,
  "37": CONTACTS.guillaume,
  "41": CONTACTS.guillaume,
  "44": CONTACTS.guillaume,
  "45": CONTACTS.guillaume,
  "49": CONTACTS.guillaume,
  "50": CONTACTS.guillaume,
  "53": CONTACTS.guillaume,
  "56": CONTACTS.guillaume,
  "58": CONTACTS.guillaume,
  "61": CONTACTS.guillaume,
  "72": CONTACTS.guillaume,
  "85": CONTACTS.guillaume,
  "89": CONTACTS.guillaume,

  "09": CONTACTS.laurent,
  "16": CONTACTS.laurent,
  "17": CONTACTS.laurent,
  "19": CONTACTS.laurent,
  "23": CONTACTS.laurent,
  "24": CONTACTS.laurent,
  "31": CONTACTS.laurent,
  "32": CONTACTS.laurent,
  "33": CONTACTS.laurent,
  "36": CONTACTS.laurent,
  "40": CONTACTS.laurent,
  "46": CONTACTS.laurent,
  "47": CONTACTS.laurent,
  "64": CONTACTS.laurent,
  "65": CONTACTS.laurent,
  "79": CONTACTS.laurent,
  "81": CONTACTS.laurent,
  "82": CONTACTS.laurent,
  "86": CONTACTS.laurent,
  "87": CONTACTS.laurent,

  "01": CONTACTS.antony,
  "10": CONTACTS.antony,
  "21": CONTACTS.antony,
  "25": CONTACTS.antony,
  "39": CONTACTS.antony,
  "52": CONTACTS.antony,
  "54": CONTACTS.antony,
  "55": CONTACTS.antony,
  "57": CONTACTS.antony,
  "67": CONTACTS.antony,
  "68": CONTACTS.antony,
  "69": CONTACTS.antony,
  "70": CONTACTS.antony,
  "71": CONTACTS.antony,
  "73": CONTACTS.antony,
  "74": CONTACTS.antony,
  "88": CONTACTS.antony,
  "90": CONTACTS.antony,

  "04": CONTACTS.benjamin,
  "05": CONTACTS.benjamin,
  "06": CONTACTS.benjamin,
  "07": CONTACTS.benjamin,
  "11": CONTACTS.benjamin,
  "12": CONTACTS.benjamin,
  "13": CONTACTS.benjamin,
  "15": CONTACTS.benjamin,
  "20": CONTACTS.benjamin,
  "26": CONTACTS.benjamin,
  "30": CONTACTS.benjamin,
  "34": CONTACTS.benjamin,
  "38": CONTACTS.benjamin,
  "42": CONTACTS.benjamin,
  "43": CONTACTS.benjamin,
  "48": CONTACTS.benjamin,
  "63": CONTACTS.benjamin,
  "66": CONTACTS.benjamin,
  "83": CONTACTS.benjamin,
  "84": CONTACTS.benjamin,
};

// =========================
// Helpers
// =========================
function checkAuth(req, res, next) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  const token = header.slice(7);

  if (token !== API_BEARER_TOKEN) {
    return res.status(401).json({ error: "Invalid bearer token" });
  }

  next();
}

function nowParis() {
  return new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
}

function normalizeCode(input) {
  if (input == null) return "";

  let code = String(input).trim().toUpperCase();
  code = code.replace(/#/g, "");

  if (code === "2A" || code === "2B" || code === "20") {
    return "20";
  }

  code = code.replace(/\D/g, "");

  if (code.length === 1) {
    code = "0" + code;
  }

  return code.length === 2 ? code : "";
}

function parseAttempts(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function resolveTarget(codeRaw, attemptsRaw) {
  const attempts = parseAttempts(attemptsRaw);
  const code = normalizeCode(codeRaw);

  if (attempts >= 2) {
    return {
      contact: CONTACTS.sebastien,
      reason: "ATTEMPTS_FALLBACK",
      code,
      attempts,
    };
  }

  if (!code) {
    return {
      contact: CONTACTS.sebastien,
      reason: "INVALID_OR_MISSING_CODE",
      code,
      attempts,
    };
  }

  if (code === "97" || code === "98") {
    return {
      contact: CONTACTS.sebastien,
      reason: "DOM_ROUTED_TO_SEBASTIEN",
      code,
      attempts,
    };
  }

  return {
    contact: ROUTING[code] || CONTACTS.sebastien,
    reason: ROUTING[code] ? "MATCH" : "UNKNOWN_CODE_FALLBACK",
    code,
    attempts,
  };
}

function getTransporter() {
  if (!SMTP_USER || !SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

function getSheetsClient() {
  if (!SHEET_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    return null;
  }

  const auth = new google.auth.JWT({
    email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

async function appendToSheet(sheetName, values) {
  const sheets = getSheetsClient();

  if (!sheets) {
    console.log("SHEETS NOT WRITTEN: configuration Google manquante.");
    return;
  }

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!A:Z`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [values] },
  });

  console.log(`GOOGLE SHEETS APPEND OK [${sheetName}]:`, response.status);
  console.log("UPDATED RANGE:", response.data?.updates?.updatedRange);
}

async function sendEmail({ to, subject, text }) {
  const transporter = getTransporter();

  if (!transporter) {
    console.log("EMAIL NOT SENT: SMTP non configuré.");
    return;
  }

  await transporter.sendMail({
    from: MAIL_FROM,
    to,
    subject,
    text,
  });

  console.log(`EMAIL SENT TO ${to}`);
}

// =========================
// Emails
// =========================
async function sendSectorEmail({
  contact,
  departmentCode,
  callerNumber,
  callerName,
  callId,
}) {
  const subject = `Nouvel appel secteur ${departmentCode || "non défini"} - ${contact.name}`;

  const lines = [
    `Bonjour ${contact.name},`,
    ``,
    `Un appel client a été dirigé vers votre secteur.`,
    ``,
    `Commercial ciblé : ${contact.name}`,
    `Département saisi : ${departmentCode || "Non renseigné"}`,
    `Numéro appelant : ${callerNumber || "Non remonté"}`,
    `Nom appelant : ${callerName || "Non remonté"}`,
    `ID appel : ${callId || "Non remonté"}`,
    `Numéro routé : ${contact.targetValue}`,
    `Date : ${nowParis()}`,
    ``,
    `Email automatique généré par l'API de routage Aircall.`,
  ];

  await sendEmail({
    to: contact.email,
    subject,
    text: lines.join("\n"),
  });
}

async function sendBarbaraServiceEmail({
  serviceName,
  callerNumber,
  callerName,
  callId,
}) {
  const subject = `Nouvel appel ${serviceName}`;

  const lines = [
    `Bonjour Barbara,`,
    ``,
    `Un appel a été transféré vers le service ${serviceName}.`,
    ``,
    `Service : ${serviceName}`,
    `Numéro appelant : ${callerNumber || "Non remonté"}`,
    `Nom appelant : ${callerName || "Non remonté"}`,
    `ID appel : ${callId || "Non remonté"}`,
    `Numéro routé : ${SERVICE_TARGET_NUMBER}`,
    `Date : ${nowParis()}`,
    ``,
    `Email automatique généré par l'API de routage Aircall.`,
  ];

  await sendEmail({
    to: BARBARA_EMAIL,
    subject,
    text: lines.join("\n"),
  });
}

// =========================
// Google Sheets logs
// =========================
async function appendRoutingLogToSheet({
  callerNumber,
  departmentCode,
  reason,
  selected,
  selectedEmail,
  targetValue,
}) {
  await appendToSheet(SHEET_NAME_LOGS, [
    nowParis(),          // A
    callerNumber || "",  // B
    departmentCode || "",// C
    reason || "",        // D
    selected || "",      // E
    selectedEmail || "", // F
    targetValue || "",   // G
    "en_cours",          // H
    0,                   // I
  ]);
}

async function appendServiceLogToSheet({
  sheetName,
  serviceName,
  callerNumber,
  callerName,
  callId,
}) {
  await appendToSheet(sheetName, [
    nowParis(),              // A
    serviceName || "",       // B
    callerNumber || "",      // C
    callerName || "",        // D
    callId || "",            // E
    SERVICE_TARGET_NUMBER,   // F
    "transfert_direct",      // G
    "en_cours",              // H
    0,                       // I
  ]);
}

// =========================
// ROUTE 1 : COMMERCIAL
// Attendue après saisie des 2 chiffres du département
// =========================
app.post("/aircall/smart-routing", checkAuth, async (req, res) => {
  console.log("=== SMART ROUTING COMMERCIAL ===");
  console.log(JSON.stringify(req.body, null, 2));

  const rawCode = req.body.departmentCode ?? "";
  const rawAttempts = req.body.attempts ?? 0;
  const callerNumber = req.body.callerNumber ?? "";
  const callerName =
    req.body.callerName ??
    req.body.name ??
    req.body.caller_name ??
    "";
  const callId = req.body.callId ?? "";

  const result = resolveTarget(rawCode, rawAttempts);
  const departmentCode = result.code || "";

  res.json({
    routing: {
      targetType: result.contact.targetType,
      targetValue: result.contact.targetValue,
    },
  });

  sendSectorEmail({
    contact: result.contact,
    departmentCode,
    callerNumber,
    callerName,
    callId,
  }).catch((e) => console.error("EMAIL ERROR:", e));

  appendRoutingLogToSheet({
    callerNumber,
    departmentCode,
    reason: result.reason,
    selected: result.contact.name,
    selectedEmail: result.contact.email,
    targetValue: result.contact.targetValue,
  }).catch((e) => console.error("SHEETS ERROR:", e));
});

// =========================
// ROUTE 2 : COMPTA
// Transfert direct, sans département
// =========================
app.post("/aircall/compta-routing", checkAuth, async (req, res) => {
  console.log("=== COMPTA ROUTING ===");
  console.log(JSON.stringify(req.body, null, 2));

  const callerNumber = req.body.callerNumber ?? "";
  const callerName =
    req.body.callerName ??
    req.body.name ??
    req.body.caller_name ??
    "";
  const callId = req.body.callId ?? "";

  res.json({
    routing: {
      targetType: "external",
      targetValue: SERVICE_TARGET_NUMBER,
    },
  });

  sendBarbaraServiceEmail({
    serviceName: "compta",
    callerNumber,
    callerName,
    callId,
  }).catch((e) => console.error("EMAIL ERROR:", e));

  appendServiceLogToSheet({
    sheetName: SHEET_NAME_COMPTA,
    serviceName: "compta",
    callerNumber,
    callerName,
    callId,
  }).catch((e) => console.error("SHEETS ERROR:", e));
});

// =========================
// ROUTE 3 : SUIVI COMMANDE
// Transfert direct, sans département
// =========================
app.post("/aircall/suivi-commande-routing", checkAuth, async (req, res) => {
  console.log("=== SUIVI COMMANDE ROUTING ===");
  console.log(JSON.stringify(req.body, null, 2));

  const callerNumber = req.body.callerNumber ?? "";
  const callerName =
    req.body.callerName ??
    req.body.name ??
    req.body.caller_name ??
    "";
  const callId = req.body.callId ?? "";

  res.json({
    routing: {
      targetType: "external",
      targetValue: SERVICE_TARGET_NUMBER,
    },
  });

  sendBarbaraServiceEmail({
    serviceName: "suivi_commande",
    callerNumber,
    callerName,
    callId,
  }).catch((e) => console.error("EMAIL ERROR:", e));

  appendServiceLogToSheet({
    sheetName: SHEET_NAME_SUIVI_COMMANDE,
    serviceName: "suivi_commande",
    callerNumber,
    callerName,
    callId,
  }).catch((e) => console.error("SHEETS ERROR:", e));
});

// =========================
// Health / tests
// =========================
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/test-sheet-commercial", async (req, res) => {
  try {
    await appendRoutingLogToSheet({
      callerNumber: "+33612345678",
      departmentCode: "41",
      reason: "TEST",
      selected: "Guillaume Nepveu",
      selectedEmail: "guillaume@rubiomonocoat.fr",
      targetValue: "+33607122212",
    });

    res.json({ ok: true, message: "Test Google Sheets commercial envoyé" });
  } catch (error) {
    console.error("TEST SHEETS ERROR:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/test-sheet-compta", async (req, res) => {
  try {
    await appendServiceLogToSheet({
      sheetName: SHEET_NAME_COMPTA,
      serviceName: "compta",
      callerNumber: "+33612345678",
      callerName: "Test Compta",
      callId: "TEST-COMPTA-001",
    });

    res.json({ ok: true, message: "Test Google Sheets compta envoyé" });
  } catch (error) {
    console.error("TEST SHEETS ERROR:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/test-sheet-suivi", async (req, res) => {
  try {
    await appendServiceLogToSheet({
      sheetName: SHEET_NAME_SUIVI_COMMANDE,
      serviceName: "suivi_commande",
      callerNumber: "+33612345678",
      callerName: "Test Suivi",
      callId: "TEST-SUIVI-001",
    });

    res.json({ ok: true, message: "Test Google Sheets suivi envoyé" });
  } catch (error) {
    console.error("TEST SHEETS ERROR:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("API running on port " + PORT);
});
