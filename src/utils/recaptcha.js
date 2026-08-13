// Public reCAPTCHA v3 site key for man-11-robotic. The matching secret key must
// stay server-side and is never referenced here.
export const RECAPTCHA_SITE_KEY =
  import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LdwNYMtAAAAAI_oIxuXABzJu5E9iqc0XcBBTrfh";

const SCRIPT_ID = "recaptcha-v3-script";

let loadPromise = null;

export function loadRecaptcha() {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (window.grecaptcha?.execute) {
      resolve(window.grecaptcha);
      return;
    }
    let script = document.getElementById(SCRIPT_ID);
    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", () => {
      window.grecaptcha.ready(() => resolve(window.grecaptcha));
    });
    script.addEventListener("error", () => {
      loadPromise = null;
      reject(new Error("Gagal memuat reCAPTCHA"));
    });
  });

  return loadPromise;
}

// Returns a reCAPTCHA v3 token for the given action, or throws.
export async function getRecaptchaToken(action) {
  const grecaptcha = await loadRecaptcha();
  return grecaptcha.execute(RECAPTCHA_SITE_KEY, { action });
}
