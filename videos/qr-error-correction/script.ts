import type { Script } from "../../src/kit/script";

export const script: Script = {
  id: "qr-error-correction",
  title: "QRコードが汚れても読める理由",
  sources: [
    // 誤り訂正レベル L/M/Q/H = 約7/15/25/30%（全コードワードに対する復元率）、リード・ソロモン符号
    "https://www.qrcode.com/about/error_correction.html",
  ],
  beats: [
    { text: "QRコードは、**少し汚れていても**読めます。" },
    { text: "中に**誤り訂正**のための情報も入っているからです。" },
    { text: "いちばん強いレベルHなら、**約30%**が欠けても元に戻せます。" },
  ],
};
