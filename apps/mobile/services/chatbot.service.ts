// apps/mobile/services/chatbot.service.ts

export type ChatHistoryItem = { role: "user" | "model"; content: string };

export type ChatResult = {
  success: boolean;
  error?: string;
  data?: { response: string; timestamp: string };
};

/**
 * ✅ SINGLE SOURCE OF TRUTH (PORTAL SERVICES)
 * Keep this aligned with your actual DB/services list.
 */
const PORTAL_SERVICES: Array<{ name: string; feePhp: number; aliases: string[] }> = [
  { name: "Barangay Certificate", feePhp: 30, aliases: ["barangay certificate", "certificate"] },
  { name: "Barangay Clearance", feePhp: 50, aliases: ["barangay clearance", "clearance"] },
  { name: "Blotter Report", feePhp: 0, aliases: ["blotter", "blotter report", "complaint report"] },
  { name: "Business Clearance", feePhp: 100, aliases: ["business clearance"] },
  { name: "Cedula", feePhp: 50, aliases: ["cedula", "community tax certificate", "ctc"] },
];

function formatFee(feePhp: number) {
  return feePhp <= 0 ? "FREE" : `PHP ${feePhp}`;
}

function renderServicesWithFees() {
  return PORTAL_SERVICES.map((s) => `- ${s.name}: ${formatFee(s.feePhp)}`).join("\n");
}

function nowIso() {
  return new Date().toISOString();
}

const SYSTEM_PROMPT = `You are a helpful AI assistant for the Barangay Bayabas Online Service Portal in Matina, Davao City.

LANGUAGE BEHAVIOR:
- Residents may speak in English, Filipino (Tagalog), or Bisaya (Cebuano).
- Detect the language of the user automatically.
- Respond using the SAME language as the user when possible.
- If the user mixes languages, respond in the dominant language used.
- Always keep OFFICIAL SERVICE NAMES in English, such as Barangay Clearance, Barangay Certificate, Cedula, Business Clearance, and Blotter Report.
- It is acceptable to mix Bisaya/Filipino with English slightly for clarity, but keep the answer natural and easy to understand.

STYLE:
- Be friendly, respectful, and professional.
- Use natural, modern Bisaya if the user speaks Bisaya.
- Keep answers short, usually 2–3 sentences.
- If the user asks for a list (services, prices, requirements), you may use short "-" bullet points.
- Do not sound robotic.

STRICT RULES:
- Never invent services, fees, requirements, schedules, or policies.
- Only answer using the official information provided below.
- If unsure, say you are not certain and suggest visiting the Barangay Hall or using official channels.
- Do not make up legal, policy, or process details.

SCOPE:
Only answer questions about:
- Barangay services offered in this portal
- Booking appointments in the portal
- Appointment status
- Account creation/login for this portal
- Announcements/news and official helpdesk channels

If the question is unrelated, politely refuse and redirect the user to barangay services.

OFFICIAL QUICK FACTS:
- Barangay Bayabas is located in Matina, Davao City.
- Resident accounts are created through in-person registration at the Barangay Hall (staff verifies residency and creates the account).
- For login/password concerns, advise using "Forgot Password" or contacting official helpdesk channels.

PORTAL SERVICES (ONLY THESE ARE OFFERED):
${renderServicesWithFees()}

BOOKING (HOW IT WORKS IN THE APP):
To book: open the Book tab/menu → choose a service → select an available date → pick a time slot (morning/afternoon) → enter purpose/description (minimum 10 characters) → confirm booking.
After submission, users can view appointment status in the Appointments tab.
`;

const TOPIC_KEYWORDS = [
  // booking/appointments
  "appointment",
  "book",
  "booking",
  "schedule",
  "status",
  "pending",
  "approved",
  "rejected",
  "completed",
  "cancel",

  // services & fees
  "service",
  "services",
  "offer",
  "available",
  "price",
  "prices",
  "fee",
  "fees",
  "cost",
  "how much",

  // account/auth
  "account",
  "register",
  "registration",
  "login",
  "sign in",
  "password",
  "forgot password",
  "reset",

  // info/helpdesk
  "location",
  "address",
  "where is",
  "helpdesk",
  "hotline",
  "support",

  // announcements
  "announcement",
  "announcements",
  "news",

  // Filipino / Bisaya support
  "unsa",
  "pila",
  "asa",
  "diin",
  "paunsa",
  "serbisyo",
  "mga serbisyo",
  "bayad",
  "presyo",
  "gasto",
  "rehistro",
  "maghimo account",
  "register ko",
  "unsaon",
  "schedule sa appointment",
  "appointment sa barangay",
  "kalimot password",

  "ano",
  "magkano",
  "saan",
  "nasaan",
  "paano",
  "bayarin",
  "gumawa ng account",
  "nakalimutan ang password",

  // specific service keywords
  ...PORTAL_SERVICES.flatMap((s) => s.aliases),
];

