# Shkuna

מונורפו של **Shkuna**: אפליקציית מובייל (Expo), אתר Next.js, חבילות משותפות, ומסד/לוגיקה ב־Supabase (מיגרציות ו־Edge Functions).

## מבנה

| נתיב | תיאור |
|------|--------|
| `apps/mobile` | אפליקציית React Native / Expo Router, אימות ו־Supabase |
| `apps/web` | אפליקציית Next.js |
| `packages/db` | טיפוסים ולקוח DB משותף |
| `packages/utils` | עזרים (למשל ELO, הזמנות, ערבוב קבוצות) |
| `packages/ui` | רכיבי React משותפים |
| `supabase/` | `migrations`, `functions`, `config.toml` |

## דרישות

- Node.js 18+
- [pnpm](https://pnpm.io) 9 (מוגדר ב־`packageManager` בשורש)

## התקנה

```bash
pnpm install
```

## פיתוח

מהשורש — להריץ את כל הטסקים המוגדרים ב־Turbo:

```bash
pnpm dev
```

רק אפליקציה ספציפית:

```bash
pnpm exec turbo dev --filter=web
pnpm exec turbo dev --filter=mobile
```

מובייל (מתוך `apps/mobile` אם צריך):

```bash
cd apps/mobile && pnpm start
```

## משתני סביבה

ראו `apps/mobile/.env.example` — יש להעתיק ל־`.env` מקומי ולא לקמיט סודות.

## Supabase

מיגרציות ב־`supabase/migrations/`. להריץ ולנהל לפי התיעוד של Supabase CLI לפרויקט שלך.
