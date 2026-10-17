// `remotion studio` / `remotion render` の CLI にだけ効く設定
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setCodec("h264");
Config.setCrf(18);
// 既定だと JPEG 由来のフルレンジ（yuvj420p）になり、再生環境で色がずれることがある
Config.setColorSpace("bt709");
