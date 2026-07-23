import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.orosi.mobile",
  appName: "Orosi",
  webDir: "dist",
  server: { androidScheme: "https" },
  plugins: {
    CapacitorSQLite: {
      iosDatabaseLocation: "Library/CapacitorDatabase",
      iosIsEncryption: true,
      iosKeychainPrefix: "app.orosi.mobile",
      iosBiometric: {
        biometricAuth: false,
        biometricTitle: "Unlock Orosi",
      },
      androidIsEncryption: true,
      androidBiometric: {
        biometricAuth: false,
        biometricTitle: "Unlock Orosi",
        biometricSubTitle: "Use this device's secure storage.",
      },
    },
  },
};

export default config;
