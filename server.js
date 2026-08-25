/**
 * Intercom Canvas Kit App (KIEN TRUC SHEETS) - "Choose customer type -> WhatsApp handoff"
 *
 * Khac voi ban truoc (dung Content Components co san: text/list/button), ban
 * nay dung SHEETS - mo mot iframe voi trang HTML/CSS/JS TU CODE HOAN TOAN,
 * cho phep khop 100% voi thiet ke (mau nen teal, icon avatar, chevron...).
 *
 * Luong hoat dong:
 *
 *  Man hinh 1 (/initialize - hien ngay khi Home mo, VAN dung Content Component
 *  don gian vi day chi la 1 dong "Send us a message" tren Home, khong can
 *  custom nhieu):
 *    "Hi there wave / How can we help? / [Send us a message]"
 *    Nut nay co action type "sheet" (KHONG phai "submit") -> mo iframe.
 *
 *  /sheet (duoc goi khi khach bam nut o Man hinh 1):
 *    Tra ve 1 trang HTML day du (sheet-template.js), chua toan bo:
 *      - Man hinh Welcome (chon Existing/New Customer) - style teal khop mockup
 *      - Man hinh WhatsApp handoff - chuyen doi bang JS thuan, khong reload
 *    Trang nay dung thu vien messenger-sheet-library de "noi chuyen" nguoc
 *    lai voi Messenger (dong sheet + gui du lieu ve server qua submitSheet()).
 *
 *  /submit-sheet (duoc goi khi trang HTML trong sheet goi submitSheet()):
 *    - action "back"                 -> dong sheet, tra ve Man hinh 1 (Hi there)
 *    - action "existing_customer"    -> dong sheet, hien thong bao huong dan
 *    - action "new_customer_whatsapp"-> dong sheet, hien thong bao cam on
 *      (WhatsApp da duoc mo o tab moi tu truoc do, ngay trong file HTML)
 *
 *  /submit (webhook bat buoc phai co theo tai lieu Intercom, dung cho cac
 *  submit action THONG THUONG - o app nay khong dung toi nhung van phai
 *  ton tai va tra loi hop le).
 *
 * Tai lieu tham khao (da doc full truoc khi code):
 *  - Build an App using Sheets:
 *    https://developers.intercom.com/docs/build-an-integration/getting-started/build-an-app-for-your-messenger/sheets-app
 *  - Sheets flow request/response:
 *    https://developers.intercom.com/docs/build-an-integration/getting-started/build-an-app-for-your-messenger/sheets-flow
 *  - Signed requests (cho /initialize, /submit):
 *    https://developers.intercom.com/docs/canvas-kit#signing-notifications
 */

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const crypto = require("crypto");
const { buildSheetHtml } = require("./sheet-template");

const app = express();

// ---- Headers bat buoc de sheet (iframe) hoat dong dung -------------------
app.use(function (req, res, next) {
  res.setHeader(
    "Content-Security-Policy",
    "frame-src 'self' https://intercom-sheets.com"
  );
  res.setHeader("X-Requested-With", "XMLHttpRequest");
  next();
});
app.use(cors());

app.use(
  bodyParser.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(bodyParser.urlencoded({ extended: true }));

// ---- Cau hinh: doi cac gia tri nay theo doanh nghiep cua ban --------------
const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || "84901234567";
const WHATSAPP_PREFILL_TEXT =
  process.env.WHATSAPP_PREFILL_TEXT ||
  "Hi, I'm a new customer and would like to know more about your services.";
const INTERCOM_CLIENT_SECRET = process.env.INTERCOM_CLIENT_SECRET || "";

function buildWhatsAppUrl() {
  const encodedText = encodeURIComponent(WHATSAPP_PREFILL_TEXT);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedText}`;
}

function getBaseUrl(req) {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/$/, "");
  }
  const protocol = req.hostname === "localhost" ? "http" : "https";
  return `${protocol}://${req.get("host")}`;
}

