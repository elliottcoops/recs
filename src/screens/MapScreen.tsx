import { Animated, StyleSheet } from "react-native";
import { ReactNode } from "react";

type Props = { active: boolean; opacity: Animated.Value; children: ReactNode };

export function MapScreen({ active, opacity, children }: Props) {
  if (!active) return null;
  return <Animated.View style={[StyleSheet.absoluteFill, { opacity }]}>{children}</Animated.View>;
}
