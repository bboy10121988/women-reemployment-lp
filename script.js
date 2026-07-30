/* ==========================================================================
   婦女再就業自主訓練獎勵說明會
   --------------------------------------------------------------------------
   要上線前必須填的兩個設定，其餘不用動：

   ENDPOINT  報名表單要送去的網址。作法是在 Google 試算表開一個 Apps Script
             網頁應用程式（部署為「任何人都可存取」），把網址貼進來。
             留空時，表單會顯示「請改用 LINE 聯繫」而不會靜靜吃掉報名資料。

   LINE_URL  官方 LINE 帳號的加入好友連結。填了之後，報名成功畫面與備援訊息
             都會出現加 LINE 的按鈕。
   ========================================================================== */

const CONFIG = {
  ENDPOINT: '',
  LINE_URL: ''
};

/* ---------- 進場動畫（MOTION_INTENSITY 3，尊重減少動態偏好） ---------- */

(function initReveal() {
  const items = document.querySelectorAll('.reveal');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

  items.forEach((el) => io.observe(el));
})();

/* ---------- 資格自我檢核 ---------- */

(function initChecklist() {
  const form = document.getElementById('checklist');
  const box = document.getElementById('checkResult');
  const text = document.getElementById('checkResultText');
  const cta = document.getElementById('checkResultCta');
  if (!form || !box || !text || !cta) return;

  const boxes = Array.from(form.querySelectorAll('input[type="checkbox"]'));

  function render() {
    const checked = boxes.filter((b) => b.checked).length;
    const total = boxes.length;

    box.classList.remove('is-pass', 'is-partial');
    cta.hidden = true;

    if (checked === 0) {
      text.textContent = '勾選上方項目後，這裡會顯示初步判斷結果。';
      return;
    }

    if (checked === total) {
      box.classList.add('is-pass');
      text.textContent = '四項都符合，妳很可能可以申請。歡迎報名說明會，現場會協助妳填寫申請書。';
      cta.hidden = false;
      return;
    }

    box.classList.add('is-partial');
    text.textContent =
      '目前符合 ' + checked + ' 項，還有 ' + (total - checked) +
      ' 項需要確認。這不代表不能申請，說明會現場可以幫妳一起查。';
    cta.hidden = false;
  }

  boxes.forEach((b) => b.addEventListener('change', render));
  render();
})();

/* ---------- 報名表單 ---------- */

(function initSignup() {
  const form = document.getElementById('signupForm');
  const btn = document.getElementById('submitBtn');
  const status = document.getElementById('formStatus');
  if (!form || !btn || !status) return;

  const RULES = {
    name: (v) => v.trim().length >= 2,
    phone: (v) => /^09\d{8}$/.test(v.replace(/[\s-]/g, '')),
    session: (v) => v !== '',
    status: (v) => v !== ''
  };

  function showError(field, show) {
    const input = form.elements[field];
    const msg = form.querySelector('[data-error-for="' + field + '"]');
    if (input) input.classList.toggle('is-invalid', show);
    if (msg) msg.hidden = !show;
  }

  function validate() {
    let firstBad = null;
    Object.keys(RULES).forEach((field) => {
      const input = form.elements[field];
      const ok = RULES[field](input.value);
      showError(field, !ok);
      if (!ok && !firstBad) firstBad = input;
    });
    return firstBad;
  }

  Object.keys(RULES).forEach((field) => {
    const input = form.elements[field];
    if (!input) return;
    input.addEventListener('input', () => showError(field, false));
    input.addEventListener('change', () => showError(field, false));
  });

  function setStatus(kind, message) {
    status.hidden = false;
    status.className = 'form-status is-' + kind;
    status.innerHTML = message;
  }

  function lineButton() {
    if (!CONFIG.LINE_URL) return '';
    return '<br><a class="btn btn-primary btn-sm" style="margin-top:12px" href="' +
      CONFIG.LINE_URL + '" target="_blank" rel="noopener">加入官方 LINE</a>';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const bad = validate();
    if (bad) {
      bad.focus();
      setStatus('error', '有欄位還沒填好，請檢查上方標示紅色的地方。');
      return;
    }

    if (!CONFIG.ENDPOINT) {
      setStatus('error',
        '報名系統設定中，暫時無法線上送出。請直接透過官方 LINE 與我們聯繫，一樣可以完成報名。' +
        lineButton());
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());
    data.submittedAt = new Date().toISOString();
    data.source = location.href;

    btn.disabled = true;
    btn.textContent = '送出中';
    setStatus('success', '正在送出，請稍候。');

    try {
      await fetch(CONFIG.ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(data)
      });

      form.querySelectorAll('input, select, textarea').forEach((el) => { el.value = ''; });
      setStatus('success',
        '報名成功。我們會在一到兩個工作天內與妳聯繫確認場次。' + lineButton());
      btn.textContent = '已送出';
    } catch (err) {
      setStatus('error',
        '送出失敗，可能是網路不穩。請再試一次，或直接透過官方 LINE 與我們聯繫。' + lineButton());
      btn.disabled = false;
      btn.textContent = '重新送出';
    }
  });
})();
