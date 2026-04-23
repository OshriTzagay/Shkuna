import { forwardRef, useState } from "react";
import {
  TextInput,
  type TextInputProps,
  View,
  Text,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { radius } from "@/constants/colors";

interface InputProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string | null;
  icon?: keyof typeof Ionicons.glyphMap;
  emoji?: string;
  rtl?: boolean;
  containerStyle?: ViewStyle;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    hint,
    error,
    icon,
    emoji,
    rtl = true,
    containerStyle,
    onFocus,
    onBlur,
    style,
    ...rest
  },
  ref
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? colors.error
    : focused
    ? colors.primary
    : colors.border;

  return (
    <View style={containerStyle}>
      {label && (
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 13,
            fontWeight: "600",
            textAlign: rtl ? "right" : "left",
            marginBottom: 8,
          }}
        >
          {label}
        </Text>
      )}
      <View
        style={{
          flexDirection: rtl ? "row-reverse" : "row",
          alignItems: "center",
          height: 54,
          borderRadius: radius.lg,
          borderWidth: 1.5,
          borderColor,
          backgroundColor: colors.bgSurface,
          paddingHorizontal: 14,
        }}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={focused ? colors.primary : colors.textMuted}
            style={{ marginRight: rtl ? 0 : 8, marginLeft: rtl ? 8 : 0 }}
          />
        )}
        {emoji && (
          <Text style={{ fontSize: 18, marginRight: rtl ? 0 : 8, marginLeft: rtl ? 8 : 0 }}>
            {emoji}
          </Text>
        )}
        <TextInput
          ref={ref}
          {...rest}
          placeholderTextColor={colors.textMuted}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            {
              flex: 1,
              fontSize: 16,
              color: colors.textPrimary,
              textAlign: rtl ? "right" : "left",
              padding: 0,
            },
            style,
          ]}
        />
      </View>
      {(hint || error) && (
        <Text
          style={{
            color: error ? colors.error : colors.textMuted,
            fontSize: 12,
            textAlign: rtl ? "right" : "left",
            marginTop: 6,
          }}
        >
          {error ?? hint}
        </Text>
      )}
    </View>
  );
});
