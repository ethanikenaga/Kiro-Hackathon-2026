# Requirements Document

## Introduction

MustangLink is a Cal Poly-exclusive student platform that consolidates four community hubs -- Rideshare, Lost & Found, Questions, and Opportunities -- into a single authenticated web application. The platform is differentiated by an AI assistant that answers student questions by retrieving and summarizing real posts rather than generating fabricated responses. The MVP targets hackathon delivery using Next.js, Tailwind CSS, Supabase (Postgres + Auth), and the OpenAI API.

## Glossary

- **Platform**: The MustangLink web application as a whole.
- **User**: An authenticated Cal Poly student with a verified @calpoly.edu email address.
- **Hub**: One of the four top-level content sections: Rideshare, Lost & Found, Questions, or Opportunities.
- **Post**: A structured content item submitted by a User within a Hub.
- **Comment**: A reply submitted by a User on an existing Post.
- **AI_Assistant**: The AI-powered chatbot component that retrieves and summarizes existing Posts to answer student questions.
- **Auth_Service**: The Supabase authentication service responsible for verifying User identity.
- **Search_Service**: The component responsible for full-text and filtered search across Posts.
- **Category**: A topic label applied to a Post (e.g., clubs, fraternities, classes, jobs, events).
- **Hub_Schema**: The set of structured fields defined for Posts within a specific Hub.

---

## Requirements

### Requirement 1: User Authentication

**User Story:** As a Cal Poly student, I want to sign in with my school email, so that only verified Cal Poly students can access the platform.

#### Acceptance Criteria

1. WHEN a visitor attempts to access any Hub or Post, THE Auth_Service SHALL redirect the visitor to the login page if no active session exists.
2. WHEN a visitor submits a sign-up form with an email address that does not end in @calpoly.edu, THE Auth_Service SHALL reject the registration and display the message "Only @calpoly.edu email addresses are allowed."
3. WHEN a visitor submits a sign-up form with a valid @calpoly.edu email address and a password of at least 8 characters, THE Auth_Service SHALL create a new User account and send a verification email.
4. WHEN a User clicks the verification link in the confirmation email, THE Auth_Service SHALL activate the User account and redirect the User to the platform home page.
5. WHEN a User submits valid credentials on the login page, THE Auth_Service SHALL establish an authenticated session and redirect the User to the platform home page.
6. IF a User submits invalid credentials on the login page, THEN THE Auth_Service SHALL display the message "Invalid email or password" without revealing which field is incorrect.
7. WHEN a User clicks the sign-out button, THE Auth_Service SHALL invalidate the active session and redirect the User to the login page.

---

### Requirement 2: Hub Navigation

**User Story:** As a student, I want to browse the four community hubs from a single home page, so that I can quickly find the content relevant to me.

#### Acceptance Criteria

1. THE Platform SHALL display a persistent navigation bar containing links to Rideshare, Lost & Found, Questions, and Opportunities on every authenticated page.
2. WHEN a User selects a Hub from the navigation bar, THE Platform SHALL display the list of Posts for that Hub sorted by creation date descending.
3. THE Platform SHALL display the count of active Posts within each Hub on the home page.

---

### Requirement 3: Structured Post Creation

**User Story:** As a student, I want to create posts with structured fields specific to each hub, so that posts are consistent and easy to search.

#### Acceptance Criteria

1. WHEN a User opens the post creation form for the Rideshare Hub, THE Platform SHALL present fields for: origin location, destination location, departure date, departure time, available seats, and optional notes.
2. WHEN a User opens the post creation form for the Lost & Found Hub, THE Platform SHALL present fields for: item name, item description, last seen location, date lost or found, a status selector (Lost / Found), and an optional image upload.
3. WHEN a User opens the post creation form for the Questions Hub, THE Platform SHALL present fields for: question title, question body, and a category selector (clubs, fraternities, classes, housing, campus life, other).
4. WHEN a User opens the post creation form for the Opportunities Hub, THE Platform SHALL present fields for: title, description, opportunity type selector (job, event, item for sale), and optional contact information.
5. WHEN a User submits a post creation form with all required fields populated, THE Platform SHALL persist the Post to the database and display it at the top of the relevant Hub feed.
6. IF a User submits a post creation form with one or more required fields empty, THEN THE Platform SHALL highlight the missing fields and display a validation message without submitting the form.
7. THE Platform SHALL associate every Post with the authenticated User who created it and the UTC timestamp of creation.

---

### Requirement 4: Post Viewing and Comments

**User Story:** As a student, I want to view post details and leave comments, so that I can engage with other students posts.

