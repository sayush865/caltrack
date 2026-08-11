// /foods?date= — food library: debounced server-side search over food_database,
// Favorites (one-tap chips), Recents (last 10 distinct foods, tap to relog),
// PortionSheet on add, custom-food fallback. IA_FLOWS §1 + state table row "Foods".

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, SearchX, Utensils } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { EmptyState, PageHeader, Shimmer, Surface } from "@/components/system";
import { FoodCard } from "@/components/foods/FoodCard";
import { PortionSheet } from "@/components/foods/PortionSheet";
import { useFoodSearch, useRecentFoods, type DbFood, type RecentFood } from "@/components/foods/hooks";
import { useFavorites } from "@/hooks/useFavorites";
import { useLogMeal } from "@/hooks/useMutations";
import { dayKey, friendlyDay, isToday, suggestedMealType } from "@/lib/dates";
import type { Favorite } from "@/lib/types";

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function RowSkeletons({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }, (_, i) => (
        <Shimmer key={i} className="h-[76px] w-full rounded-card" />
      ))}
    </div>
  );
}

export default function Foods() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const dateParam = params.get("date");
  const dateKey = dateParam || dayKey(new Date());

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [portionFood, setPortionFood] = useState<DbFood | null>(null);
  

  // 300ms debounce before hitting the server.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const searching = debounced.length > 0;
  const search = useFoodSearch(debounced);
  const recents = useRecentFoods();
  const { favorites, logFavorite, isLogging } = useFavorites();
  const logMeal = useLogMeal();

  const favoriteChips = useMemo(() => favorites.slice(0, 8), [favorites]);

  const logFavoriteChip = (fav: Favorite) => {
    if (isLogging || logMeal.isPending) return;
    if (isToday(dateKey)) {
      logFavorite(fav); // toasts + bumps use_count
    } else {
      // logFavorite hardcodes today's dayKey — go through useLogMeal for past dates.
      logMeal.mutate(
        {
          items: fav.items.map((item) => ({ ...item, id: newId() })),
          mealType: suggestedMealType(),
          dayKey: dateKey,
          source: "quick",
        },
        { onSuccess: () => toast.success(`Logged ${fav.name} to ${friendlyDay(dateKey)}`) },
      );
    }
  };

  const relogRecent = (recent: RecentFood) => {
    if (logMeal.isPending) return;
    logMeal.mutate(
      {
        items: [{ ...recent.item, id: newId() }],
        mealType: suggestedMealType(),
        dayKey: dateKey,
        source: "quick",
      },
      { onSuccess: () => toast.success(`Logged ${recent.name}`) },
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Food library" back />

      <main className="mx-auto max-w-md px-4 pb-safe">
        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search foods…"
            aria-label="Search foods"
            className="h-12 rounded-control bg-card pl-10 text-body"
          />
        </div>
        {!isToday(dateKey) && (
          <p className="mt-1.5 text-caption text-muted-foreground">
            Logging to {friendlyDay(dateKey)}
          </p>
        )}

        {searching ? (
          /* ── Search results ─────────────────────────────── */
          <section className="mt-4 pb-10" aria-label="Search results">
            {search.isLoading || (search.isFetching && !search.data) ? (
              <RowSkeletons />
            ) : search.isError ? (
              <EmptyState
                icon={SearchX}
                headline="Search hit a snag"
                copy="We couldn't reach the food database. Give it another try."
                action={{ label: "Retry", onClick: () => search.refetch() }}
              />
            ) : (search.data ?? []).length === 0 ? (
              <EmptyState
                icon={SearchX}
                headline="Can't find it?"
                copy={`No matches for "${debounced}". AI can estimate it from a description.`}
                action={{
                  label: "Describe it to AI",
                  onClick: () => navigate(`/describe?date=${dateKey}`),
                }}
              />

            ) : (
              <div className="space-y-2">
                {(search.data ?? []).map((food) => (
                  <FoodCard key={food.id} food={food} onAdd={setPortionFood} />
                ))}
              </div>
            )}
          </section>
        ) : (
          /* ── Default view: favorites + recents ──────────── */
          <div className="mt-4 space-y-5 pb-10">
            <section aria-label="Favorites">
              <p className="text-micro uppercase text-muted-foreground">Favorites</p>
              {favoriteChips.length > 0 ? (
                <div className="-mx-1 mt-1.5 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide">
                  {favoriteChips.map((fav) => (
                    <button
                      key={fav.id}
                      type="button"
                      onClick={() => logFavoriteChip(fav)}
                      disabled={isLogging || logMeal.isPending}
                      className="flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-4 transition-transform duration-instant active:scale-[0.97] disabled:opacity-60"
                    >
                      <span className="max-w-[140px] truncate text-label text-foreground">{fav.name}</span>
                      <span className="text-caption tabular-nums text-muted-foreground">
                        {Math.round(fav.totals.calories)} kcal
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-1.5 text-caption text-muted-foreground">
                  Save any logged meal as a favorite for one-tap logging here.
                </p>
              )}
            </section>

            <section aria-label="Recents">
              <p className="text-micro uppercase text-muted-foreground">Recents</p>
              {recents.isLoading ? (
                <div className="mt-1.5">
                  <RowSkeletons count={3} />
                </div>
              ) : (recents.data ?? []).length === 0 ? (
                <EmptyState
                  icon={Utensils}
                  headline="Nothing logged yet"
                  copy="Foods you log will show up here for quick relogging."
                  action={{ label: "Scan a meal", onClick: () => navigate("/scan") }}
                />
              ) : (
                <div className="mt-1.5 space-y-2">
                  {(recents.data ?? []).map((recent) => (
                    <Surface
                      key={recent.name.toLowerCase()}
                      role="button"
                      tabIndex={0}
                      onClick={() => relogRecent(recent)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          relogRecent(recent);
                        }
                      }}
                      className="flex min-h-[56px] cursor-pointer items-center gap-3 px-3 py-2 transition-transform duration-instant active:scale-[0.97]"
                    >
                      {recent.imageUrl ? (
                        <img
                          src={recent.imageUrl}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-control object-cover"
                        />
                      ) : (
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-control bg-primary-soft text-primary">
                          <Utensils className="h-5 w-5" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body font-medium text-foreground">
                          {recent.name}
                        </span>
                        <span className="block text-caption text-muted-foreground">
                          {recent.item.portion} · tap to relog
                        </span>
                      </span>
                      <span className="shrink-0 font-display text-[17px] font-semibold tabular-nums text-foreground">
                        {recent.calories}
                        <span className="ml-0.5 text-caption font-medium text-muted-foreground">kcal</span>
                      </span>
                    </Surface>
                  ))}
                </div>
              )}
            </section>

          </div>
        )}
      </main>

      <PortionSheet food={portionFood} onOpenChange={(open) => !open && setPortionFood(null)} dateKey={dateKey} />
    </div>
  );
}
