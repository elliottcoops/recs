import { Animated, StyleSheet } from "react-native";
import { ReactNode } from "react";

type Props = { active: boolean; opacity: Animated.Value; children: ReactNode };

export function SavedScreen({ active, opacity, children }: Props) {
  if (!active) return null;
  return <Animated.View style={[StyleSheet.absoluteFillObject, { opacity, backgroundColor: "white" }]}>{children}</Animated.View>;
}
