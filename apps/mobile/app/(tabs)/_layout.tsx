import { useEffect } from "react";
import { View, Text, ActivityIndicator, Pressable } from "react-native";
import { Tabs, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  interpolateColor,
} from "react-native-reanimated";
import { useAuthStore } from "@/store/auth";
import { useTheme } from "@/hooks/useTheme";

export default function TabsLayout() {
  const { session, loading } = useAuthStore();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.bg,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/welcome" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
      }}
      tabBar={(props) => <ShkunaTabBar {...props} />}
    >
      <Tabs.Screen name="home"    options={{ title: "בית" }} />
      <Tabs.Screen name="my-team" options={{ title: "הקבוצות" }} />
      <Tabs.Screen name="profile" options={{ title: "פרופיל" }} />
    </Tabs>
  );
}

// ─────────────────────────────────────────────────────────────
// ShkunaTabBar – modern pill tab bar
// ─────────────────────────────────────────────────────────────
//   ┌──────────────────────────────────┐
//   │  ⌂  בית   👥 הקבוצות   👤 פרופיל │   ← inactive: icon-only
//   └──────────────────────────────────┘     active:   pill w/ label
//
// Active tab gets a primary-tinted pill background that animates
// the icon → icon+label sliding in. RTL-safe: layouts auto-flip.
// All animations run on the UI thread via Reanimated worklets.
// ─────────────────────────────────────────────────────────────

const ICONS: Record<
  string,
  { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }
> = {
  home: { active: "home", inactive: "home-outline" },
  "my-team": { active: "shield", inactive: "shield-outline" },
  profile: { active: "person", inactive: "person-outline" },
};

function ShkunaTabBar({ state, descriptors, navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        backgroundColor: colors.tabBar,
        borderTopWidth: 1,
        borderTopColor: colors.tabBorder,
        paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
        paddingTop: 10,
        paddingHorizontal: 12,
        flexDirection: "row-reverse",
        alignItems: "center",
        justifyContent: "space-around",
        gap: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 18,
      }}
    >
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };
        return (
          <TabItem
            key={route.key}
            label={options.title ?? route.name}
            icon={ICONS[route.name] ?? { active: "ellipse", inactive: "ellipse-outline" }}
            focused={focused}
            onPress={onPress}
          />
        );
      })}
    </View>
  );
}

function TabItem({
  label,
  icon,
  focused,
  onPress,
}: {
  label: string;
  icon: { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap };
  focused: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const t = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    t.value = withSpring(focused ? 1 : 0, {
      damping: 18,
      stiffness: 220,
      mass: 0.55,
    });
  }, [focused, t]);

  // Pill background: tint fades in / scales from 0.85 → 1
  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      t.value,
      [0, 1],
      ["rgba(0,0,0,0)", colors.primaryDim]
    ),
    transform: [{ scale: interpolate(t.value, [0, 1], [0.9, 1]) }],
  }));

  // Icon: gently pops on focus
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(t.value, [0, 1], [1, 1.06]) }],
  }));

  // Label: slides in from `start` and fades; collapses width when inactive.
  const labelStyle = useAnimatedStyle(() => ({
    opacity: t.value,
    maxWidth: interpolate(t.value, [0, 1], [0, 90]),
    marginStart: interpolate(t.value, [0, 1], [0, 6]),
    // In row-reverse (RTL), the label sits LEFT of the icon and slides in from the right
    transform: [{ translateX: interpolate(t.value, [0, 1], [6, 0]) }],
  }));

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
    >
      <Animated.View
        style={[
          {
            flexDirection: "row-reverse",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 999,
            minWidth: 44,
          },
          pillStyle,
        ]}
      >
        <Animated.Text
          numberOfLines={1}
          style={[
            {
              fontSize: 13,
              fontWeight: "800",
              color: colors.primary,
              overflow: "hidden",
            },
            labelStyle,
          ]}
        >
          {label}
        </Animated.Text>
        <Animated.View style={iconStyle}>
          <Ionicons
            name={focused ? icon.active : icon.inactive}
            size={22}
            color={focused ? colors.primary : colors.tabInactive}
          />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}