#### Acceptance Criteria

1. WHEN a User clicks on a Post in a Hub feed, THE Platform SHALL display the full Post detail page including all structured fields, the author display name, the creation timestamp, and all associated Comments.
2. WHEN a User submits a non-empty comment on a Post detail page, THE Platform SHALL persist the Comment and display it below the Post without requiring a full page reload.
3. IF a User attempts to submit an empty comment, THEN THE Platform SHALL prevent submission and display the message "Comment cannot be empty."
4. THE Platform SHALL display Comments in ascending order by creation timestamp on the Post detail page.

---

### Requirement 5: Search and Filtering

**User Story:** As a student, I want to search and filter posts within a hub, so that I can find relevant content quickly.

#### Acceptance Criteria

1. WHEN a User enters a search query in the search bar within a Hub, THE Search_Service SHALL return Posts whose title or description fields contain the query string, using case-insensitive matching.
2. WHEN a User applies a Category filter in the Questions Hub, THE Search_Service SHALL return only Posts tagged with the selected Category.
3. WHEN a User applies a status filter in the Lost & Found Hub, THE Search_Service SHALL return only Posts with the matching status (Lost or Found).
4. WHEN a User applies a date filter in the Rideshare Hub, THE Search_Service SHALL return only Posts with a departure date on or after the selected date.
5. WHEN search or filter parameters are active, THE Platform SHALL display the count of matching Posts above the results list.
6. WHEN a User clears all search and filter inputs, THE Platform SHALL restore the full unfiltered Post list for the active Hub.

---

### Requirement 6: AI Assistant -- Post Retrieval and Summarization

**User Story:** As a student, I want to ask the AI assistant a question and receive a summary based on real posts, so that I get trustworthy, source-backed answers.

#### Acceptance Criteria

1. WHEN a User submits a question to the AI_Assistant, THE AI_Assistant SHALL perform a semantic search across existing Posts and Comments to retrieve the most relevant results before generating a response.
2. WHEN the AI_Assistant generates a response, THE AI_Assistant SHALL include inline references linking to the source Posts used in the summary.
3. WHEN the AI_Assistant generates a response, THE AI_Assistant SHALL base the response exclusively on retrieved Post and Comment content and SHALL NOT introduce information not present in the retrieved content.
4. IF the AI_Assistant retrieves fewer than two Posts with a relevance score above the configured threshold, THEN THE AI_Assistant SHALL respond with "I'm not sure -- there isn't enough information in existing posts to answer this. Try browsing the relevant Hub or posting your question."
5. WHEN a User submits a question to the AI_Assistant, THE AI_Assistant SHALL respond within 10 seconds under normal operating conditions.
6. THE AI_Assistant SHALL be accessible from a persistent chat icon visible on all authenticated pages.

---

### Requirement 7: AI Assistant -- Category Suggestion

**User Story:** As a student, I want the AI assistant to suggest the best hub and category before I post, so that my post reaches the right audience.

#### Acceptance Criteria

1. WHEN a User begins composing a new Post, THE AI_Assistant SHALL analyze the draft title and body text and suggest the most appropriate Hub and Category for the Post.
2. WHEN THE AI_Assistant provides a category suggestion, THE Platform SHALL display the suggestion as a pre-selected but editable value in the Hub and Category selectors.
3. IF the draft title and body contain fewer than 10 characters combined, THEN THE AI_Assistant SHALL not display a category suggestion.

---

### Requirement 8: Post Management

**User Story:** As a student, I want to edit or delete my own posts, so that I can keep my content accurate and up to date.

#### Acceptance Criteria

1. WHEN a User views a Post that the User authored, THE Platform SHALL display Edit and Delete action buttons on the Post detail page.
2. WHEN a User submits an edit to their Post with all required fields populated, THE Platform SHALL update the Post in the database and display the updated content on the Post detail page.
3. WHEN a User confirms deletion of their Post, THE Platform SHALL remove the Post and all associated Comments from the database and redirect the User to the Hub feed.
4. IF a User attempts to edit or delete a Post that the User did not author, THEN THE Platform SHALL return a 403 Forbidden response.

---

### Requirement 9: Responsive UI

**User Story:** As a student accessing the platform from a phone or laptop, I want the interface to be usable on any screen size, so that I can participate from any device.

#### Acceptance Criteria

1. THE Platform SHALL render all pages without horizontal scrolling on viewport widths of 375px and above.
2. THE Platform SHALL display the navigation bar as a collapsible menu on viewport widths below 768px.
3. THE Platform SHALL meet WCAG 2.1 Level AA color contrast requirements for all text and interactive elements.