function verifyIntercomSignature(req) {
  if (!INTERCOM_CLIENT_SECRET) return true;
  const signature = req.get("X-Body-Signature");
  if (!signature || !req.rawBody) return false;
  const expected = crypto
    .createHmac("sha256", INTERCOM_CLIENT_SECRET)
    .update(req.rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}

function requireValidIntercomSignature(req, res, next) {
  if (!verifyIntercomSignature(req)) {
    return res.status(401).json({ error: "Invalid X-Body-Signature" });
  }
  next();
}

function decodeIntercomUser(encodedUser) {
  const masterkey = INTERCOM_CLIENT_SECRET;
  const bData = Buffer.from(encodedUser, "base64");
  const ivlen = 12;
  const iv = bData.subarray(0, ivlen);
  const taglen = 16;
  const tag = bData.subarray(bData.length - taglen, bData.length);
  const cipherLen = bData.length - taglen;
  const cipherText = bData.subarray(ivlen, cipherLen);

  const hash = crypto.createHash("sha256").update(masterkey);
  const key = Buffer.from(hash.digest("binary"), "binary");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(cipherText, "binary", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

function greetingCanvas(req) {
  return {
    canvas: {
      content: {
        components: [startListComponent(req)],
      },
    },
  };
}

const INTERCOM_ACCESS_TOKEN = process.env.INTERCOM_ACCESS_TOKEN || "";

// Goi Intercom REST API de tao 1 conversation THAT, gan voi dung contact
// dang tuong tac (se hien trong Inbox, teammate co the tra loi/assign).
// Tai lieu: https://developers.intercom.com/docs/references/rest-api/api.intercom.io/conversations/createconversation
//
// Neu KHONG cau hinh INTERCOM_ACCESS_TOKEN, hoac API tra ve loi (vi du app
// chua duoc cap quyen "Conversations"), ham nay tra ve false va noi goi se
// tu dong fallback sang thong bao don gian - KHONG lam app bi crash/loi.
async function createRealConversation(req) {
  if (!INTERCOM_ACCESS_TOKEN) {
    console.log("[createRealConversation] Bo qua: chua co INTERCOM_ACCESS_TOKEN");
    return false;
  }

  // Log toan bo de xem chinh xac Intercom gui field nao that su.
  console.log(
    "[createRealConversation] req.body.customer:",
    JSON.stringify(req.body?.customer)
  );
  console.log(
    "[createRealConversation] req.body.contact:",
    JSON.stringify(req.body?.contact)
  );

  // Uu tien "customer" (thuong la user/lead thuc su co the nhan tin nhan),
  // fallback sang "contact" neu "customer" khong co hoac thieu field.
  const source =
    req.body?.customer?.id && req.body?.customer?.type
      ? req.body.customer
      : req.body?.contact?.id && req.body?.contact?.type
      ? req.body.contact
      : null;

  if (!source) {
    console.warn(
      "[createRealConversation] Khong tim thay customer/contact hop le trong request - bo qua tao conversation."
    );
    return false;
  }

  // Theo tai lieu chinh thuc cua Intercom, truong "from.type" cua API
  // /conversations CHI chap nhan "user" hoac "contact" - khong co "visitor"
  // hay "lead". Voi khach da dinh danh (user_id that), dung "user"; con lai
  // (visitor an danh, lead...) dung "contact" kem dung id cua ho.
  // Xem: "You can also send a message from a visitor by specifying their
  // user_id or id value in the from field, along with a type field value
  // of contact." - developers.intercom.com/docs/references/2.2/rest-api/conversations/create-a-conversation
  const fromType = source.type === "user" ? "user" : "contact";

  try {
    const response = await fetch("https://api.intercom.io/conversations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${INTERCOM_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "Intercom-Version": "2.11",
      },
      body: JSON.stringify({
        from: { type: fromType, id: source.id },
        body: "I'm an existing customer and need support.",
      }),
    });

    const responseText = await response.text();
    console.log(
      "[createRealConversation] Intercom API response:",
      response.status,
      responseText
    );

    if (!response.ok) {
      return false;
    }

    return true;
  } catch (err) {
    console.error("[createRealConversation] Loi khi goi API:", err);
    return false;
  }
}

// Component "Send us a message" dung chung, de nguoi dung luon co the bam
// lai tu dau ngay ca sau khi da xem xong thong bao ket qua.
function startListComponent(req) {
  const sheetUrl = `${getBaseUrl(req)}/sheet`;
  return {
    type: "list",
    id: "start_list",
    items: [
      {
        type: "item",
        id: "start",
        title: "Send us a message",
        subtitle: "We typically reply in under 5 minutes",
        action: { type: "sheet", url: sheetUrl },
      },
    ],
  };
}

async function afterSheetCanvas(action, req) {
  if (action === "existing_customer") {
    const created = await createRealConversation(req);

    return {
      canvas: {
        content: {
          components: [
            {
              type: "text",
              id: "existing_text",
              text: created
                ? "Thanks! \ud83d\ude4c We've started a conversation for you \u2014 check the Messages tab, our team will reply shortly."
                : "Thanks! \ud83d\ude4c Our support team is ready to help \u2014 please type your question below and we'll take it from there.",
              align: "left",
              style: "header",
            },
            { type: "spacer", size: "m" },
            startListComponent(req),
          ],
        },
      },
    };
  }

  if (action === "new_customer_whatsapp") {
    return {
      canvas: {
        content: {
          components: [
            {
              type: "text",
              id: "whatsapp_done_text",
              text: "We've opened WhatsApp for you in a new tab. See you there! \ud83d\udc4b",
              align: "left",
              style: "header",
            },
            { type: "spacer", size: "m" },
            startListComponent(req),
          ],
        },
      },
    };
  }

  return null;
}

app.post("/initialize", requireValidIntercomSignature, (req, res) => {
  res.json(greetingCanvas(req));
});

app.post("/submit", requireValidIntercomSignature, (req, res) => {
  res.json({ canvas: req.body.current_canvas });
});

app.post("/sheet", (req, res) => {
  try {
    if (INTERCOM_CLIENT_SECRET && req.body && req.body.intercom_data) {
      const parsed = JSON.parse(req.body.intercom_data);
      if (parsed.user) {
        decodeIntercomUser(parsed.user);
      }
    }
  } catch (err) {
    console.warn("Khong giai ma duoc intercom_data.user (bo qua, khong chan request):", err.message);
  }

  const waLink = buildWhatsAppUrl();
  const html = buildSheetHtml({ waLink });
  res.type("html").send(html);
});

app.post("/submit-sheet", async (req, res) => {
  try {
    console.log("[/submit-sheet] raw body:", JSON.stringify(req.body));

    // sheet_values thuong la 1 object da duoc parse san (theo tai lieu chinh
    // thuc), nhung de an toan, ho tro luon truong hop no den duoi dang
    // CHUOI JSON (vi du neu Content-Type khac mong doi).
    let sheetValues = req.body?.sheet_values;
    if (typeof sheetValues === "string") {
      try {
        sheetValues = JSON.parse(sheetValues);
      } catch {
        sheetValues = {};
      }
    }

    const action = sheetValues?.action;
    console.log("[/submit-sheet] action nhan duoc:", action);

    if (action === "back") {
      return res.status(200).json(greetingCanvas(req));
    }

    const canvas = await afterSheetCanvas(action, req);
    if (canvas) {
      return res.status(200).json(canvas);
    }

    return res.status(200).json(greetingCanvas(req));
  } catch (err) {
    // Du co loi gi xay ra, VAN tra ve 1 canvas hop le (status 200) thay vi
    // de server crash / tra ve trang loi HTML mac dinh cua Express - day la
    // nguyen nhan pho bien nhat gay ra "third_party_request_error" ben phia
    // Intercom.
    console.error("[/submit-sheet] Loi khong mong muon:", err);
    return res.status(200).json(greetingCanvas(req));
  }
});

app.get("/", (req, res) => {
  res.type("text/plain").send("Intercom Canvas Kit app is running.");
});

// ---- Global error handler ---------------------------------------------
// Bat toan bo loi chua duoc xu ly (vi du: body-parser gap JSON khong hop
// le). Neu khong co handler nay, Express se tra ve trang loi HTML mac dinh
// - Intercom se bao "third_party_request_error" vi no can nhan JSON.
app.use((err, req, res, next) => {
  console.error("[Global error handler]", err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(200).json(greetingCanvas(req));
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Canvas Kit app dang chay tai http://localhost:${PORT}`);
    if (!INTERCOM_CLIENT_SECRET) {
      console.log(
        "WARNING: INTERCOM_CLIENT_SECRET chua duoc set - dang bo qua xac thuc chu ky (chi nen dung khi dev local)."
      );
    }
  });
}

module.exports = app;
