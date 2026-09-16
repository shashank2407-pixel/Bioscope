# Keystone / Bioscope — Codebase Walkthrough for *Programming Paradigm*

**Course:** Programming Paradigm · B.Tech ISE · Units 1–6
**Application:** A Next.js web app that identifies a species from a photo using an AI model, then shows which other species depend on it.

This document explains **the logic** of the codebase: control flow (every meaningful `if`/`else`), the calculations and formulas, data structures, how the API calls work, and which paradigm each piece demonstrates. UI styling is deliberately ignored except where it changes behaviour.

---

## 0. Map of the codebase

| File | Responsibility | Paradigm on display |
|---|---|---|
| `lib/ecosystem.ts` | Types, status tables, normalisation, the "who is affected" rule engine | Functional, type-driven |
| `lib/catalog.ts` | 16 hard-coded reference species (the seed data) | Declarative data |
| `lib/filters.ts` | Pure filtering / counting functions | Functional |
| `lib/useCatalog.ts` | Data source merge, localStorage persistence, subscriptions | Event-driven + imperative |
| `lib/image.ts` | Photo decode and downscale maths | Imperative, I/O |
| `lib/semantic-search.ts` | Client-side API wrapper | Procedural |
| `lib/ai.ts` | Provider abstraction: Gemini → OpenAI fallback, retries, timeouts | OOP (custom exception) + procedural |
| `lib/supabase.ts` | Database client construction | Relational model access |
| `app/api/identify-species/route.ts` | Server endpoint: validate → call model → sanitise | Server-side procedural |
| `app/api/semantic-search/route.ts` | Server endpoint: natural-language filter | Same, with fallback |
| `components/FieldScannerModal.tsx` | The scanner state machine | Event-driven, finite state machine |
| `components/NetworkView.tsx` | Graph layout computation | Functional + geometry |
| `app/page.tsx`, `app/species/[id]/page.tsx` | Composition of everything | Declarative UI |

**Layering rule:** `lib/*` holds logic that could run anywhere (no DOM, no React, except the two hooks). `components/*` and `app/*` render it. This separation is the Unit 1 "effects of scale" lesson in practice — logic that is pure and isolated stays testable as the codebase grows.

---

## 1. Unit 1 — Programming models in one codebase

### 1.1 Imperative vs declarative, side by side

The same program contains both styles, which makes the contrast concrete.

**Declarative** (`app/page.tsx`) — you describe *what* the screen is for a given state, never *how* to mutate it:

```tsx
{filtered.length === 0 ? (
  <EmptyState onClearFilters={resetAll} />
) : view === 'grid' ? (
  <SpeciesGrid speciesList={filtered} ripple={ripple} onSimulateLoss={setRippleTarget} />
) : view === 'map' ? (
  <MapBox speciesList={filtered} />
) : (
  <NetworkView speciesList={filtered} />
)}
```

There is no "remove the old cards, insert new cards" instruction anywhere. State changes, React recomputes the description, and the runtime reconciles the difference. This is the *declarative* model: **state → view is a function**, written `view = f(state)`.

**Imperative** (`lib/useCatalog.ts`) — an explicit loop with mutation, because the goal is a step-by-step procedure with a stopping condition:

```ts
let list = scans.slice(0, MAX_SCANS);
while (list.length > 0) {
  try {
    localStorage.setItem(SCANS_KEY, JSON.stringify(list));
    break;                       // success: stop
  } catch {
    list = list.slice(0, -1);    // quota exceeded: drop the oldest and retry
  }
}
```

Same program, two models. Unit 1's core claim — *state changes are managed differently by different paradigms* — is visible in these two snippets.

### 1.2 Where each model appears

- **Procedural:** `lib/image.ts`, the API route handlers — a sequence of steps operating on arguments.
- **Object-oriented:** `class AIError extends Error` in `lib/ai.ts`; the Supabase client object; `Map`/`Set` instances and their methods.
- **Functional:** `lib/filters.ts` and `lib/ecosystem.ts` — pure functions, `map`/`filter`/`reduce`, no mutation of inputs.
- **Event-driven:** every `on*` handler, `window.addEventListener`, the custom `keystone:scans-changed` event.
- **Relational:** `supabase.from('species').select('*')` — a query over a relational table (`lib/schema.sql` defines `species` with a foreign key to `conservation_statuses`).
- **Concurrent:** `async`/`await` over the event loop; two network calls racing against a timeout signal; `Promise` composition.
- **Logical (rule-based):** `findAffected` is a small rule engine — a set of independent rules, each producing a fact, closest in spirit to logic programming (see §5.3).

### 1.3 State and state changes

Three distinct kinds of state exist here, and the distinction matters:

1. **Ephemeral UI state** — `useState` inside a component (`view`, `filters`, `phase`). Dies on reload.
2. **Persistent local state** — `localStorage` under the key `keystone:scans:v1`. Survives reload, is per-browser.
3. **Remote state** — the Supabase `species` table. Shared by all users.

`useCatalog` unifies all three into one list, so the rest of the program never asks "where did this species come from?" — a single source of truth. That is a deliberate architectural choice against scattered state, which is exactly the "effects of scale on methodology" topic of Unit 1.

---

## 2. Unit 2 — OOP concepts present in the code

### 2.1 Classes, inheritance, constructors, custom exceptions

```ts
export class AIError extends Error {
  constructor(message: string, public details: string[] = []) {
    super(message);
  }
}
```

