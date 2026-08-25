// sheet-template.js
//
// Tra ve toan bo trang HTML se duoc nhung vao iframe (Sheet) cua Intercom.
// Day la noi ban co TOAN QUYEN kiem soat CSS/JS - khong con bi gioi han
// boi cac component co san cua Canvas Kit nua.
//
// Bat buoc phai co the <script> messenger-sheet-library de trang nay
// giao tiep nguoc lai voi Messenger (dong sheet, gui du lieu ve server).

function buildSheetHtml({ waLink }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Welcome</title>

<!-- BAT BUOC: thu vien de sheet giao tiep voi Messenger (dong sheet, gui du lieu) -->
<script src="https://s3.amazonaws.com/intercom-sheets.com/messenger-sheet-library.latest.js"></script>

<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: #ffffff;
    color: #1a1a2e;
  }

  .screen { display: none; }
  .screen.active { display: block; }

  /* ---- Header teal, giong mockup ---- */
  .header {
    background: linear-gradient(180deg, #0a6ebd 0%, #0d7fd6 100%);
    color: #ffffff;
    padding: 20px 20px 28px;
  }

  .back-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: none;
    border: none;
    color: #ffffff;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    padding: 4px 0;
    margin-bottom: 16px;
    opacity: 0.9;
  }
  .back-btn:hover { opacity: 1; }
  .back-btn svg { width: 16px; height: 16px; }

  .header h1 {
    font-size: 22px;
    font-weight: 700;
    margin: 0 0 6px;
  }
  .header p {
    font-size: 15px;
    margin: 0;
    color: rgba(255, 255, 255, 0.9);
  }

  /* ---- Danh sach lua chon (Existing / New Customer) ---- */
  .card-list {
    padding: 8px 0;
  }
  .card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px 20px;
    cursor: pointer;
    border-bottom: 1px solid #f0f1f3;
    background: #ffffff;
    transition: background 0.15s ease;
  }
  .card:hover { background: #f7f9fc; }
  .card:last-child { border-bottom: none; }

  .card-icon {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
  }
  .card-icon.existing { background: #e8ecf3; color: #4a5568; }
  .card-icon.new { background: #d8f3e0; color: #1a7a3c; }

  .card-text { flex: 1; min-width: 0; }
  .card-text .title { font-weight: 600; font-size: 15px; margin: 0 0 2px; }
  .card-text .subtitle { font-size: 13px; color: #6b7280; margin: 0; }

  .chevron { color: #9ca3af; font-size: 18px; flex-shrink: 0; }

  /* ---- Man hinh WhatsApp handoff ---- */
  .whatsapp-body { padding: 24px 20px; }
  .whatsapp-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    background: #25d366;
    color: #ffffff;
    border: none;
    border-radius: 10px;
    padding: 14px 20px;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    margin-top: 8px;
  }
  .whatsapp-btn:hover { background: #1fbd5a; }
  .whatsapp-btn svg { width: 20px; height: 20px; }

  .privacy-note {
    text-align: center;
    font-size: 12px;
    color: #9ca3af;
    margin-top: 14px;
  }
</style>
</head>
<body>

  <!-- MAN HINH 1: Welcome - chon loai khach hang -->
  <!-- KHONG can nut Back o day nua - Intercom da tu dong them mui ten "<"
       o thanh header rieng cua Sheet, bam vao no da tu dong dong Sheet va
       quay ve Home, khong can tu code them. -->
  <div id="screen-welcome" class="screen active">
    <div class="header">
      <h1>Welcome! 👋</h1>
      <p>Are you an existing customer or new to us?</p>
    </div>
    <div class="card-list">
      <div class="card" id="existing-customer-card">
        <div class="card-icon existing">👤</div>
        <div class="card-text">
          <p class="title">Existing Customer</p>
          <p class="subtitle">I'm an existing customer and need support.</p>
        </div>
        <div class="chevron">›</div>
      </div>
      <div class="card" id="new-customer-card">
        <div class="card-icon new">✨</div>
        <div class="card-text">
          <p class="title">New Customer</p>
          <p class="subtitle">I'm new and would like to learn more.</p>
        </div>
        <div class="chevron">›</div>
      </div>
    </div>
  </div>

  <!-- MAN HINH 2: New Customer -> WhatsApp handoff -->
  <div id="screen-whatsapp" class="screen">
    <div class="header">
      <button class="back-btn" id="back-to-welcome-button" type="button">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Choose again
      </button>
      <h1>Great! 🎉</h1>
      <p>To help you better, our team will continue this conversation on WhatsApp.</p>
    </div>
    <div class="whatsapp-body">
      <button class="whatsapp-btn" id="whatsapp-button" type="button">
        <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.1.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.3-.4.1-.2 0-.3 0-.5s-.6-1.5-.9-2c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1.1 2.8 1.2 3c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.6.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3z"/>
          <path d="M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.6 1.4 5.1L2 22l5.1-1.3C8.6 21.5 10.3 22 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18c-1.5 0-3-.4-4.3-1.2l-.3-.2-3.2.8.9-3.1-.2-.3C4.2 14.6 3.8 13.3 3.8 12 3.8 7.5 7.5 3.8 12 3.8s8.2 3.7 8.2 8.2-3.7 8.2-8.2 8.2z"/>
        </svg>
        Continue on WhatsApp
      </button>
      <p class="privacy-note">Your information is secure and will only be used to assist you.</p>
    </div>
  </div>

<script>
  document.addEventListener("DOMContentLoaded", function () {
    var waLink = ${JSON.stringify(waLink)};

    function showScreen(id) {
      document.querySelectorAll(".screen").forEach(function (el) {
        el.classList.remove("active");
      });
      document.getElementById(id).classList.add("active");
    }

    // Nut Back o Man hinh Welcome DA BI XOA - da co mui ten "<" native cua
    // Intercom o thanh header rieng cua Sheet, tu dong dong sheet + ve Home.

    // Bam "Existing Customer" -> dong sheet, bao server hien thong bao huong dan
    document.getElementById("existing-customer-card").addEventListener("click", function () {
      INTERCOM_MESSENGER_SHEET_LIBRARY.submitSheet({ action: "existing_customer" });
    });

    // Bam "New Customer" -> chuyen sang man hinh WhatsApp NGAY TRONG SHEET
    // (khong dong sheet, chi doi noi dung hien thi bang JS thuan)
    document.getElementById("new-customer-card").addEventListener("click", function () {
      showScreen("screen-whatsapp");
    });

    // Nut Back o man hinh WhatsApp -> quay lai man hinh Welcome (van trong sheet)
    document.getElementById("back-to-welcome-button").addEventListener("click", function () {
      showScreen("screen-welcome");
    });

    // Bam "Continue on WhatsApp" -> mo WhatsApp tab moi, roi dong sheet
    document.getElementById("whatsapp-button").addEventListener("click", function () {
      window.open(waLink, "_blank");
      INTERCOM_MESSENGER_SHEET_LIBRARY.submitSheet({ action: "new_customer_whatsapp" });
    });
  });
</script>
</body>
</html>`;
}

module.exports = { buildSheetHtml };
