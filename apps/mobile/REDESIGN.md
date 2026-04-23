# שכונה — Mobile Redesign Notes

> תיעוד מלא של עיצוב מחדש של אפליקציית `apps/mobile`.
> כולל החלטות עיצוב, מערכת קומפוננטים, מערכת ערכות נושא,
> אסטרטגיית RTL, ואופטימיזציות אנימציה.

---

## 1. תקציר מנהלים

האפליקציה עברה רענון עיצוב מקצה לקצה כדי להגיע למראה Fan-Football
מודרני: **רקע נייבי כהה + accent מנטה ירוק**, חלוקה לטוקני עיצוב,
ספריית קומפוננטים אחידה, ערכות נושא כהה/בהיר/מערכת, ואנימציות
שרצות על ה-UI thread באמצעות **Reanimated 4 + Worklets**.

עקרונות:

1. **טוקנים לפני סטיילים מקומיים** — אסור לכתוב צבע hex ישירות
   בקוד מסך; משתמשים תמיד ב-`useTheme().colors`.
2. **קומפוננטים לפני JSX מקומי** — כל מסך נבנה מ-`Screen`,
   `Card`, `Button`, `Input`, `BackButton`… במקום להמציא מחדש.
3. **תנועה היא חלק מהמותג** — כל אינטראקציה מקבלת משוב חזותי
   (scale-on-press, fade-in-up, אינדיקטור טאבים מחליק וכו').
4. **ביצועים לפני הכל** — אנימציות רצות על UI thread; אם משהו
   חייב לחיות ב-JS thread (תרגום ערך לפי layout) משתמשים ב-spring
   קצר ב-Reanimated worklet.

---

## 2. מערכת ערכות נושא (Theme System)

### 2.1 טוקנים

קובץ: [`apps/mobile/constants/colors.ts`](./constants/colors.ts)

שתי פלטות מלאות (`DARK`, `LIGHT`) חולקות אותו schema, כך שמסכים
פשוט קוראים ל-`colors.bgCard` בלי תלות במצב.

| קבוצה        | טוקנים מרכזיים                                                       |
| ------------ | -------------------------------------------------------------------- |
| Backgrounds  | `bg`, `bgElevated`, `bgCard`, `bgSurface`, `bgSubtle`, `bgOverlay`   |
| Borders      | `border`, `borderStrong`, `borderSoft`                               |
| Text         | `textPrimary`, `textSecondary`, `textMuted`, `textDisabled`, `textInverse` |
| Brand        | `primary`, `primaryHover`, `primaryPress`, `primaryDim`, `primaryGlow`, `primaryOnText` |
| Status       | `error/Dim`, `warning/Dim`, `success/Dim`, `info/Dim`                |
| Tab chrome   | `tabBar`, `tabBorder`, `tabActive`, `tabInactive`                    |

בנוסף יש `radius` ו-`shadow` לסטיילים נפוצים (כרטיס, כפתור, hero).

### 2.2 ה-Provider

קובץ: [`apps/mobile/hooks/useTheme.tsx`](./hooks/useTheme.tsx)

- שלושה מצבים: `"light" | "dark" | "system"`
- **ברירת מחדל: `dark`** — האפליקציה נטענת בכהה גם לפני שה-OS
  מספיק לחזור עם `useColorScheme()`, כדי למנוע "פלאש" לבן.
- ההעדפה נשמרת ב-`expo-secure-store` תחת `shkuna_theme_mode_v1`.
- הקונטקסט חושף: `colors`, `isDark`, `mode`, `setMode`, `toggle`.

מתוך `app/(tabs)/profile.tsx` המשתמש בוחר ערכת נושא דרך `ThemeChip`
(`☀️ בהיר` / `🌙 כהה` / `📱 מערכת`).

### 2.3 חיבור ל-OS

- `app.json` → `userInterfaceStyle: "automatic"` כדי שה-status bar
  של iOS וצבעי המערכת של Android יתאמו.
- `_layout.tsx` קורא ל-`SystemUI.setBackgroundColorAsync(colors.bg)`
  בכל החלפת ערכה — מוודא שאין "ריצוד" בזמן navigation.

---

## 3. אסטרטגיית RTL

האפליקציה בעברית בלבד והיא בנויה ב-**RTL ידני**:

- כל שורה משתמשת ב-`flexDirection: "row-reverse"`.
- כל טקסט משתמש ב-`textAlign: "right"`.
- כפתורי "חזרה" משתמשים ב-`chevron-forward` (חץ ימינה — כיוון
  ה"חזרה" בעברית).
- אינדיקטורי "כניסה לכרטיס" משתמשים ב-`chevron-back` (חץ שמאלה —
  כיוון התקדמות ב-RTL).

**במכוון** אנחנו לא קוראים ל-`I18nManager.forceRTL(true)`. הסיבה:
אם המכשיר כבר במצב RTL ברמת ה-OS (locale עברי), RN מבצע flip
אוטומטי על `flex-direction: row`, מה שיגרום ל-`row-reverse` שלנו
להפוך פעמיים ולחזור ל-LTR. כדי להבטיח עקביות, הקובץ הראשי משבית
RTL ב-OS:

```ts
// apps/mobile/app/_layout.tsx
if (I18nManager.isRTL) {
  I18nManager.allowRTL(false);
  I18nManager.forceRTL(false);
}
```

### 3.1 קומפוננט עזר לחזרה

`components/ui/BackButton.tsx` חושף שני וריאנטים:

- `<BackButton />` — חץ + טקסט "חזרה" (משמש בכל מסכי auth + create).
- `<BackButton pill />` — כפתור עיגול נקי (משמש ב-`HeroHeader`).

החץ תמיד `chevron-forward` (`>`), כך שזה יציב גם אם יום אחד
נשנה את אסטרטגיית ה-RTL.

---

## 4. ספריית קומפוננטים (`components/ui/`)

| קומפוננט         | תפקיד                                                             |
| ---------------- | ----------------------------------------------------------------- |
| `Screen`         | עטיפת מסך עם `SafeAreaView`, `StatusBar`, רקע מוטמע + `PitchDecor`|
| `PitchDecor`     | קישוט רקע (קווי מגרש דהויים)                                      |
| `Card`           | כרטיס עם וריאנטים: `default / surface / elevated / outline / tinted` |
| `Button`         | 6 וריאנטים, 3 גדלים, תמיכה ב-icon/emoji/loading                   |
| `Input`          | תווית + רמז + שגיאה + emoji + icon, RTL מובנה                     |
| `HeroHeader`     | כותרת מסכים מרכזיים (כותרת, תת-כותרת, emoji-badge, חזרה)          |
| `Avatar`         | אווטר טקסטואלי עם 4 צבעי tone                                     |
| `Badge`          | תגית קטנה (`primary / success / warning / error / info / neutral`) |
| `StatTile`       | אריח סטטיסטי לפרופיל                                              |
| `EmptyState`     | מצב ריק עם emoji, כותרת, תת-כותרת ופעולה אופציונלית               |
| `SectionTitle`   | כותרת קטע עם side-decoration                                      |
| `Divider`        | קו הפרדה דק                                                       |
| `PressableScale` | Pressable עם משוב scale (worklet)                                 |
| `FadeInUp`       | container שמפיע מתחת + fade-in (worklet)                          |
| `TabSwitcher`    | סגמנט-קונטרול pill עם אינדיקטור מחליק (worklet)                   |
| `BackButton`     | כפתור חזרה Hebrew-aware                                           |
| `DrillIcon`      | אינדיקטור "כנס לכרטיס" (chevron-back)                             |

**Barrel:** `components/ui/index.ts` — כל הקומפוננטים מיוצאים בשורה אחת.

---

## 5. מסכים שעוצבו מחדש

### Auth (`app/(auth)/`)

- `welcome.tsx` — **חדש**. Onboarding עם כדור מסתובב, רינג מקווקו,
  שלוש נקודות highlight.
- `login.tsx` — באנר עם ⚽ קופץ, `Input` למספר טלפון, `Button` ראשי.
- `otp.tsx` — 6 תאי OTP עם אנימציית רעידה + scale פר תא.
- `profile.tsx` — הגדרת שם + כינוי לאחר רישום ראשון.

### Tabs (`app/(tabs)/`)

- `_layout.tsx` — **TabBar מותאם** (להלן בפרק נפרד).
- `home.tsx` — Hero header, כרטיסים: "שלום אלוף", המשחק הקרוב,
  הקבוצות שלי, פעולות מהירות.
- `my-team.tsx` — רשימת קבוצות עם נקודות, סמלים ו-`EmptyState`.
- `profile.tsx` — אווטר, סטטיסטיקות, עריכת פרופיל ב-`SheetModal`,
  בחירת ערכת נושא.

### Team

- `team/create.tsx` — בחירת עיר עם chips, יצירת קבוצה.
- `team/[id].tsx` — דף קבוצה מלא: חברים, השתתפות, התאריך הבא,
  מודאלים להזמנה / לקביעת מקבל תשלום / לבחירת אחראי חולצות.

### Match

- `match/create.tsx` — בחירת תאריך/שעה עם `DateTimePicker` עטוף
  ב-`PressableScale`.
- `match/[id].tsx` — המסך הכבד ביותר. כולל:
  - Hero + טאבים (`TabSwitcher`)
  - רישום שחקנים, סטטוס תשלום, חלוקת קבוצות
  - **`Stopwatch`** — שעון עם נקודה אדומה פועמת (worklet)
  - "מגרש פעיל" עם נקודות לכל שחקן
  - היסטוריית סיבובים
  - כפתור "סיום משחק" שפותח את `EndMatchSheet`

### Match End Sheet

`components/match/EndMatchSheet.tsx` — מודאל דו-שלבי
(`תוצאה → מצטיין`) עם `TabSwitcher` למעלה, אווטרים לבחירת MVP / שחקן שפל,
ועדכון נקודות ב-Supabase.

### Misc

- `join/[token].tsx` — מסך קבלת הזמנה לקבוצה. רינג עיצובי + כרטיס
  מידע על הקבוצה + כפתור הצטרפות.

---

## 6. ה-TabBar החדש

קובץ: `apps/mobile/app/(tabs)/_layout.tsx`

הצורה: שורה תחתונה עם 3 פריטים. כשטאב הופך לפעיל הוא מקבל
**pill ירוק-מנטה** עם הטקסט נכנס מהצד.

### החלטות עיצוב

- **לא משתמשים בנקודה תחתונה** (היה במקור ולא נראה טוב).
  במקום זה — pill מאחורי האייקון+תווית.
- אייקונים: `home`, `shield` (קבוצות), `person` (פרופיל). מצב
  active = filled, inactive = outline.
- **רוחב ה-pill מתאים אוטומטית** (label collapses מ-90px ל-0
  בעזרת `interpolate(maxWidth)`), כך שטאבים לא-פעילים נשארים קומפקטיים.
- `paddingBottom` עוקב אחרי `useSafeAreaInsets().bottom` (iPhone home indicator).

### ביצועים

האנימציה משתמשת ב-shared value `t` (`0 → 1`) פר טאב, ושלושה
`useAnimatedStyle` שמפיקים:

| יעד            | אינטרפולציה                                          |
| -------------- | ---------------------------------------------------- |
| רקע ה-pill     | `interpolateColor(t, ['transparent', primaryDim])`   |
| Scale ה-pill   | `0.9 → 1`                                            |
| Scale האייקון  | `1 → 1.06`                                           |
| התווית         | `opacity 0→1`, `maxWidth 0→90`, `translateX -6→0`    |

הכל רץ ב-worklet אחד פר פריים על UI thread.

---

## 7. אנימציות ו-Reanimated 4

### 7.1 התקנה

```bash
cd apps/mobile
npx expo install react-native-reanimated react-native-worklets
```

`babel.config.js`:

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo", "nativewind/babel"],
    plugins: ["react-native-worklets/plugin"], // חייב להיות אחרון
  };
};
```

`app/_layout.tsx` מייבא בראש הקובץ:

```ts
import "react-native-reanimated";
```

### 7.2 קומפוננטים שעברו ל-worklets

| קומפוננט         | מה נחסך                                                                     |
| ---------------- | --------------------------------------------------------------------------- |
| `PressableScale` | spring על UI thread; press feedback מיידי גם אם JS עסוק                    |
| `FadeInUp`       | timing על UI thread; ניתן לשרשר עשרות פריטים בלי לגעת ב-JS                   |
| `TabSwitcher`    | אינדיקטור מחליק שכל-כולו worklet; אין re-renders של React                   |
| `ShkunaTabBar`   | interpolation של color + scale + maxWidth; אין JS-driven layout per frame   |
| `Stopwatch`      | `withRepeat` infinite, ממשיך לפעום גם בזמן `setState` כבד מלוגיקת המשחק    |

### 7.3 אנימציות שנשארו ב-`Animated` API

המסכים `welcome` / `login` משתמשים ב-`Animated` עם
`useNativeDriver: true` בלבד (transform/opacity). אלו כבר רצים על UI
thread, אז הגרת ל-Reanimated לא הייתה משפרת ביצועים — עדיף לחסוך
את המורכבות.

### 7.4 אסטרטגיית ביצועים מסכמת

1. **כל אנימציה משתמשת ב-native/UI thread.** אסור `useNativeDriver: false`.
2. **interpolation על דברים שאינם transform/opacity** (color, layout) →
   חייבים worklet (`useAnimatedStyle` עם `interpolateColor` / `interpolate`).
3. **אנימציות רציפות (loops)** → `withRepeat` ב-Reanimated, כי
   `Animated.loop` תוקעת עבודה ב-bridge בכל מחזור.
4. **Spring tuning:** `damping: 18, stiffness: 220, mass: 0.6` נתן את
   התחושה הכי "Apple-like" באפליקציה.

---

## 8. סטרוקטורת הקבצים שהשתנו

```
apps/mobile/
├── app/
│   ├── _layout.tsx                ← ThemeProvider, RTL guard, splash
│   ├── index.tsx                  ← redirect לפי auth state
│   ├── (auth)/
│   │   ├── _layout.tsx            ← Stack עם slide_from_right
│   │   ├── welcome.tsx            ← חדש
│   │   ├── login.tsx              ← רענון מלא + BackButton
│   │   ├── otp.tsx                ← רענון מלא + BackButton
│   │   └── profile.tsx            ← רענון מלא + BackButton
│   ├── (tabs)/
│   │   ├── _layout.tsx            ← ShkunaTabBar (worklets)
│   │   ├── home.tsx               ← Hero + Cards
│   │   ├── my-team.tsx            ← רשימת קבוצות
│   │   └── profile.tsx            ← פרופיל + Theme switcher
│   ├── team/
│   │   ├── create.tsx             ← Chips לבחירת עיר
│   │   └── [id].tsx               ← Sheet modals
│   ├── match/
│   │   ├── create.tsx             ← DateTimePicker עטוף
│   │   └── [id].tsx               ← Stopwatch + TabSwitcher + scoreboard
│   └── join/[token].tsx           ← מסך הצטרפות
├── components/
│   ├── ui/                        ← ספריית design-system חדשה
│   │   ├── index.ts
│   │   ├── Screen.tsx
│   │   ├── Card.tsx
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── HeroHeader.tsx
│   │   ├── Atoms.tsx              ← Avatar / Badge / StatTile
│   │   ├── EmptyState.tsx         ← + SectionTitle + Divider
│   │   ├── PressableScale.tsx     ← + FadeInUp (worklets)
│   │   ├── TabSwitcher.tsx        ← worklet
│   │   └── BackButton.tsx         ← + DrillIcon
│   └── match/EndMatchSheet.tsx    ← רענון מלא
├── constants/colors.ts            ← פלטה DARK + LIGHT + radius + shadow
├── hooks/useTheme.tsx             ← Provider + ברירת מחדל DARK
├── babel.config.js                ← + react-native-worklets/plugin
└── app.json                       ← userInterfaceStyle: "automatic"
```

---

## 9. הוראות הרצה

```bash
cd apps/mobile        # חשוב: monorepo, אין script ב-root
pnpm start            # או:  pnpm android / pnpm ios
```

### בעיה ידועה: `Cannot determine the project's Expo SDK version`