function looksRelevantFast(userMessage: string) {
  const m = userMessage.toLowerCase();
  return TOPIC_KEYWORDS.some((t) => m.includes(t));
}

/**
 * ✅ Deterministic answers ONLY for high-risk drift questions
 */
function matchOfficialFAQ(message: string): string | null {
  const m = message.toLowerCase().trim();

  const asksBisaya =
    m.includes("unsa") ||
    m.includes("pila") ||
    m.includes("asa") ||
    m.includes("diin") ||
    m.includes("paunsa") ||
    m.includes("serbisyo") ||
    m.includes("bayad") ||
    m.includes("presyo") ||
    m.includes("rehistro") ||
    m.includes("kalimot password");

  const asksFilipino =
    m.includes("ano") ||
    m.includes("magkano") ||
    m.includes("saan") ||
    m.includes("nasaan") ||
    m.includes("paano") ||
    m.includes("serbisyo") ||
    m.includes("bayarin") ||
    m.includes("nakalimutan ang password");

  // Location
  if (
    m.includes("where is") ||
    m.includes("location") ||
    m.includes("address") ||
    m.includes("located") ||
    m.includes("asa") ||
    m.includes("diin") ||
    m.includes("saan") ||
    m.includes("nasaan")
  ) {
    if (asksBisaya) {
      return "Ang Barangay Bayabas kay naa sa Matina, Davao City. Pwede ka mubisita sa Barangay Hall sa Bayabas during office hours.";
    }
    if (asksFilipino) {
      return "Ang Barangay Bayabas ay matatagpuan sa Matina, Davao City. Maaari kang bumisita sa Barangay Hall ng Bayabas sa oras ng opisina.";
    }
    return "Barangay Bayabas is located in Matina, Davao City. You may visit the Barangay Hall of Bayabas during office hours.";
  }

  // Services offered
  const asksServices =
    m.includes("services you offer") ||
    m.includes("services do you offer") ||
    m.includes("what services") ||
    m.includes("available services") ||
    (m.includes("services") && m.includes("offer")) ||
    (m.includes("services") && m.includes("available")) ||
    m.includes("unsa nga serbisyo") ||
    m.includes("unsa na serbisyo") ||
    m.includes("mga serbisyo") ||
    m.includes("anong serbisyo") ||
    m.includes("ano ang serbisyo") ||
    m.includes("serbisyong available");

  if (asksServices) {
    if (asksBisaya) {
      return `Mao ni ang mga serbisyo nga available sa portal:\n${renderServicesWithFees()}`;
    }
    if (asksFilipino) {
      return `Narito ang mga serbisyong available sa portal:\n${renderServicesWithFees()}`;
    }
    return `Here are the services available in the portal:\n${renderServicesWithFees()}`;
  }

  // All prices/fees
  const asksAllFees =
    m.includes("all the services price") ||
    m.includes("all services price") ||
    m.includes("all service price") ||
    m.includes("all the prices") ||
    m.includes("all fees") ||
    m.includes("service fees") ||
    m.includes("services fee") ||
    (m.includes("price") && m.includes("services")) ||
    (m.includes("fees") && m.includes("services")) ||
    m.includes("how much are the services") ||
    m.includes("pila ang bayad") ||
    m.includes("mga bayad") ||
    m.includes("presyo sa serbisyo") ||
    m.includes("magkano ang mga serbisyo") ||
    m.includes("mga bayarin");

  if (asksAllFees) {
    if (asksBisaya) {
      return `Mao ni ang current nga bayad sa mga serbisyo:\n${renderServicesWithFees()}`;
    }
    if (asksFilipino) {
      return `Narito ang kasalukuyang bayad sa mga serbisyo:\n${renderServicesWithFees()}`;
    }
    return `Here are the current service fees:\n${renderServicesWithFees()}`;
  }

  // Booking steps
  if (
    m.includes("how to book") ||
    m.includes("book an appointment") ||
    m.includes("book appointment") ||
    m.includes("set an appointment") ||
    m.includes("schedule an appointment") ||
    (m.includes("appointment") && m.includes("book")) ||
    m.includes("paunsa mag book") ||
    m.includes("unsaon pag book") ||
    m.includes("paano mag-book") ||
    m.includes("paano mag book")
  ) {
    if (asksBisaya) {
      return "Para maka-book ug appointment, ablihi ang Book tab, pili ug service, pili ug available date, pili ug time slot (morning o afternoon), ibutang ang purpose o description nga minimum 10 characters, dayon i-confirm. Makita nimo ang status sa Appointments tab after submission.";
    }
    if (asksFilipino) {
      return "Para makapag-book ng appointment, buksan ang Book tab, pumili ng service, pumili ng available na petsa, pumili ng time slot (morning o afternoon), ilagay ang purpose o description na minimum 10 characters, at i-confirm. Makikita mo ang status sa Appointments tab pagkatapos ng submission.";
    }
    return "To book an appointment, open the Book tab, choose a service, select an available date, pick a time slot (morning or afternoon), enter your purpose/description (min. 10 characters), then confirm. You can check the status in the Appointments tab after submission.";
  }

  // Account creation
  if (
    m.includes("create account") ||
    m.includes("how to register") ||
    m.includes("sign up") ||
    (m.includes("account") && m.includes("resident")) ||
    m.includes("unsaon pag rehistro") ||
    m.includes("paunsa mag register") ||
    m.includes("paano mag-register") ||
    m.includes("gumawa ng account")
  ) {
    if (asksBisaya) {
      return "Ang resident accounts gihimo pinaagi sa in-person registration sa Barangay Hall. Palihug pagdala ug valid government ID o proof of residency kay i-verify sa staff ang imong details ug sila ang muhimo sa account.";
    }
    if (asksFilipino) {
      return "Ang resident accounts ay ginagawa sa pamamagitan ng in-person registration sa Barangay Hall. Mangyaring magdala ng valid government ID o proof of residency dahil ibe-verify ng staff ang iyong detalye at sila ang gagawa ng account.";
    }
    return "Resident accounts are created through in-person registration at the Barangay Hall. Please bring a valid government ID or proof of residency; staff will verify your details and create your account.";
  }

  // Login/password
  if (
    m.includes("can't login") ||
    m.includes("cannot login") ||
    m.includes("login") ||
    m.includes("sign in") ||
    m.includes("forgot password") ||
    m.includes("reset password") ||
    m.includes("kalimot password") ||
    m.includes("nakalimutan ang password")
  ) {
    if (asksBisaya) {
      return 'Gamita ang email nga imong gi-provide during registration para maka-login. Kung kinahanglan, i-tap ang "Forgot Password" para ma-reset ang password pinaagi sa link nga ipadala sa imong email.';
    }
    if (asksFilipino) {
      return 'Gamitin ang email na ibinigay mo noong registration para makapag-login. Kung kailangan, i-tap ang "Forgot Password" para ma-reset ang password gamit ang link na ipapadala sa iyong email.';
    }
    return 'Use the email you provided during registration to sign in. If needed, tap "Forgot Password" to reset your password via the link sent to your email.';
  }

  return null;
}