- `extends Error` — **inheritance** from a built-in class.
- `super(message)` — the **superclass constructor** call; skipping it is a runtime error.
- `public details: string[] = []` — TypeScript **parameter property**: declares a field, assigns it, and sets visibility in one line. A default value makes the argument optional (a poor-man's **constructor overload**).
- The subclass is useful because of `instanceof` dispatch at the call site:

```ts
const details = err instanceof AIError ? err.details : [];
```

This is **runtime type-based dispatch** — the same test that `catch (Exception e)` blocks perform in Java, expressed as a conditional because JavaScript has a single `catch` clause per `try`.

### 2.2 Interfaces as contracts

`Species` in `lib/ecosystem.ts` is an interface, not a class. It has **no behaviour, only structure**:

```ts
export interface Species {
  id: string;
  scientific_name: string;
  status: StatusCode;
  taxonomy?: Taxonomy;      // optional field
  dependencies?: string[];
  ...
}
```

TypeScript uses **structural typing** ("duck typing"): any object with the right shape satisfies `Species`. Java uses **nominal typing** — a class must say `implements Species`. This difference is worth stating explicitly in a paradigms course; it changes how polymorphism is achieved. Here, polymorphism is structural: a species from the hard-coded catalog, one from the database, and one from an AI scan are different origins but the same shape, so every downstream function accepts all three without knowing the difference.

`source?: 'catalog' | 'scan'` is a **union type** used as a discriminator when origin *does* matter (for example, only scans can be deleted).

### 2.3 Encapsulation without classes

Module scope replaces `private`:

```ts
let remotePromise: Promise<Species[]> | null = null;   // module-private

function fetchRemote(): Promise<Species[]> {
  if (!supabase) return Promise.resolve([]);
  remotePromise ??= (async () => { ... })();           // memoised
  return remotePromise;
}
```

`remotePromise` is invisible outside the file; `fetchRemote` is the only accessor. This is **information hiding** achieved by the module system rather than access modifiers — and `??=` (logical-nullish-assignment) gives **lazy, once-only initialisation**, the functional cousin of a singleton.

### 2.4 Collections, generics, iteration protocols

```ts
const byName = new Map<string, Species>();     // generic parameterisation
for (const s of CATALOG) byName.set(s.scientific_name.toLowerCase(), s);
return [...byName.values()];                    // iterator → array
```

- `Map<K, V>` is a **generic collection** with `O(1)` average lookup, versus `Array.prototype.find` at `O(n)`.
- `for...of` consumes the **iteration protocol** (`Symbol.iterator`), the JavaScript equivalent of Java's `Iterable`/`Iterator`.
- `[...iterable]` (spread) drains an iterator into a new array.
- `new Set(...)` is used for de-duplication in `uniqueSorted`, relying on **set semantics** (no duplicates) rather than manual checks.

> **Note on `tsconfig.json`:** iterating a `Map` originally failed to compile with *"can only be iterated through when using `--downlevelIteration` or a `--target` of ES2015 or higher."* The fix was raising `target` from `es5` to `ES2020`. This is a concrete lesson in **compilation targets**: the same source is legal or illegal depending on the language level the compiler is asked to emit.

### 2.5 Exception handling and propagation

The chain, from the deepest layer outward:

1. `callGemini` **throws** on a non-OK HTTP status or empty response.
2. `generateJson` **catches** per provider, records the message, and continues the loop.
3. After all providers fail, it **throws** `AIError` — an aggregate.
4. The route handler **catches**, converts the exception into an HTTP status code and a JSON body.
5. The browser code checks `res.ok` and **throws** again inside its own `try`.
6. The component catches and moves its state machine to `{ name: 'error' }`, rendering a message.

An exception crosses a process boundary twice (server → HTTP → client) and changes representation at each hop: `Error` object → JSON `{error, details}` → `Error` object → UI state. **Exceptions do not travel over a network; status codes and payloads do.** That translation is the central idea of §6.

`finally` guarantees cleanup regardless of outcome:

```ts
try {
  return { dataUrl: encode(img, 1280, 0.86), thumbUrl: encode(img, 640, 0.8) };
} finally {
  URL.revokeObjectURL(img.src);   // always frees the blob URL
}
```

---

## 3. Unit 3 — Event-driven programming

### 3.1 Action-object vs object-action

The catalog demonstrates both orderings from the syllabus:

- **Object-action:** click a species card (choose the object), then press "Simulate loss" (choose the action).
- **Action-object:** press "Ask the guide" (choose the action), then the query selects which objects appear.

### 3.2 The event loop and callback registration

Nothing in this program polls. Execution is: register callbacks → the runtime waits → an event fires → a handler runs → state updates → the view is recomputed.

```ts
useEffect(() => {
  let alive = true;                                   // closure flag
  const sync = () => { setScans(readScans()); setScansLoaded(true); };
  sync();
  window.addEventListener(SCANS_EVENT, sync);
  window.addEventListener('storage', sync);
  fetchRemote().then((rows) => {
    if (!alive) return;                               // guard: component unmounted
    setRemote(rows);
  });
  return () => {                                      // cleanup on unmount
    alive = false;
    window.removeEventListener(SCANS_EVENT, sync);
    window.removeEventListener('storage', sync);
  };
}, []);
```

Four ideas in one block:

1. **Subscription lifecycle** — every `addEventListener` is matched by a `removeEventListener` in the returned cleanup function. Unbalanced listeners are the classic event-driven memory leak.
2. **The `alive` flag** — a **closure variable** guarding against a late async result updating a dead component. The promise cannot be cancelled, so its *effect* is suppressed instead.
3. **Custom events as a message bus** — `writeScans` publishes `window.dispatchEvent(new Event('keystone:scans-changed'))`, and every mounted `useCatalog` receives it. This is **publish/subscribe**: the writer knows nothing about the readers. Without it, saving a scan in the modal would not refresh the catalog behind it.
4. **The `storage` event** — fired by the browser in *other tabs* when `localStorage` changes, giving cross-tab synchronisation for free.

### 3.3 Exceptions as events

Unit 3 lists "exceptions as events". The scanner shows this: a failure does not crash the program or print to a console, it **becomes a state transition** that the UI renders.

```ts
const message =
  err instanceof TypeError
    ? 'Couldn’t reach the server. Check your connection and try again.'
    : err instanceof Error ? err.message : 'Identification failed.';
setPhase({ name: 'error', preview: prepared.dataUrl, message });
```

The `TypeError` test is not arbitrary: `fetch` rejects with `TypeError` specifically for network-level failures (DNS, offline, CORS), while an HTTP 500 **resolves normally** with `res.ok === false`. Distinguishing them lets the message be accurate about whether the server was reached.

### 3.4 Event object manipulation

```ts
onDrop={(e) => {
  e.preventDefault();                    // stop the browser opening the file
  setDragging(false);
  const file = e.dataTransfer.files?.[0];
  if (file) identify(file);
}}
```

`e.preventDefault()` cancels the **default action** of the event; dropping a file on a page normally navigates to it. In `MapBox`, `e.originalEvent.stopPropagation()` stops a marker click from **bubbling** to the map's own click handler, which would immediately close the popup that the click just opened. Default actions, bubbling, and cancellation are the three classic pieces of the DOM event model.

---

## 4. Unit 4 — I/O handling (the logic, not the appearance)

### 4.1 Reading a file: callback I/O wrapped into a promise

Browser file reading is callback-based. `lib/image.ts` converts it to a promise so the rest of the code can use `await`:

```ts
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);        // success path
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This file couldn’t be opened as an image…'));
    };
    img.src = url;                          // assignment starts the load
  });
}
```

This is the **promisification** pattern: a two-callback (success/failure) API becomes a single value that can be awaited, composed, and `try`/`catch`-ed. Note the ordering — handlers are attached *before* `img.src` is set, because setting `src` begins the load and a cached image could fire `onload` immediately.

### 4.2 The downscale calculation

```ts
const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
canvas.width  = Math.max(1, Math.round(img.naturalWidth  * scale));
canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
return canvas.toDataURL('image/jpeg', quality);
```

Step by step:

- `Math.max(w, h)` finds the **longest edge**; scaling by the longest edge guarantees the result fits inside a `maxEdge × maxEdge` box.
- `maxEdge / longestEdge` is the ratio needed. For a 4000 × 3000 photo with `maxEdge = 1280`: `1280 / 4000 = 0.32`, giving 1280 × 960.
- `Math.min(1, …)` **clamps** the ratio so a small image is never *upscaled* (upscaling adds bytes and no detail).
- Multiplying both dimensions by the same `scale` **preserves the aspect ratio**.
- `Math.round` avoids fractional pixels; `Math.max(1, …)` prevents a zero-sized canvas for extreme inputs — a guard against a degenerate edge case.
- `toDataURL('image/jpeg', 0.86)` re-encodes with **lossy compression** at quality 0.86 and returns a `data:` URL (Base64 text).

Two sizes are produced from one decode: `dataUrl` (1280 px, sent to the AI) and `thumbUrl` (640 px, stored). **Why:** Base64 inflates bytes by ~33% (4 output chars per 3 input bytes), and `localStorage` typically caps at ~5 MB per origin. Storing full-size photos would exhaust the quota after a couple of scans.

### 4.3 Input validation before I/O

```ts
if (file.type && !file.type.startsWith('image/')) {
  throw new Error('That file isn’t an image. Choose a JPEG, PNG or WebP photo.');
}
```

The `file.type &&` guard is deliberate: some operating systems report an **empty MIME type** for unusual files. Treating "unknown" as "reject" would block legitimate photos, so unknown types fall through to the decoder, which is the real authority — it either decodes or fires `onerror`. **Validate what you can cheaply, then let the real parser be the judge.**

---

## 5. Unit 5 — Functional programming in the code

### 5.1 Pure functions and referential transparency

`lib/filters.ts` contains only pure functions: same input → same output, no side effects, no mutation of arguments.

```ts
export function applyFilters(list: Species[], f: CatalogFilterState): Species[] {
  let result = list;
  if (f.habitat) result = result.filter((s) => s.habitat === f.habitat);
  if (f.region)  result = result.filter((s) => s.region === f.region);
  if (f.status)  result = result.filter((s) => s.status === f.status);
  ...
  return result;
}
```

`result` is reassigned, but `filter` **returns a new array** each time; the caller's `list` is never modified. The local variable is a cursor over a chain of immutable values — imperative in appearance, functional in effect.

Each `if` is a **conditional pipeline stage**: an empty string is falsy, so "no habitat selected" means "skip this stage" rather than "match everything". Encoding *absence* as a falsy value removes the need for a separate "is a filter active?" flag.

### 5.2 Higher-order functions

- `filter`, `map`, `sort`, `reduce`, `some`, `every` all take functions as arguments.
- `chip(active)` in `SidebarFilters.tsx` is a function **returning** a value computed from a parameter — the shape of a curried helper.
- `useCallback`/`useMemo` take functions and control *when* they run.

**Fold (reduce)** replaces an accumulator loop in `countByStatus`:

```ts
return list.reduce<Record<string, number>>((acc, s) => {
  acc[s.status] = (acc[s.status] ?? 0) + 1;
  return acc;
}, {});
```

The seed `{}` is the initial accumulator. `(acc[s.status] ?? 0) + 1` handles the first occurrence: `??` (nullish coalescing) supplies `0` when the key is absent. Note this fold **mutates its accumulator** for efficiency — a pragmatic deviation from purity that stays safe because `acc` is created fresh inside the call and never escapes until it is returned.

**Composition of ranking** (the AI-search branch):

```ts
const rank = new Map(f.aiIds.map((id, i) => [id, i]));      // id → position
result = result
  .filter((s) => rank.has(s.id))
  .sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
```

The AI returns ids in relevance order, but `filter` preserves *catalog* order, so the ranking must be reapplied. Building a `Map` of id → index converts the ranking into `O(1)` lookups; the comparator then subtracts positions. A comparator returning a negative number means "a first" — the standard three-way contract (`< 0`, `0`, `> 0`).

### 5.3 A rule engine: `findAffected`

This is the domain heart of the app: *if this species disappeared, who else is affected?* Four independent rules, each contributing a human-readable reason.

```ts
const targetDeps = new Set((target.dependencies ?? []).map(norm));
const targetName = norm(target.common_name);

return list
  .filter((s) => s.id !== target.id && norm(s.scientific_name) !== norm(target.scientific_name))
  .map((s) => {
    const reasons: string[] = [];

    // Rule 1: shared resource
    const shared = (s.dependencies ?? []).filter((d) => targetDeps.has(norm(d)));
    if (shared.length) reasons.push(`Shares ${shared.join(', ')}`);

    // Rule 2: the target eats / needs this species
    if (targetDeps.has(norm(s.common_name))) reasons.push(`${target.common_name} depends on it`);

    // Rule 3: this species eats / needs the target
    if ((s.dependencies ?? []).some((d) => norm(d) === targetName)) reasons.push(`Depends on ${target.common_name}`);

    // Rule 4: neighbours
    if (norm(s.habitat) === norm(target.habitat) && norm(s.region) === norm(target.region)) {
      reasons.push(`Same ${s.habitat.toLowerCase()} in ${s.region}`);
    }

    return { species: s, reasons };
  })
  .filter((a) => a.reasons.length > 0);
```

Points worth teaching from this function:

- **Pipeline shape:** `filter` (exclude self) → `map` (derive facts) → `filter` (keep non-empty). Each stage does one job; there is no nested loop with flags.
- **Rules are additive, not exclusive.** They are separate `if`s, not `else if`, so a species can match several and collect several reasons. Changing them to `else if` would silently hide relationships.
- **Set membership** (`targetDeps.has`) is `O(1)`; the naive version (`array.includes` inside a loop) is `O(d)` per test.
- **Normalisation before comparison.** `norm = (s) => s.trim().toLowerCase()` is applied on *both* sides of every comparison, so `"Fig trees"`, `"fig trees"` and `" Fig Trees "` unify. Comparing raw strings would make the graph silently sparse.
- **Two-part identity check.** Self-exclusion tests both `id` *and* `scientific_name`, because the same species can exist twice with different ids (once from the catalog, once from the database). Identity is domain-defined, not just a primary key.
- **Rule 4 uses `&&`, rules 1–3 use separate statements.** Sharing only a habitat (every forest species) would be too weak a signal; requiring habitat *and* region narrows it to genuine neighbours.

**Complexity:** `n` species, average `d` dependencies each → `O(n · d)`. For the built-in catalog (n = 16, d ≤ 3) this is trivial, so clarity beats micro-optimisation.

### 5.4 Immutability in state updates

```ts
const update = (patch: Partial<CatalogFilterState>) => setFilters((f) => ({ ...f, ...patch }));
saveScan → writeScans([species, ...readScans().filter((s) => s.id !== species.id)]);
```

Both build **new objects/arrays** rather than mutating. `{ ...f, ...patch }` is a shallow merge where later keys win — a functional record update. In `saveScan`, the filter-then-prepend idiom means "insert at front, remove any older copy", producing most-recent-first ordering without a sort.

`Partial<T>` is a **mapped type**: it mechanically derives a new type from `CatalogFilterState` with every field optional. Type-level computation, a genuinely functional feature of the type system.

### 5.5 Pattern matching, or its absence

Haskell would express the scanner's states with algebraic data types and pattern matching. TypeScript approximates this with a **discriminated union** and a `switch`-like ladder:

```ts
type Phase =
  | { name: 'idle' }
  | { name: 'scanning'; preview: string }
  | { name: 'result'; preview: string; species: Species; cues: string }
  | { name: 'rejected'; preview: string; reason: string }
  | { name: 'error'; preview?: string; message: string };
```

The compiler **narrows** the type after a test on the `name` field, so `phase.species` is only accessible inside a `phase.name === 'result'` branch. Accessing it elsewhere is a compile error. This is the practical value of sum types: **illegal states are unrepresentable**. A naive design with `isLoading`, `hasError`, `result`, and `reason` as four independent variables allows 16 combinations, most of them nonsense (`isLoading && hasError`).

---

## 6. How the API calls work (end to end)

This section traces one photo from a click to a rendered species name.

### 6.1 The chain

```
User picks a file
  └─ prepareImage()            decode + downscale → data URL          [browser]
      └─ fetch POST /api/identify-species                             [network]
          └─ route.ts: validate → generateJson()                      [Node server]
              └─ callGemini()  HTTPS POST generativelanguage…         [Google]
                  └─ (on failure) callOpenAI()  HTTPS POST api.openai [OpenAI]
              └─ sanitise the model's JSON
          └─ JSON response { identified, species, provider }
      └─ saveScan() → localStorage + custom event
  └─ setPhase({ name: 'result', … }) → React re-renders
```

### 6.2 Why the API key lives on the server

`lib/ai.ts` reads `process.env.GEMINI_API_KEY`, and it is imported **only** by files under `app/api/`. Those run in Node, never in the browser. Next.js enforces a naming rule: only variables prefixed `NEXT_PUBLIC_` are inlined into client bundles. So `NEXT_PUBLIC_MAPBOX_TOKEN` ships to the browser; `GEMINI_API_KEY` and `OPENAI_API_KEY` do not.

If the browser called Google directly, the key would be readable by anyone opening developer tools. The server route is a **trust boundary**: the client sends a photo, never a credential. This is the practical reason the app has a backend at all.

### 6.3 Request validation (fail fast, fail specifically)

```ts
if (typeof imageBase64 !== 'string' || !/^data:image\/[\w.+-]+;base64,/.test(imageBase64)) {
  return NextResponse.json({ error: 'The upload is not an image…' }, { status: 400 });
}
if (imageBase64.length > MAX_IMAGE_CHARS) {                   // 12_000_000
  return NextResponse.json({ error: 'That photo is too large…' }, { status: 413 });
}
```

- The **regular expression** asserts the string's structure: literal `data:image/`, a subtype of word characters, then `;base64,`. Anchoring with `^` means the check cannot be fooled by a prefix.
- Status codes are chosen to *mean* something: `400` malformed, `413` too large, `502` upstream failed, `503` not configured. Returning `200` with an error body — which the original code did — makes the failure invisible to any generic HTTP client.
- `12_000_000` characters ≈ 9 MB of binary after accounting for Base64's 4/3 expansion. Numeric separators (`_`) are readability only.

### 6.4 Two providers behind one function

```ts
export async function generateJson<T>(req: JsonRequest): Promise<{ data: T; provider: Provider }> {
  const providers = configuredProviders();                     // ['gemini', 'openai']
  if (providers.length === 0) throw new AIError('No AI provider is configured…');

  const failures: string[] = [];
  for (const provider of providers) {
    try {
      const call = provider === 'gemini' ? callGemini : callOpenAI;   // function as value
      const data = await call(req).catch((err) => {                   // one retry
        console.warn(`[ai] ${provider} attempt 1 failed, retrying:`, err.message);
        return call(req);
      });
      return { data: data as T, provider };                           // first success wins
    } catch (err) {
      failures.push(`${provider}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new AIError('Every AI provider failed.', failures);
}
```

- `configuredProviders()` builds the list from which keys exist, so the *configuration determines the control flow*. No key, no attempt.
- `const call = … ? callGemini : callOpenAI` selects a **function as a first-class value**, avoiding a duplicated `if` inside the loop body. The two functions share a signature — that shared signature is the real abstraction (an interface, satisfied structurally).
- The `for` loop is a **chain of responsibility**: each provider gets a turn; the first success returns immediately; failures accumulate and are reported together.
- `.catch(retry)` gives exactly **one** retry per provider. Most failures here are transient (timeout, HTTP 503 overload), and one retry covers them without risking an unbounded loop. Worst case is bounded: 2 providers × 2 attempts × 25 s.
- The generic `<T>` lets one function serve both endpoints (identification and search) while each caller keeps a precise result type.

### 6.5 Timeouts as cancellation

```ts
signal: AbortSignal.timeout(req.timeoutMs ?? 25_000),
```

`AbortSignal.timeout(ms)` produces a signal that fires after `ms`, and `fetch` abandons the request when it does, rejecting the promise. Without it, a hung connection would occupy the request until the platform's own limit — which is precisely the bug observed during development: a 45-second timeout stacked behind a slow model call and produced a 48-second failure. The current values (25 s per attempt, retry once) were chosen against a measured baseline of ~8 s per successful call.

Related tuning, in the Gemini request body:

```ts
thinkingConfig: { thinkingBudget: 0 },   // identification doesn't need deliberation
temperature: 0.2,                        // low randomness: same photo → same answer
responseMimeType: 'application/json',
responseSchema: SCHEMA,                  // provider-enforced output structure
```

`temperature` controls sampling randomness; near 0 makes output nearly deterministic, which is what an identification task wants. Raising it would be appropriate for creative text, not for taxonomy.

### 6.6 Getting structured data out of a language model

A model emits text. Three defences turn that text into a trustworthy object:

**1. Schema (provider-enforced).** `SCHEMA` in the route describes the exact object, with `enum` constraints for closed sets:

```ts
status: { type: 'STRING', enum: ['LC','NT','VU','EN','CR','EW','EX','DD','NE'] },
taxonomy: { type: 'OBJECT', properties: { kingdom: …, phylum: …, class: … },
            required: ['kingdom','phylum','class','order','family','genus'] },
