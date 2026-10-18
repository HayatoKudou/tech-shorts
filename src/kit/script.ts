// 台本の型と検証。pipeline（Node）からも読むので remotion に依存しない

/** 1拍 = ナレーション1文 = 字幕1枚 */
export type Beat = {
  /** 字幕兼読み上げ原稿。`**語**` でマーカー強調、`\n` で改行位置を指定 */
  text: string;
};

export type Script = {
  /** Composition ID 兼ディレクトリ名 */
  id: string;
  /** 投稿タイトル */
  title: string;
  /** 一次情報の URL。1つ以上必須 */
  sources: [string, ...string[]];
  beats: Beat[];
  /** public/bgm/ のファイル名。省略で既定の BGM、null で BGM なし */
  bgm?: string | null;
};

/** 字幕1枚の上限（54px で 3 行に収まる目安） */
export const MAX_BEAT_CHARS = 30;

/** マークアップを除いた、読み上げる文字列 */
export const plainText = (text: string): string =>
  text.replaceAll("**", "").replaceAll("\n", "");

export const validateScript = (script: Script): void => {
  if (!/^[a-z0-9-]+$/.test(script.id)) {
    throw new Error(`id は英小文字・数字・ハイフンのみ: ${script.id}`);
  }
  if (script.beats.length === 0) {
    throw new Error(`${script.id}: beats が空です`);
  }
  script.beats.forEach((beat, i) => {
    const chars = [...plainText(beat.text)].length;
    if (chars > MAX_BEAT_CHARS) {
      throw new Error(
        `${script.id} beat ${i}: ${chars} 文字（上限 ${MAX_BEAT_CHARS}）。文を分けてください: ${beat.text}`,
      );
    }
    if (beat.text.split("**").length % 2 === 0) {
      throw new Error(`${script.id} beat ${i}: ** が閉じていません: ${beat.text}`);
    }
  });
};