async function geminiGenerateText(inputText: string): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing EXPO_PUBLIC_GEMINI_API_KEY");

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent` +
    `?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: inputText }] }],
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Gemini error ${res.status}: ${t || "Request failed"}`);
  }

  const json: any = await res.json();
  const text =
    json?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p?.text)
      .filter(Boolean)
      .join("") ?? "";

  return String(text).trim();
}

export async function getChatbotGreetingMobile(): Promise<ChatResult> {
  return {
    success: true,
    data: {
      response:
        "Maayong adlaw! Welcome to the Barangay Bayabas Online Service Portal. Unsa may akong matabang nimo bahin sa serbisyo sa barangay?",
      timestamp: nowIso(),
    },
  };
}

export async function sendChatMessageMobile(
  userMessage: string,
  conversationHistory: ChatHistoryItem[] = []
): Promise<ChatResult> {
  try {
    const msg = userMessage.trim();
    if (!msg) return { success: false, error: "Message cannot be empty" };

    // ✅ 1) Deterministic where it matters
    const faq = matchOfficialFAQ(msg);
    if (faq) {
      return { success: true, data: { response: faq, timestamp: nowIso() } };
    }

    // ✅ 2) Fast reject for unrelated topics
    if (!looksRelevantFast(msg)) {
      return {
        success: true,
        data: {
          response:
            "I can assist with barangay services, appointments, and announcements. Kung naa kay pangutana bahin sa serbisyo sa barangay, tabangan tika.",
          timestamp: nowIso(),
        },
      };
    }

    // ✅ 3) Gemini with strict grounding to PORTAL_SERVICES
    const historyText = conversationHistory
      .slice(-6)
      .map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${h.content}`)
      .join("\n");

    const prompt = [
      SYSTEM_PROMPT,
      historyText ? `\n\nConversation so far:\n${historyText}` : "",
      `\n\nUser: ${msg}\nAssistant:`,
    ].join("");

    let text = await geminiGenerateText(prompt);
    if (!text) return { success: false, error: "Failed to generate response" };

    // Small safety: prefer "-" bullets if Gemini uses "*"
    text = text.replace(/^\*\s+/gm, "- ");

    return { success: true, data: { response: text, timestamp: nowIso() } };
  } catch (e: any) {
    return { success: false, error: e?.message ?? "Failed to get response" };
  }
}