```

The `required` list on `taxonomy` was added after a real bug: the model packed six rank names into the `phylum` field and left the rest blank. Constraining the schema fixed the output shape.

**2. Tolerant parsing.**

```ts
function parseJson(text: string) {
  const cleaned = text.replace(/```(?:json)?/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Model did not return JSON.');
  return JSON.parse(cleaned.slice(start, end + 1));
}
```

Strips Markdown code fences, then slices from the **first** `{` to the **last** `}` so surrounding prose cannot break `JSON.parse`. The explicit `-1` check produces a clear error instead of a confusing slice.

**3. Sanitisation (never trust the payload).**

```ts
const str = (v, fallback = '') => (typeof v === 'string' && v.trim() ? v.trim() : fallback);
const num = (v, min, max, fallback) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const strList = (v, max) => Array.isArray(v) ? v.map((x) => str(x)).filter(Boolean).slice(0, max) : [];
```

- `Math.min(max, Math.max(min, n))` is the standard **clamp**: the inner `max` lifts anything below `min`, the outer `min` caps anything above. Latitude is clamped to `[-90, 90]`, longitude to `[-180, 180]`, confidence to `[0, 1]`.
- `Number.isFinite` rejects `NaN` and `Infinity`, which plain `typeof n === 'number'` would accept — `Number('abc')` is `NaN`, and a `NaN` latitude would silently break the map.
- `strList(…, 5)` bounds array length, so a runaway response cannot flood the UI.
- The fallback for a missing common name is the scientific name:
  ```ts
  const scientificName = str(data.scientific_name, 'Unidentified species');
  const commonName = str(data.common_name, scientificName);
  ```
  This is the fix for the original bug report ("the animal name is not coming"): there is now always *some* name, derived rather than invented.

### 6.7 The "not an organism" branch

```ts
if (data.is_organism === false) {
  return NextResponse.json({ identified: false, reason: str(data.rejection_reason, '…'), provider });
}
```

A photo of a chair is **not an error** — the request succeeded and the honest answer is "no organism here". So it returns `200` with `identified: false`, and the client renders a distinct `rejected` state. Mapping this to an exception would conflate *failure of the system* with *a valid negative result*. The strict `=== false` test matters: a missing field must not be treated as a rejection.

### 6.8 Graceful degradation in semantic search

`app/api/semantic-search/route.ts` never fails outright:

```ts
try {
  const { data, provider } = await generateJson(…);
  const known = new Set(species.map((s) => s.id));
  const ids = Array.isArray(data.ids) ? data.ids.map(String).filter((id) => known.has(id)) : [];
  return NextResponse.json({ ids, summary, provider });
} catch {
  return NextResponse.json({ ...keywordSearch(query, species), provider: 'keyword' });
}
```

- `known.has(id)` **validates every returned id against the ids that were sent**. A model can hallucinate an identifier; this filter makes that impossible to observe downstream.
- The `catch` falls back to a deterministic keyword search — splitting the query into terms longer than two characters and testing substring membership against a joined haystack. Quality degrades; the feature keeps working. The response carries `provider: 'keyword'` so the caller can tell which path ran.

---

## 7. The scanner as a finite state machine

`FieldScannerModal.tsx` is the most state-heavy component. It is worth reading as an FSM.

| From | Event | To |
|---|---|---|
| `idle` | file chosen / dropped | `scanning` |
| `scanning` | HTTP 200, `identified: true` | `result` |
| `scanning` | HTTP 200, `identified: false` | `rejected` |
| `scanning` | non-OK status or network failure | `error` |
| `result` / `rejected` / `error` | "Scan another" | `idle` |
| any | modal closed | `idle` (and the in-flight request is orphaned) |

### 7.1 The race-condition guard

Two scans started in quick succession can return **out of order**, so the second result could be overwritten by the first. A monotonic counter solves it:

```ts
const requestId = useRef(0);

const identify = async (file: File) => {
  const id = ++requestId.current;         // claim a ticket
  …
  const body = await res.json();
  if (id !== requestId.current) return;   // a newer scan started: discard this result
  setPhase({ name: 'result', … });
};
```

Every `await` is a point where another scan may begin, so the check is repeated after each one. Closing the modal also increments the counter, which invalidates any in-flight response without needing to cancel the request. This is the **stale-response / last-write-wins** pattern, and it is the async equivalent of a sequence number in a network protocol.

`useRef` is used rather than `useState` deliberately: the value must be **readable synchronously and not trigger a re-render**. React state updates are batched and asynchronous, which would defeat the guard.

### 7.2 Timed progress, clamped

```ts
useEffect(() => {
  if (phase.name !== 'scanning') return;                 // only while scanning
  const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 1700);
  return () => clearInterval(timer);                     // cleanup on exit
}, [phase.name]);
```

`Math.min(s + 1, STEPS.length - 1)` **clamps** the index so the label stops on the last step instead of running past the array bounds when a request takes longer than 4 × 1700 ms. The cleanup function guarantees the interval is cleared whenever the phase changes — an uncleared interval is the most common event-driven resource leak.

---

## 8. Graph layout: the one piece of real geometry

`NetworkView.tsx` draws species on the left, the resources they depend on at right, with curves between them. Three calculations:

### 8.1 Building the bipartite graph

```ts
const resources = new Map<string, { key: string; label: string; ids: string[] }>();
for (const s of speciesList) {
  for (const dep of s.dependencies ?? []) {
    const key = dep.trim().toLowerCase();                       // normalised key
    const entry = resources.get(key) ?? { key, label: dep.trim(), ids: [] };
    if (!entry.ids.includes(s.id)) entry.ids.push(s.id);        // no duplicate edges
    resources.set(key, entry);
  }
}
```

An **inverted index**: the input maps species → dependencies, and this builds dependency → species. `?? { … }` supplies a fresh entry on first sight of a key ("upsert"). `ids.length > 1` then identifies a *shared* resource, which the view highlights — the whole point of the screen.

### 8.2 Ordering rows to reduce crossings (barycentre heuristic)

```ts
const resourceIndex = new Map(resourceList.map((r, i) => [r.key, i]));

const weight = (s: Species) => {
  const idx = (s.dependencies ?? []).map((d) => resourceIndex.get(d.trim().toLowerCase()) ?? 0);
  return idx.length ? idx.reduce((a, b) => a + b, 0) / idx.length : Infinity;
};
const speciesOrdered = [...speciesList].sort((a, b) => weight(a) - weight(b));
```

Each species is assigned the **mean row index of its resources** — its barycentre — and species are sorted by it. A species whose dependencies sit near the top of the right column is placed near the top of the left column, so its edges run roughly horizontally instead of diagonally across the figure.

This is the standard first pass of the **Sugiyama layered graph drawing** method. Minimising edge crossings exactly is NP-hard; the barycentre heuristic is `O(n log n)` and visually good enough. Species with no dependencies get `Infinity`, sorting them to the bottom rather than throwing off the average. Note `[...speciesList].sort(…)` copies first, because `sort` mutates in place and the prop must not be modified.

### 8.3 Coordinates and curves

```ts
const rows = Math.max(speciesOrdered.length, resourceList.length);
const height = rows * ROW + 40;                                        // ROW = 34
const yFor = (i, n) => 20 + ROW / 2 + i * ROW + ((rows - n) * ROW) / 2;
```

Reading `yFor` term by term: `20` top padding, `ROW / 2` centres the node in its row, `i * ROW` advances one row per item, and `((rows - n) * ROW) / 2` **vertically centres the shorter column** against the taller one (if one column has 16 items and the other 10, the 10 are offset by three rows).

```tsx
d={`M ${SPECIES_X + 8} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${RESOURCE_X - 8} ${y2}`}
```

A **cubic Bézier**: start point, two control points, end point. Both control points share the same `x` (`mid = (270 + 620) / 2 = 445`) while taking the start and end `y` respectively. The curve therefore leaves each node horizontally and bends only in the middle — the standard "S-curve" of a bipartite diagram. The `± 8` offsets keep the line from touching the node markers.

### 8.4 Map bounds

```ts
return [[Math.min(...lngs) - 3, Math.min(...lats) - 3],
        [Math.max(...lngs) + 3, Math.max(...lats) + 3]];
```

The **axis-aligned bounding box** of all plotted points, expanded by 3° of padding so markers at the edge are not flush against the frame. It is passed with `{ padding: 60, maxZoom: 6 }`; `maxZoom` matters for the single-species case, where a zero-area box would otherwise zoom to maximum magnification.

---

## 9. Merging three data sources

```ts
function mergeCatalog(remote: Species[]): Species[] {
  const byName = new Map<string, Species>();
  for (const s of CATALOG) byName.set(s.scientific_name.toLowerCase(), { ...s, source: 'catalog' });
  for (const s of remote) {
    const key = s.scientific_name.toLowerCase();
    if (!byName.has(key)) byName.set(key, s);      // curated wins
  }
  return [...byName.values()];
}
```

**Precedence rule:** insert curated data first, then add remote rows **only if the key is absent**. The database contained duplicate rows (Red Panda and Ganges River Dolphin twice) and some wrong photos; this policy de-duplicates and lets the curated record win, while still surfacing species the curated list lacks. The key is `scientific_name`, not `id`, because ids differ across sources — again, **domain identity over storage identity**.

`all = [...scans, ...catalog]` puts the user's own scans first. Scans are intentionally *not* de-duplicated against the catalog: photographing a tiger is a distinct observation, not a duplicate record.

**Readiness flag:** `ready = scansLoaded && remoteLoaded` distinguishes "still loading" from "definitely absent", so the species page can show a skeleton rather than flashing "not found" before data arrives. Note `useState(!supabase)` seeds `remoteLoaded` as already-true when no database is configured — the loading state is skipped entirely when there is nothing to wait for.

---

## 10. Complexity reference

| Operation | Complexity | Notes |
|---|---|---|
| `applyFilters` | `O(n)` per active filter | Up to 4 passes; `n` is small (≈16–40) |
| AI-ranked ordering | `O(n log n)` | Sort after an `O(n)` filter; ranks via `Map` |
| `countByStatus` | `O(n)` | Single fold |
| `findAffected` | `O(n · d)` | `d` = dependencies per species |
| `mergeCatalog` | `O(c + r)` | `Map` insert/lookup is `O(1)` average |
| Graph build | `O(n · d)` | Inverted index |
| Barycentre sort | `O(n log n + n · d)` | Weight computed per comparison candidate |
| `writeScans` eviction | `O(k²)` worst case | `k ≤ 24`; each retry re-serialises |
| Identification request | `O(1)` calls, ≤ 4 network attempts | Bounded: 2 providers × 2 tries |

`writeScans` is quadratic in the worst case (serialise, fail, drop one, serialise again). With `k ≤ 24` and quota exhaustion being rare, the simplicity is worth more than the optimisation. **State the trade-off rather than hiding it** — that is the Unit 1 "scale and methodology" judgement.

---

## 11. Control-flow quick reference

Every non-obvious conditional in the codebase and its reason:

| Location | Condition | Why |
|---|---|---|
| `lib/supabase.ts` | `url && key ? createClient(…) : null` | App must run with no database configured |
| `useCatalog` | `if (!alive) return` | Component unmounted before the fetch resolved |
| `useCatalog` | `if (!byName.has(key))` | Curated entry wins over a remote duplicate |
| `writeScans` | `while (list.length > 0) { try … catch }` | Shrink until the storage quota accepts it |
| `normalizeStatus` | `code in STATUS_META` → else label match → else `'NE'` | Three-tier fallback; never throws on bad data |
| `normalizeHabitat` | `/himalaya|mountain|alpine/i` | Maps legacy database values onto the current vocabulary |
| `applyFilters` | `if (f.aiIds) … else if (f.query)` | AI results replace text search; they must not compound |
| `findAffected` | four separate `if`s (not `else if`) | Reasons accumulate |
| `prepareImage` | `file.type && !startsWith('image/')` | Unknown MIME types are given the benefit of the doubt |
| `route.ts` | `data.is_organism === false` | Strict test: a missing field is not a rejection |
| `route.ts` | `err instanceof AIError && details.length === 0` | Misconfiguration (`503`) vs upstream failure (`502`) |
| `ai.ts` | `providers.length === 0` | Fail immediately with an actionable message |
| `identify()` | `if (id !== requestId.current) return` | Discard a stale response |
| `FieldScannerModal` | `err instanceof TypeError` | Network failure vs HTTP error |
| `SpeciesCard` | nested ternary on `ripple` | Three mutually exclusive visual states |
| `MapBox` | `if (!token)` | Degrade to a message instead of crashing the map library |

---

## 12. Exercises (Kolb cycle, mapped to the units)

**Unit 1 — Declarative vs imperative (CO1).**
Rewrite `applyFilters` as an explicit `for` loop with an accumulator array and manual index handling. Compare line count, and count the places a bug could hide in each version. Then rewrite `writeScans`' eviction loop recursively and argue which style suits which problem.

**Unit 2 — OOP (CO1, CO2).**
Model `Species` as a Java class hierarchy: abstract `Species`, subclasses `CatalogSpecies` and `ScannedSpecies`, with `getDisplayName()` overridden. Implement `Comparable` to sort by threat level, and add a checked `IdentificationException` mirroring `AIError`. Which parts of `findAffected` become methods, and which stay static helpers? Justify the split using encapsulation.

**Unit 3 — Event-driven (CO2, CO3).**
Draw the full state diagram of `FieldScannerModal`, including the "modal closed mid-request" edge. Then implement the same machine in JavaFX with FXML, using an `ExecutorService` for the request and `Platform.runLater` for the UI update. Explain how the `requestId` guard maps onto a task-cancellation API.

**Unit 4 — I/O and interfaces (CO2, CO3).**
Write a command-line version of the identifier: read a file path from `argv`, Base64-encode it, POST to the same endpoint, and print the result. Compare the CUI and GUI versions on control flow — where did the event loop go, and what replaced it?

**Unit 5 — Functional (CO2, CO3).**
Implement `findAffected` in Haskell over `[Species]` using list comprehensions and guards. Show how pattern matching replaces the `?? []` defaults, and how `Maybe` replaces the optional fields. Then express `countByStatus` as a `foldr` and discuss whether laziness changes the result.

**Unit 6 — Multi-paradigm application (CO2, CO3, CO4).**
Evaluate this codebase against the syllabus question "which paradigm best fits which requirement". Specifically: why is the provider fallback procedural, the filtering functional, the scanner event-driven, and the species catalog declarative data? Propose one module that would be *better* in a different paradigm than the one chosen, and defend it.

---

## 13. Known weaknesses (honest assessment)

A paradigms course should also read code critically. These are real:

- **No automated tests.** `findAffected`, `applyFilters`, and the sanitisers are pure functions — the easiest possible things to unit test — and none are tested. This is the single largest gap.
- **`writeScans` can silently store nothing.** If even one scan exceeds the quota, the loop exits with an empty list and the save is lost without notification.
- **Coordinates from the model are a single point**, not a range. A species spanning a continent is drawn as one pin, which overstates precision.
- **`countByStatus` typing.** It returns `Record<string, number>` rather than `Record<StatusCode, number>`, so a typo in a status key would not be caught at compile time.
- **The legacy route** `app/api/semantic-search/identify-species/route.ts` only re-exports the real handler. It exists to avoid breaking old links and should eventually be deleted.
- **Scans are per-browser.** `localStorage` means a scan link cannot be opened on another device. The species page detects this and explains it, but a shared backend would be the real fix.
- **The retry is not exponential.** Two immediate attempts can both hit the same overload window; a short backoff would be better.

---

## 14. Glossary of techniques used

| Technique | Where | One-line definition |
|---|---|---|
| Discriminated union | `Phase` | Tagged sum type; the tag narrows the accessible fields |
| Structural typing | `Species` | Type compatibility by shape, not declaration |
| Chain of responsibility | `generateJson` | Try each handler until one succeeds |
| Memoisation | `remotePromise`, `useMemo` | Cache a computed result against its inputs |
| Publish/subscribe | `keystone:scans-changed` | Writer and readers are decoupled via an event |
| Inverted index | `NetworkView` | Rebuild a mapping keyed by the other side of a relation |
| Barycentre heuristic | `NetworkView` | Order nodes by the mean position of their neighbours |
| Clamping | `num()`, step counter | Force a value into `[min, max]` |
| Promisification | `loadImage` | Wrap a callback API in a `Promise` |
| Stale-response guard | `requestId` | Ignore results from superseded requests |
| Graceful degradation | keyword search, map token | A reduced feature instead of a failure |
| Trust boundary | `app/api/*` | Server-side code holding secrets the client never sees |
