# Implementation Plan: MustangLink

## Overview

Build MustangLink as a Next.js App Router application backed by Supabase (Postgres + Auth + pgvector) and the OpenAI API. Tasks are ordered foundation-first: project scaffolding → auth → data layer → hub pages → AI features → polish. Each task is scoped to roughly 1–2 hours of focused work.

## Tasks

- [x] 1. Scaffold the Next.js project and install dependencies
  - Run `npx create-next-app@latest mustang-link --typescript --tailwind --app --src-dir=false` (or equivalent)
  - Install runtime dependencies: `@supabase/ssr`, `@supabase/supabase-js`, `openai`, `lucide-react`
  - Install dev/test dependencies: `fast-check`, `vitest`, `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
  - Create `vitest.config.ts` with jsdom environment and path aliases matching `tsconfig.json`
  - Add `.env.local` with placeholder keys: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`
  - _Requirements: all_

- [x] 2. Configure Supabase client utilities and middleware
  - [x] 2.1 Create `lib/supabase/server.ts` exporting `createServerClient()` using `@supabase/ssr` (reads cookies for Server Components and Route Handlers)
    - _Requirements: 1.1, 1.5_
  - [x] 2.2 Create `lib/supabase/client.ts` exporting `createBrowserClient()` using `@supabase/ssr` (for Client Components)
    - _Requirements: 1.5_
  - [x] 2.3 Create `middleware.ts` at the project root that refreshes the Supabase session cookie on every request and redirects unauthenticated users to `/login` for all protected routes
    - _Requirements: 1.1_

- [x] 3. Set up the Supabase database schema
  - [x] 3.1 Write and apply the SQL migration that enables `pgvector`, creates the `profiles` table, and installs the `handle_new_user` trigger
    - _Requirements: 1.3, 3.7_
  - [x] 3.2 Write and apply the SQL migration that creates the `posts` table with the `hub` check constraint, `metadata` JSONB column, `embedding vector(1536)` column, and both indexes (`posts_hub_created_at_idx`, `posts_embedding_idx` using ivfflat)
    - _Requirements: 2.2, 3.1–3.5_
  - [x] 3.3 Write and apply the SQL migration that creates the `comments` table with its index
    - _Requirements: 4.1–4.4_
  - [x] 3.4 Write and apply the SQL migration that enables RLS and creates all policies for `profiles`, `posts`, and `comments`
    - _Requirements: 8.4_
  - [x] 3.5 Write and apply the SQL migration that creates the `match_posts` pgvector similarity search function
    - _Requirements: 6.1_
  - [x] 3.6 Create `lib/types.ts` with the `Hub` union type and `Post`, `Comment` TypeScript interfaces matching the schema
    - _Requirements: 3.1–3.5_

- [x] 4. Implement email validation and the sign-up API route
  - [x] 4.1 Create `lib/auth.ts` with a `validateCalPolyEmail(email: string): { valid: boolean; error?: string }` function that returns an error for any email not ending in `@calpoly.edu`
    - _Requirements: 1.2_
  - [ ]* 4.2 Write property test for `validateCalPolyEmail` (P1)
    - **Property 1: Non-@calpoly.edu emails are always rejected**
    - Use `fc.emailAddress()` filtered to exclude `@calpoly.edu` — every generated email must return `valid: false`
    - Also verify valid `@calpoly.edu` addresses return `valid: true`
    - **Validates: Requirements 1.2**
    - File: `lib/__tests__/auth.test.ts`
  - [x] 4.3 Create `app/api/auth/signup/route.ts` that validates the email domain with `validateCalPolyEmail`, returns HTTP 400 with the required message on failure, and calls `supabase.auth.signUp()` on success
    - _Requirements: 1.2, 1.3_

- [x] 5. Build the authentication pages
  - [x] 5.1 Create `app/login/page.tsx` with an email + password form; on submit call `supabase.auth.signInWithPassword()`, redirect to `/` on success, and display "Invalid email or password" on failure
    - _Requirements: 1.5, 1.6_
  - [x] 5.2 Create `app/signup/page.tsx` with an email + password form that POSTs to `/api/auth/signup`; display the API error message on failure and a "Check your email" confirmation on success
    - _Requirements: 1.2, 1.3_
  - [x] 5.3 Add a sign-out button (calls `supabase.auth.signOut()` and redirects to `/login`) to the `<NavBar />` component
    - _Requirements: 1.7_

