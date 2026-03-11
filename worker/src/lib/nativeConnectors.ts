export function resolveNativeConnectorForPlatform(platform: string) {
  switch (platform) {
    case "linkedin":
      return "native-linkedin";
    case "medium":
      return "native-medium";
    case "x":
      return "native-x";
    case "instagram":
      return "native-instagram";
    case "youtube":
      return "native-youtube";
    case "facebook":
      return "native-facebook";
    case "threads":
      return "native-threads";
    case "tiktok":
      return "native-tiktok";
    case "pinterest":
      return "native-pinterest";
    default:
      return "native-generic";
  }
}