קורית כשמריצים את `expo start` מ-root של ה-monorepo. הפתרון —
להריץ מתוך `apps/mobile` כמו למעלה, או:

```bash
pnpm --filter mobile start
```

### אחרי שדרוגי תלויות (Reanimated)

צריך **clear cache** פעם אחת:

```bash
cd apps/mobile && pnpm start --clear
```

ואם מריצים על מכשיר פיזי / סימולטור, להפעיל מחדש את האפליקציה
(לא רק reload), כדי שהתוסף של Babel ייטען.

---

## 10. צ'ק-ליסט QA ידני

- [ ] מסך welcome נטען בכהה גם אם המכשיר במצב בהיר.
- [ ] לחיצה על "התחברות" → login → הזנת מספר → OTP → משלוח OK.
- [ ] בכל מסך, לחיצה על כפתור "חזרה" (חץ ימינה) חוזרת אחורה.
- [ ] טאבים: לחיצה על טאב לא-פעיל מציגה pill ירוק עם תווית מחליקה.
- [ ] בפרופיל: שינוי ערכת נושא בין `כהה / בהיר / מערכת` —
      כל המסכים מתעדכנים מיד; לאחר רענון האפליקציה, ההעדפה נשמרה.
- [ ] משחק חי: לחיצה על "התחל" — מופיעה נקודה אדומה פועמת לצד הזמן.
- [ ] מודאל סיום משחק: שני טאבים, בחירה של MVP מסומנת, "סיים" שומר ל-DB.

---

## 11. עבודה עתידית (לא בסקופ הזה)

1. **`FlatList` במקום `ScrollView` + `.map()`** במסכי `team/[id]` ו-`match/[id]`
   כשמספר השחקנים גדל מעל 30.
2. **Skeleton screens** במקום `ActivityIndicator` (במיוחד במסכי טעינה ראשונה).
3. **Haptics** ב-`expo-haptics` על אירועים חשובים (start/stop, win).
4. **i18n מלא** עם `i18next` כדי לתמוך בערבית/אנגלית בעתיד.
5. **Profiling אמיתי** עם Flipper + React DevTools Profiler לפני
   הוספת אופטימיזציות נוספות.