- [x] 6. Build the persistent NavBar and home page
  - [x] 6.1 Create `components/NavBar.tsx` as a Client Component with links to `/rideshare`, `/lost_found`, `/questions`, `/opportunities`, and the sign-out button; collapse to a hamburger menu below 768px using Tailwind responsive classes
    - _Requirements: 2.1, 9.2_
  - [x] 6.2 Create `app/page.tsx` as a Server Component that fetches the post count per hub from Supabase and renders four hub cards linking to each hub feed
    - _Requirements: 2.3_

- [x] 7. Implement the hub feed page
  - [x] 7.1 Create `app/[hub]/page.tsx` as a Server Component that fetches posts for the hub sorted by `created_at desc` and renders them as a list of post cards with title, author, and timestamp
    - _Requirements: 2.2_
  - [ ]* 7.2 Write property test for hub feed sort order (P2)
    - **Property 2: Hub feed is always sorted newest-first**
    - Use `fc.array(fc.record({ created_at: fc.date() }), { minLength: 2 })` — after sorting, no adjacent pair shall be out of descending order
    - **Validates: Requirements 2.2**
    - File: `lib/__tests__/posts.test.ts`
  - [x] 7.3 Create `components/SearchBar.tsx` as a controlled Client Component that accepts an `onSearch` callback and renders a text input
    - _Requirements: 5.1_
  - [x] 7.4 Add client-side search filtering to the hub feed: filter posts whose `title` or `body` contains the query string (case-insensitive) and display the matching count above the list
    - _Requirements: 5.1, 5.5_
  - [ ]* 7.5 Write property tests for search correctness and count accuracy (P8, P10)
    - **Property 8: Search results always contain the query string (case-insensitive)**
    - **Property 10: Displayed result count always equals actual result count**
    - Use `fc.string()` and `fc.array(postArbitrary)` — every returned post must contain the query; count must equal array length
    - **Validates: Requirements 5.1, 5.5**
    - File: `lib/__tests__/search.test.ts`
  - [x] 7.6 Add hub-specific filter controls to the feed page: Category selector for Questions, Status selector for Lost & Found, departure date picker for Rideshare; display matching count and a "Clear filters" button
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6_
  - [ ]* 7.7 Write property tests for filter exclusivity and filter round-trip (P9, P11)
    - **Property 9: Category, status, and date filters are always exclusive**
    - **Property 11: Clearing filters restores the full unfiltered post list**
    - Use `fc.constantFrom(...categories)` and `fc.array(postArbitrary)` for P9; `fc.record({ category, status, date })` for P11
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.6**
    - File: `lib/__tests__/search.test.ts`

- [x] 8. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement post creation
  - [x] 9.1 Create `lib/validation.ts` with a `validatePostForm(hub: Hub, fields: Record<string, unknown>): { valid: boolean; errors: Record<string, string> }` function that checks all required fields per hub
    - _Requirements: 3.1–3.6_
  - [ ]* 9.2 Write property test for form validation (P3)
    - **Property 3: Form validation rejects any missing required field**
    - Use `fc.subarray(requiredFields)` — for any non-empty subset of required fields left blank, `validatePostForm` must return `valid: false` and list each blank field in `errors`
    - **Validates: Requirements 3.6**
    - File: `components/__tests__/PostForm.test.tsx`
  - [x] 9.3 Create `components/PostForm.tsx` as a Client Component that renders hub-specific fields based on the `hub` prop, calls `validatePostForm` on submit, highlights invalid fields, and POSTs to `/api/posts`
    - _Requirements: 3.1–3.6_
  - [x] 9.4 Create `app/api/posts/route.ts` (POST handler) that verifies the session, inserts the post into Supabase with `user_id` and `created_at`, and returns the created post; trigger embedding generation as a background call (do not await before responding)
    - _Requirements: 3.5, 3.7_
  - [ ]* 9.5 Write property test for post author and timestamp (P4)
    - **Property 4: Every post is stamped with the correct author and UTC timestamp**
    - Use `fc.uuid()` and `fc.string()` — the persisted post must have `user_id` equal to the session user and `created_at` must be a valid ISO UTC timestamp
    - **Validates: Requirements 3.7**
    - File: `app/api/__tests__/posts.test.ts`
  - [x] 9.6 Create `app/[hub]/new/page.tsx` that renders `<PostForm hub={hub} />` and redirects to the hub feed on successful submission
    - _Requirements: 3.1–3.5_

