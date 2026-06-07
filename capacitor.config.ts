import type { CapacitorConfig } from "@capacitor/cli";

// Wraps the built web app (dist/) into native iOS + Android shells. The web build
// for Capacitor must use base "/" (the default — only the GitHub Pages build sets
// APP_BASE=/my-swimmer/), so assets resolve from the app root.
const config: CapacitorConfig = {
  appId: "com.chesler410.myswimmer",
  appName: "My Swimmer",
  webDir: "dist",
  backgroundColor: "#06243f",
  ios: { contentInset: "always" },
};

export default config;
