import type { Script } from "../../src/kit/script";

export const script: Script = {
  id: "two-step-verification",
  title: "二段階認証の6桁が、通信なしで合う理由",
  sources: [
    // TOTP。T = floor((Unix 時刻 - T0) / X)、X は 30 秒を推奨。証明側と検証側が同じ秘密を共有し、鍵は利用者ごとに固有
    "https://www.rfc-editor.org/rfc/rfc6238",
    // HOTP。HMAC-SHA-1(K, C) から 31 ビットの数を取り出し、10^Digit で割った余り（= 下 Digit 桁）。Digit は 6 以上
    "https://www.rfc-editor.org/rfc/rfc4226",
    // 設定用 QR の中身は otpauth://totp/...?secret=<Base32 の鍵>。digits の既定は 6、period の既定は 30
    "https://github.com/google/google-authenticator/wiki/Key-Uri-Format",
    // Google 認証システムは、インターネット接続やモバイル サービスがなくてもコードを生成できる
    "https://support.google.com/accounts/answer/1066447?hl=ja",
    // 多要素認証の要素: 知っているもの（パスワード）/ 持っているもの（スマホ）/ 本人自身に関するもの（指紋など）
    "https://www.soumu.go.jp/main_sosiki/cybersecurity/kokumin/security/end_user/general/01/",
    // SP 800-63B-4 3.2.5: 出力を手で入力する OTP は、認証中のセッションに結び付かないためフィッシング耐性なし
    "https://pages.nist.gov/800-63-4/sp800-63b.html",
  ],
  beats: [
    { text: "二段階認証のアプリは、**電波がなくても**数字を出せます。" },
    { text: "なのに、サーバー側の答えとぴったり合います。" },
    { text: "仕掛けは、最初に読み込んだ**QRコード**です。" },
    { text: "サーバーが作った**秘密の鍵**が、あの中に入っています。" },
    { text: "スマホは、この鍵と**今の時刻**から計算します。" },
    { text: "時刻は、**30秒ごと**に1つ進む番号にして使います。" },
    { text: "鍵と番号を混ぜて大きな数を作り、その**下6桁**を出します。" },
    { text: "サーバーも同じ鍵と時刻で、同じ計算をします。" },
    { text: "材料が同じだから、通信しなくても**答えが合う**のです。" },
    { text: "鍵がなければ、この6桁は作れません。" },
    { text: "パスワードは知っているもの、スマホは**持っているもの**。" },
    { text: "片方を盗まれただけでは、ログインできません。" },
    { text: "ただし、6桁は**入力先が本物か**を知りません。" },
    { text: "**偽サイト**に入れた6桁は、犯人がすぐ本物で使えます。" },
    { text: "だから、入力先が本物かを確かめるのは**あなた**です。" },
  ],
};