- [x] 10. Implement post detail page and comments
  - [x] 10.1 Create `app/[hub]/[id]/page.tsx` as a Server Component that fetches the post (with author profile) and all comments (sorted ascending by `created_at`) and renders the full detail view including Edit/Delete buttons for the author
    - _Requirements: 4.1, 4.4, 8.1_
  - [ ]* 10.2 Write property test for comment sort order (P7)
    - **Property 7: Comments are always displayed in ascending timestamp order**
    - Use `fc.array(fc.record({ created_at: fc.date() }), { minLength: 2 })` — after sorting, no adjacent pair shall be out of ascending order
    - **Validates: Requirements 4.4**
    - File: `lib/__tests__/comments.test.ts`
  - [x] 10.3 Create `lib/validation.ts` additions: add `validateComment(body: string): { valid: boolean; error?: string }` that rejects empty or whitespace-only strings
    - _Requirements: 4.3_
  - [ ]* 10.4 Write property test for whitespace comment rejection (P6)
    - **Property 6: Whitespace-only comments are always rejected**
    - Use `fc.string().filter(s => s.trim() === '')` — every generated whitespace-only string must return `valid: false`
    - **Validates: Requirements 4.3**
    - File: `lib/__tests__/validation.test.ts`
  - [x] 10.5 Create `app/api/comments/route.ts` (POST handler) that verifies the session, validates the comment body with `validateComment`, inserts the comment, and returns the created comment with the author's display name
    - _Requirements: 4.2, 4.3_
  - [ ]* 10.6 Write property test for comment persistence (P5)
    - **Property 5: Any non-empty comment is persisted and retrievable**
    - Use `fc.string({ minLength: 1 })` — every non-empty string submitted must be returned when querying comments for that post (mock Supabase client)
    - **Validates: Requirements 4.2**
    - File: `app/api/__tests__/comments.test.ts`
  - [x] 10.7 Add a comment form Client Component to the post detail page that POSTs to `/api/comments` and appends the new comment to the list without a full page reload
    - _Requirements: 4.2, 4.3_

- [x] 11. Implement post edit and delete
  - [x] 11.1 Create `app/[hub]/[id]/edit/page.tsx` that renders `<PostForm hub={hub} initialValues={post} />` pre-populated with the existing post data
    - _Requirements: 8.1, 8.2_
  - [x] 11.2 Create `app/api/posts/[id]/route.ts` with a PUT handler that verifies the session, updates the post via Supabase (RLS enforces author-only), returns 403 if Supabase returns 0 rows, and re-triggers embedding generation
    - _Requirements: 8.2, 8.4_
  - [ ]* 11.3 Write property test for edit persistence (P16)
    - **Property 16: Post edits are always persisted correctly**
    - Use `fc.record({ title: fc.string({ minLength: 1 }), body: fc.string() })` — after a valid PUT, the returned post must reflect the submitted field values
    - **Validates: Requirements 8.2**
    - File: `app/api/__tests__/posts.test.ts`
  - [x] 11.4 Add a DELETE handler to `app/api/posts/[id]/route.ts` that deletes the post (cascade removes comments via FK), returns 403 if Supabase returns 0 rows, and returns 204 on success
    - _Requirements: 8.3, 8.4_
  - [ ]* 11.5 Write property test for cascade delete (P17)
    - **Property 17: Deleting a post always removes all associated comments**
    - Use `fc.array(commentArbitrary)` — after deletion, querying comments for that `post_id` must return an empty array (mock Supabase client)
    - **Validates: Requirements 8.3**
    - File: `app/api/__tests__/posts.test.ts`
  - [ ]* 11.6 Write property test for 403 on non-author edit/delete (P18)
    - **Property 18: Non-authors always receive 403 on edit or delete**
    - Use `fc.uuid()` for non-author user IDs — any PUT or DELETE request where the session user ID differs from `post.user_id` must return HTTP 403
    - **Validates: Requirements 8.4**
    - File: `app/api/__tests__/posts.test.ts`

- [x] 12. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Implement embedding generation
  - [x] 13.1 Create `lib/embeddings.ts` with a `generatePostEmbedding(post: Post): Promise<number[]>` function that concatenates `{hub}: {title}\n{body}\n{JSON.stringify(metadata)}` and calls `openai.embeddings.create` with `text-embedding-3-small`
    - _Requirements: 6.1_
  - [x] 13.2 Wire `generatePostEmbedding` into the POST and PUT handlers in `app/api/posts/route.ts` and `app/api/posts/[id]/route.ts` as a background call (fire-and-forget `void generatePostEmbedding(...).then(...)`) that updates the `embedding` column after the response is sent
    - _Requirements: 6.1_

