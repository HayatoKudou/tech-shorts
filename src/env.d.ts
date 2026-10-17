// Remotion のバンドラはフォントファイルの import を URL に解決する
declare module "*.woff2" {
  const url: string;
  export default url;
}
