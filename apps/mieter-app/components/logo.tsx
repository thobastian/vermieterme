import { View, Text, StyleSheet } from "react-native";

interface LogoProps {
  size?: number;
}

export function Logo({ size = 72 }: LogoProps) {
  const scale = size / 72;

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size * 0.19 }]}>
      {/* Roof triangle */}
      <View style={[styles.roof, {
        top: size * 0.12,
        borderLeftWidth: size * 0.38,
        borderRightWidth: size * 0.38,
        borderBottomWidth: size * 0.28,
      }]} />
      {/* House body */}
      <View style={[styles.body, {
        top: size * 0.36,
        width: size * 0.58,
        height: size * 0.42,
        borderRadius: 2 * scale,
      }]} />
      {/* Door */}
      <View style={[styles.door, {
        bottom: size * 0.22,
        width: size * 0.17,
        height: size * 0.22,
        borderRadius: 2 * scale,
      }]} />
      {/* Euro badge */}
      <View style={[styles.badge, {
        top: size * 0.08,
        right: size * 0.06,
        width: size * 0.28,
        height: size * 0.28,
        borderRadius: size * 0.14,
        borderWidth: 1.5 * scale,
      }]}>
        <Text style={[styles.badgeText, { fontSize: 14 * scale }]}>€</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#b91c1c",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  roof: {
    position: "absolute",
    width: 0,
    height: 0,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "rgba(255,255,255,0.95)",
    borderStyle: "solid",
  },
  body: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  door: {
    position: "absolute",
    backgroundColor: "#b91c1c",
    alignSelf: "center",
  },
  badge: {
    position: "absolute",
    backgroundColor: "#7f1d1d",
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "#fff",
    fontWeight: "bold",
    fontFamily: "Georgia",
  },
});