- [x] 14. Implement the AI Ask route (RAG pipeline)
  - [x] 14.1 Create `app/api/ai/ask/route.ts` that: (1) verifies the session, (2) embeds the user question with `text-embedding-3-small`, (3) calls `match_posts` via Supabase RPC with `similarity_threshold=0.75` and `match_count=5`, (4) returns the fallback message if fewer than 2 posts are above threshold, (5) otherwise calls `gpt-4o-mini` with the summarization prompt and returns `{ answer, sources }`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [ ]* 14.2 Write property test for AI response citations (P12)
    - **Property 12: AI responses always include source post references**
    - Use `fc.array(postArbitrary, { minLength: 2 })` — for any set of ≥2 retrieved posts, the generated answer string must contain at least one `[Post: ...]` citation matching a title from the retrieved set (mock OpenAI client)
    - **Validates: Requirements 6.2**
    - File: `lib/__tests__/ai.test.ts`
  - [ ]* 14.3 Write property test for AI fallback on insufficient context (P13)
    - **Property 13: Insufficient context always triggers the fallback message**
    - Use `fc.array(postArbitrary, { maxLength: 1 })` — when fewer than 2 posts are above threshold, the route must return the fallback string and must NOT call the chat completions API
    - **Validates: Requirements 6.4**
    - File: `lib/__tests__/ai.test.ts`

- [x] 15. Implement the AI category suggestion route
  - [x] 15.1 Create `app/api/ai/suggest-category/route.ts` that verifies the session, calls `gpt-4o-mini` with the structured suggestion prompt, and returns `{ hub, category }` as JSON; return 400 if `title.length + body.length < 10`
    - _Requirements: 7.1, 7.3_
  - [ ]* 15.2 Write property tests for category suggestion thresholds (P14, P15)
    - **Property 14: Suggestion is always returned for drafts with ≥ 10 characters**
    - **Property 15: No suggestion for drafts with < 10 characters**
    - Use `fc.string({ minLength: 10 })` for P14 and `fc.string({ maxLength: 9 })` for P15 (mock OpenAI client)
    - **Validates: Requirements 7.1, 7.3**
    - File: `lib/__tests__/ai.test.ts`
  - [x] 15.3 Create `components/CategorySuggest.tsx` — a hook + UI component that debounces calls to `/api/ai/suggest-category` by 600ms, only fires when `title.length + body.length >= 10`, and pre-selects (but keeps editable) the returned hub and category values in `<PostForm />`
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 16. Build the AI chat drawer
  - [x] 16.1 Create `components/AIChatDrawer.tsx` as a Client Component: a slide-in panel with a message list, a text input, and a submit button; on submit POST to `/api/ai/ask` and append the `{ answer, sources }` response to the message list; show a loading spinner while waiting
    - _Requirements: 6.1, 6.2, 6.5, 6.6_
  - [x] 16.2 Add a persistent chat icon button to `<NavBar />` that toggles `<AIChatDrawer />` open/closed; the drawer must be accessible from all authenticated pages
    - _Requirements: 6.6_

- [x] 17. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 18. Responsive UI polish and accessibility
  - [x] 18.1 Audit all pages for horizontal overflow at 375px viewport width using browser DevTools; fix any overflowing elements with Tailwind `overflow-x-hidden`, `w-full`, or `max-w-*` utilities
    - _Requirements: 9.1_
  - [x] 18.2 Verify the NavBar hamburger menu collapses correctly below 768px and that all hub links and the sign-out button are reachable in the collapsed state
    - _Requirements: 9.2_
  - [x] 18.3 Check color contrast ratios for all text and interactive elements using a contrast checker; update Tailwind color classes to meet WCAG 2.1 Level AA (4.5:1 for normal text, 3:1 for large text and UI components)
    - _Requirements: 9.3_
  - [x] 18.4 Add `aria-label` attributes to icon-only buttons (chat icon, hamburger, delete), ensure all form inputs have associated `<label>` elements, and verify keyboard navigation order is logical on all pages
    - _Requirements: 9.3_

- [x] 19. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; the hackathon priority properties are P1, P3, P8, P13, and P18 as noted in the design document.
- Each task references specific requirements for traceability.
- Checkpoints at tasks 8, 12, 17, and 19 ensure incremental validation throughout the build.
- Property tests use `fast-check` with `numRuns: 100` and the tag format `// Feature: mustang-link, Property {N}: {property_text}`.
- The `match_posts` SQL function must be deployed to Supabase before task 14 can be tested end-to-end.
- Image upload for Lost & Found (Supabase Storage) is wired through the `metadata.image_url` field; the upload itself can be handled client-side with `supabase.storage.from('images').upload(...)` inside `<PostForm />`.
