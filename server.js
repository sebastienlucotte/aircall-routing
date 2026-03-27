const express = require("express");
const nodemailer = require("nodemailer");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_BEARER_TOKEN = process.env.API_BEARER_TOKEN || "change-me";

// SMTP Gmail
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_SECURE = String(process.env.SMTP_SECURE || "true").toLowerCase() === "true";
const SMTP_USER = process.env.SMTP_USER || "appel.rubiomonocoat@gmail.com";
const SMTP_PASS = process.env.SMTP_PASS || "Rubio1906!@";
const MAIL_FROM = process.env.MAIL_FROM || "appel.rubiomonocoat@gmail.com";

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
  if (input == null) return null;

  let code = String(input).trim().toUpperCase();
  code = code.replace(/#/g, "");

  if (code === "2A" || code === "2B" || code === "20") {
    return "20";
  }

  code = code.replace(/\D/g, "");

  if (code.length === 1) {
    code = "0" + code;
  }

  return code.length === 2 ? code : null;
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

async function sendSectorEmail({ contact, departmentCode, callerNumber, callerName, callId }) {
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

  const result = resolveTarget(rawCode, rawAttempts);

  console.log("=== AIRCALL ROUTING REQUEST ===");
  console.log("Body reçu :", JSON.stringify(req.body, null, 2));
  console.log("rawCode :", rawCode);
  console.log("rawAttempts :", rawAttempts);
  console.log("callerNumber :", callerNumber);
  console.log("callerName :", callerName);
  console.log("callId :", callId);
  console.log("normalizedCode :", result.code);
  console.log("reason :", result.reason);
  console.log("target :", result.contact.name, result.contact.targetValue, result.contact.email);
  console.log("================================");

  try {
    await sendSectorEmail({
      contact: result.contact,
      departmentCode: result.code,
      callerNumber,
      callerName,
      callId,
    });
  } catch (error) {
    console.error("EMAIL ERROR:", error);
  }

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
      normalizedCode: result.code,
      reason: result.reason,
      selected: result.contact.name,
      selectedEmail: result.contact.email,
    },
  });
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("API running on port " + PORT);
});
