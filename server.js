const express = require("express");
const app = express();

app.use(express.json());

// ⚠️ NE PAS CHANGER
const PORT = process.env.PORT || 3000;

// ⚠️ Mets une vraie valeur sur Render
const API_BEARER_TOKEN = process.env.API_BEARER_TOKEN || "change-me";

/*
  ROUTAGE METIER
*/

const CONTACTS = {
  baptiste: {
    id: "baptiste",
    name: "Baptiste Verriele",
    targetType: "external",
    targetValue: "+33675859240",
  },
  guillaume: {
    id: "guillaume",
    name: "Guillaume Nepveu",
    targetType: "external",
    targetValue: "+33607122212",
  },
  laurent: {
    id: "laurent",
    name: "Laurent Moreau",
    targetType: "external",
    targetValue: "+33608660394",
  },
  antony: {
    id: "antony",
    name: "Antony Grasser",
    targetType: "external",
    targetValue: "+33698281840",
  },
  benjamin: {
    id: "benjamin",
    name: "Benjamin Hardial",
    targetType: "external",
    targetValue: "+33786358881",
  },
  sebastien: {
    id: "sebastien",
    name: "Sébastien",
    targetType: "external",
    targetValue: "+33621414949",
  },
};

const ROUTING = {
  // Nord / IDF
  "02": CONTACTS.baptiste, "08": CONTACTS.baptiste, "27": CONTACTS.baptiste,
  "51": CONTACTS.baptiste, "59": CONTACTS.baptiste, "60": CONTACTS.baptiste,
  "62": CONTACTS.baptiste, "75": CONTACTS.baptiste, "76": CONTACTS.baptiste,
  "77": CONTACTS.baptiste, "78": CONTACTS.baptiste, "80": CONTACTS.baptiste,
  "91": CONTACTS.baptiste, "92": CONTACTS.baptiste, "93": CONTACTS.baptiste,
  "94": CONTACTS.baptiste, "95": CONTACTS.baptiste,

  // Ouest
  "03": CONTACTS.guillaume, "14": CONTACTS.guillaume, "18": CONTACTS.guillaume,
  "22": CONTACTS.guillaume, "28": CONTACTS.guillaume, "29": CONTACTS.guillaume,
  "35": CONTACTS.guillaume, "36": CONTACTS.guillaume, "37": CONTACTS.guillaume,
  "41": CONTACTS.guillaume, "44": CONTACTS.guillaume, "45": CONTACTS.guillaume,
  "49": CONTACTS.guillaume, "50": CONTACTS.guillaume, "53": CONTACTS.guillaume,
  "56": CONTACTS.guillaume, "58": CONTACTS.guillaume, "61": CONTACTS.guillaume,
  "72": CONTACTS.guillaume, "85": CONTACTS.guillaume, "89": CONTACTS.guillaume,

  // Sud-Ouest
  "09": CONTACTS.laurent, "16": CONTACTS.laurent, "17": CONTACTS.laurent,
  "19": CONTACTS.laurent, "23": CONTACTS.laurent, "24": CONTACTS.laurent,
  "31": CONTACTS.laurent, "32": CONTACTS.laurent, "33": CONTACTS.laurent,
  "40": CONTACTS.laurent, "46": CONTACTS.laurent, "47": CONTACTS.laurent,
  "64": CONTACTS.laurent, "65": CONTACTS.laurent, "79": CONTACTS.laurent,
  "81": CONTACTS.laurent, "82": CONTACTS.laurent, "86": CONTACTS.laurent,
  "87": CONTACTS.laurent,

  // Est
  "01": CONTACTS.antony, "10": CONTACTS.antony, "21": CONTACTS.antony,
  "25": CONTACTS.antony, "39": CONTACTS.antony, "52": CONTACTS.antony,
  "54": CONTACTS.antony, "55": CONTACTS.antony, "57": CONTACTS.antony,
  "67": CONTACTS.antony, "68": CONTACTS.antony, "70": CONTACTS.antony,
  "71": CONTACTS.antony, "88": CONTACTS.antony, "90": CONTACTS.antony,

  // Sud-Est
  "04": CONTACTS.benjamin, "05": CONTACTS.benjamin, "06": CONTACTS.benjamin,
  "07": CONTACTS.benjamin, "11": CONTACTS.benjamin, "12": CONTACTS.benjamin,
  "13": CONTACTS.benjamin, "15": CONTACTS.benjamin, "20": CONTACTS.benjamin,
  "26": CONTACTS.benjamin, "30": CONTACTS.benjamin, "34": CONTACTS.benjamin,
  "38": CONTACTS.benjamin, "42": CONTACTS.benjamin, "43": CONTACTS.benjamin,
  "48": CONTACTS.benjamin, "63": CONTACTS.benjamin, "66": CONTACTS.benjamin,
  "69": CONTACTS.benjamin, "73": CONTACTS.benjamin, "74": CONTACTS.benjamin,
  "83": CONTACTS.benjamin, "84": CONTACTS.benjamin,
};

// 🔐 sécurité API
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

// 🔧 normalisation
function normalizeCode(input) {
  if (!input) return null;
  let code = String(input).replace("#", "").toUpperCase();

  if (code === "2A" || code === "2B" || code === "20") return "20";

  code = code.replace(/\D/g, "");
  if (code.length === 1) code = "0" + code;

  return code.length === 2 ? code : null;
}

// 🧠 logique
function resolveTarget(codeRaw, attemptsRaw) {
  const attempts = Number(attemptsRaw || 0);
  const code = normalizeCode(codeRaw);

  if (attempts >= 2) return CONTACTS.sebastien;
  if (!code) return CONTACTS.sebastien;
  if (code === "97" || code === "98") return CONTACTS.sebastien;

  return ROUTING[code] || CONTACTS.sebastien;
}

// 🎯 endpoint Aircall
app.post("/aircall/smart-routing", checkAuth, (req, res) => {
  const code = req.body.departmentCode;
  const attempts = req.body.attempts;

  const contact = resolveTarget(code, attempts);

  res.json({
    routing: {
      targetType: contact.targetType,
      targetValue: contact.targetValue
    }
  });
});

// health check
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log("API running on port " + PORT);
});