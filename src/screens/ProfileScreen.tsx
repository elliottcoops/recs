import { Animated, StyleSheet } from "react-native";
import { ReactNode } from "react";
import { useTheme } from "../theme";

type Props = { active: boolean; opacity: Animated.Value; children: ReactNode };

export function ProfileScreen({ active, opacity, children }: Props) {
  const { colors } = useTheme();
  if (!active) return null;
  return <Animated.View style={[StyleSheet.absoluteFill, { opacity, backgroundColor: colors.background }]}>{children}</Animated.View>;
}
