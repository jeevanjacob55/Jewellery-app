export const colors = {
  background: "#FCF8F8",
  surface: "#FFFFFF",
  surfaceAlt: "#F5F5F5",
  text: "#1A1A1A",
  mutedText: "#5F6161",
  accentGold: "#D4AF37",
  positive: "#15803D",
  negative: "#B91C1C",
  border: "#E5E2E1",
  shadow: "rgba(26, 26, 26, 0.05)",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 48,
};

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 20,
};

export const typography = {
  eyebrow: {
    fontSize: 12,
    fontWeight: "700" as const,
    letterSpacing: 1.5,
    textTransform: "uppercase" as const,
  },
  title: {
    fontSize: 28,
    fontWeight: "800" as const,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400" as const,
  },
  label: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
};
