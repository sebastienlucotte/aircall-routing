require("dotenv").config();

console.log("ENV TEST:");
console.log("SHEET_ID =", process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "MISSING");
console.log("SERVICE_ACCOUNT_EMAIL =", process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "MISSING");
console.log(
  "PRIVATE_KEY_OK =",
  process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ? "YES" : "NO"
);

const express = require("express");
const nodemailer = require("nodemailer");
const { google } = require("googleapis");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_BEARER_TOKEN = process.env.API_BEARER_TOKEN || "change-me";

// SMTP Gmail
const SMTP_HOST = "smtp.gmail.com";
const SMTP_PORT = 465;
const SMTP_SECURE = true;
const SMTP_USER = "appel.rubiomonocoat@gmail.com";
const SMTP_PASS = process.env.SMTP_PASS;
const MAIL_FROM = "appel.rubiomonocoat@gmail.com";

// Google Sheets
const SHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY =
  process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
const SHEET_NAME = "Logs";

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
  // Nord / IDF
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

  // Ouest
  "03": CONTACTS.guillaume,
  "14": CONTACTS.guillaume,
  "18": CONTACTS.guillaume,
  "22": CONTACTS.guillaume,
  "28": CONTACTS.guillaume,
  "29": CONTACTS.guillaume,
  "35": CONTACTS.guillaume,
  "36": CONTACTS.guillaume,
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

  // Sud-Ouest
  "09": CONTACTS.laurent,
  "16": CONTACTS.laurent,
  "17": CONTACTS.laurent,
  "19": CONTACTS.laurent,
  "23": CONTACTS.laurent,
  "24": CONTACTS.laurent,
  "31": CONTACTS.laurent,
  "32": CONTACTS.laurent,
  "33": CONTACTS.laurent,
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

  // Est
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
  "70": CONTACTS.antony,
  "71": CONTACTS.antony,
  "88": CONTACTS.antony,
  "90": CONTACTS.antony,

  // Sud-Est
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
  "69": CONTACTS.benjamin,
  "73": CONTACTS.benjamin,
  "74": CONTACTS.benjamin,
  "83": CONTACTS.benjamin,
  "84": CONTACTS.benjamin,
};

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

function parseDurationSeconds(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
}

function inferTransferOutcome(durationSeconds) {
  const duration = parseDurationSeconds(durationSeconds);

  if (duration >= 60) {
    return "REPONDU";
  }

  if (duration >= 20) {
    return "MESSAGERIE_PROBABLE";
  }

  return "ECHEC_OU_REFUS";
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

async function sendSectorEmail({
  contact,
  departmentCode,
  callerNumber,
  callerName,
  callId,
}) {
  const transporter = getTransporter();

  if (!transporter) {
    console.log("EMAIL NOT SENT: SMTP non configuré.");
    return;
  }

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
    `Date : ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}`,
    ``,
    `Email automatique généré par l'API de routage Aircall.`,
  ];

  await transporter.sendMail({
    from: MAIL_FROM,
    to: contact.email,
    subject,
    text: lines.join("\n"),
  });

  console.log(`EMAIL SENT TO ${contact.email}`);
}

