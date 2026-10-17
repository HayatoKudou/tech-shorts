import bold from "@ibm/plex-sans-jp/fonts/complete/woff2/hinted/IBMPlexSansJP-Bold.woff2";
import medium from "@ibm/plex-sans-jp/fonts/complete/woff2/hinted/IBMPlexSansJP-Medium.woff2";
import { loadFont } from "@remotion/fonts";

// Google Fonts 経由だと日本語は約120分割で読み込まれレンダが重いので、
// npm パッケージ（OFL）の完全版 woff2 をバンドルして読む
export const FONT = "IBM Plex Sans JP";

loadFont({ family: FONT, url: bold, weight: "700" });
loadFont({ family: FONT, url: medium, weight: "500" });
