import type { Config } from "tailwindcss";
import { themePreset } from "./src/theme/tailwind-preset";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [themePreset as Config],
};

export default config;