async function appendRoutingLogToSheet({
  departmentCode,
  rawCode,
  normalizedCode,
  attempts,
  reason,
  contact,
  callerNumber,
  callerName,
  callId,
  transferDuration,
  transferOutcome,
  payload,
}) {
  if (!SHEET_ID) {
    console.log("MISSING: GOOGLE_SHEETS_SPREADSHEET_ID");
    return;
  }

  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    console.log("MISSING: GOOGLE_SERVICE_ACCOUNT_EMAIL");
    return;
  }

  if (!GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    console.log("MISSING: GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");
    return;
  }

  const auth = new google.auth.JWT({
    email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const values = [[
    new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" }),
    callId || "",
    callerName || "",
    callerNumber || "",
    departmentCode || "",
    rawCode || "",
    normalizedCode || "",
    attempts ?? 0,
    reason || "",
    contact?.name || "",
    contact?.email || "",
    contact?.targetValue || "",
    transferDuration ?? 0,
    transferOutcome || "",
    JSON.stringify(payload || {}),
  ]];

  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A:O`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values },
    });

    console.log("GOOGLE SHEETS OK:", response.status);
    console.log("GOOGLE SHEETS UPDATED RANGE:", response.data?.updates?.updatedRange);
  } catch (error) {
    console.error("GOOGLE SHEETS ERROR MESSAGE:", error.message);
    if (error.response?.data) {
      console.error(
        "GOOGLE SHEETS ERROR DATA:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
    throw error;
  }
}

app.post("/aircall/smart-routing", checkAuth, async (req, res) => {
  const rawCode =
    req.body.departmentCode ??
    req.body.code ??
    req.body.digits ??
    req.body.department ??
    null;

  const rawAttempts =
    req.body.attempts ??
    req.body.retryCount ??
    req.body.retry_count ??
    0;

  const callerNumber =
    req.body.callerNumber ??
    req.body.from ??
    req.body.caller_number ??
    null;

  const callerName =
    req.body.callerName ??
    req.body.name ??
    req.body.caller_name ??
    null;

  const callId =
    req.body.callId ??
    req.body.call_id ??
    req.body.id ??
    null;

  const transferDuration = parseDurationSeconds(
    req.body.transferDuration ??
      req.body.transfer_duration ??
      req.body.duration ??
      req.body.call_duration ??
      req.body.transferred_call_duration ??
      0
  );

  const result = resolveTarget(rawCode, rawAttempts);
  const departmentCode = result.code || "";
  const transferOutcome = inferTransferOutcome(transferDuration);

  console.log("=== AIRCALL ROUTING REQUEST ===");
  console.log("Body reçu :", JSON.stringify(req.body, null, 2));
  console.log("rawCode :", rawCode);
  console.log("rawAttempts :", rawAttempts);
  console.log("callerNumber :", callerNumber);
  console.log("callerName :", callerName);
  console.log("callId :", callId);
  console.log("departmentCode :", departmentCode);
  console.log("normalizedCode :", result.code);
  console.log("reason :", result.reason);
  console.log("transferDuration :", transferDuration);
  console.log("transferOutcome :", transferOutcome);
  console.log(
    "target :",
    result.contact.name,
    result.contact.targetValue,
    result.contact.email
  );
  console.log("================================");

  const emailPromise = sendSectorEmail({
    contact: result.contact,
    departmentCode: departmentCode,
    callerNumber,
    callerName,
    callId,
  });

  const sheetPromise = appendRoutingLogToSheet({
    departmentCode,
    rawCode,
    normalizedCode: result.code,
    attempts: result.attempts,
    reason: result.reason,
    contact: result.contact,
    callerNumber,
    callerName,
    callId,
    transferDuration,
    transferOutcome,
    payload: req.body,
  });

  const results = await Promise.allSettled([emailPromise, sheetPromise]);

  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(i === 0 ? "EMAIL ERROR:" : "SHEETS ERROR:", r.reason);
    }
  });

  res.json({
    routing: {
      targetType: result.contact.targetType,
      targetValue: result.contact.targetValue,
    },
    meta: {
      receivedDepartmentCode: rawCode,
      receivedAttempts: rawAttempts,
      callerNumber,
      callerName,
      callId,
      departmentCode,
      normalizedCode: result.code,
      reason: result.reason,
      transferDuration,
      transferOutcome,
      selected: result.contact.name,
      selectedEmail: result.contact.email,
    },
  });
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/test-sheet", async (req, res) => {
  try {
    await appendRoutingLogToSheet({
      departmentCode: "41",
      rawCode: "41",
      normalizedCode: "41",
      attempts: 0,
      reason: "TEST",
      contact: {
        name: "Guillaume Nepveu",
        email: "guillaume@rubiomonocoat.fr",
        targetValue: "+33607122212",
      },
      callerNumber: "+33612345678",
      callerName: "Test Manuel",
      callId: "test-sheet-001",
      transferDuration: 75,
      transferOutcome: inferTransferOutcome(75),
      payload: { ok: true },
    });

    res.json({ ok: true, message: "Test Google Sheets envoyé" });
  } catch (error) {
    console.error("TEST SHEETS ERROR:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("API running on port " + PORT);
});
