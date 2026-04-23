import { View, type ViewProps, type ViewStyle } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { radius, shadow } from "@/constants/colors";

interface CardProps extends ViewProps {
  variant?: "default" | "surface" | "elevated" | "outline" | "tinted";
  padding?: number;
  rounded?: keyof typeof radius;
  glow?: boolean;
}

/**
 * Base card surface that adapts to the active theme. Variants:
 *  - `default`  : standard card background
 *  - `surface`  : flatter surface tone (chips, inputs)
 *  - `elevated` : default + drop-shadow
 *  - `outline`  : transparent with strong border
 *  - `tinted`   : faint primary tint (callouts)
 */
export function Card({
  variant = "default",
  padding = 16,
  rounded = "2xl",
  glow,
  style,
  children,
  ...rest
}: CardProps) {
  const { colors } = useTheme();

  const palette: Record<NonNullable<CardProps["variant"]>, ViewStyle> = {
    default: {
      backgroundColor: colors.bgCard,
      borderColor: colors.border,
      borderWidth: 1,
    },
    surface: {
      backgroundColor: colors.bgSurface,
      borderColor: colors.border,
      borderWidth: 1,
    },
    elevated: {
      backgroundColor: colors.bgCard,
      borderColor: colors.border,
      borderWidth: 1,
      ...shadow.card,
    },
    outline: {
      backgroundColor: "transparent",
      borderColor: colors.borderStrong,
      borderWidth: 1.5,
    },
    tinted: {
      backgroundColor: colors.primaryDim,
      borderColor: colors.primaryMuted,
      borderWidth: 1,
    },
  };

  return (
    <View
      style={[
        { borderRadius: radius[rounded], padding },
        palette[variant],
        glow && {
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.25,
          shadowRadius: 18,
          elevation: 8,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
