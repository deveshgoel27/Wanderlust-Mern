# Wanderlust — Interview Kit

Personal reference doc for explaining this project in interviews. Answers below are written the way you'd actually **say them out loud in English** in an interview — read them a few times, don't memorize word-for-word, make them sound like you.

---

## 1. 30-Second Elevator Pitch

> "Wanderlust is a full-stack Airbnb-style listing app I built to learn backend development. Users can sign up, log in, create property listings with images, and leave star-rated reviews on other people's listings. It's built with Node.js, Express, MongoDB/Mongoose, and server-rendered EJS templates. Authentication is session-based using Passport, images are uploaded to Cloudinary instead of local disk, and I followed an MVC structure with centralized error handling and Joi validation."

That one paragraph answers "walk me through a project you built."

---

## 2. Tech Stack (and *why* each piece is there)

| Layer | Technology | Why this, in interview words |
|---|---|---|
| Runtime | Node.js | JS on the server, non-blocking I/O, matches frontend language |
| Framework | Express.js 4 | Minimal, unopinionated, huge ecosystem, easy routing/middleware model |
| Database | MongoDB (Atlas, cloud-hosted) | Document model fits nested data (a listing "has" reviews) naturally; no need for a fixed schema/joins for a project this size |
| ODM | Mongoose | Gives MongoDB actual schemas, validation, middleware/hooks, and `populate()` for relationships in a document DB |
| Templating | EJS + ejs-mate | Server-side rendering; `ejs-mate` adds layout inheritance (one shared `boilerplate.ejs` instead of copy-pasting `<head>`/navbar/footer everywhere) |
| Auth | Passport.js + `passport-local` + `passport-local-mongoose` | Industry-standard auth middleware; the mongoose plugin auto-handles password salting+hashing and gives `register()`/`authenticate()` for free — I never touch raw passwords |
| Sessions | `express-session` + `connect-mongo` | Login state needs to survive server restarts and work across multiple server instances, so sessions are stored in MongoDB, not in server memory |
| Flash messages | `connect-flash` | One-time "Login successful" / "Listing deleted" style messages that survive exactly one redirect |
| Validation | Joi | Validates the *shape of incoming requests* before they ever touch the database — separate concern from Mongoose's schema (which validates what's *stored*) |
| File upload | Multer + `multer-storage-cloudinary` | Multer parses `multipart/form-data`; the Cloudinary storage engine streams the file straight to Cloudinary instead of saving to local disk |
| Image hosting | Cloudinary | Free image CDN with on-the-fly transforms; also avoids relying on local disk storage, which matters on hosts like Render where the filesystem is ephemeral |
| HTTP verbs in HTML forms | `method-override` | Plain HTML forms only support GET/POST, so PUT/DELETE are sent as `POST .../?_method=DELETE` and this middleware rewrites `req.method` |
| Styling | Bootstrap 5 + custom CSS | Fast, responsive grid/components out of the box, customized with brand color (`#fe424d`) and a couple of custom components (review cards, toasts) |
| Icons | Font Awesome | Icon font, used for the navbar, buttons, delete icon, etc. |
| Env config | dotenv | Loads `.env` into `process.env` locally; skipped in production where real host env vars are used instead |

---

## 3. Folder Structure (MVC)

```
app.js                  → app entry point: connects DB, wires up middleware & routes, starts server
CloudConfig.js          → Cloudinary SDK config + Multer storage engine
schema.js               → Joi validation schemas (request-shape validation)

models/                 → Mongoose schemas (the "M" in MVC)
  listing.js
  review.js
  user.js

controllers/             → business logic (what actually happens per route)
  listings.js
  reviews.js
  users.js

routes/                  → Express routers (map HTTP verb + URL → controller)
  listing.js
  review.js
  user.js

views/                   → EJS templates (the "V" in MVC)
  layouts/boilerplate.ejs   → shared page shell (navbar + flash + footer + scripts)
  includes/                 → navbar, footer, flash partials
  listings/                 → index, show, new, edit
  users/                    → login, signup

middleware.js            → cross-cutting checks: isLoggedIn, isOwner, isReviewAuthor, validateListing, validateReview
utils/
  ExpressError.js         → custom Error subclass carrying an HTTP status code
  wrapAsync.js             → wraps async controllers so rejected promises reach Express's error handler

public/
  css/style.css, rating.css
  js/script.js

init/                     → one-off DB seeding script + sample data (dev only, not used in prod)
```

**Why this structure matters (interview answer):** *"I separated routes, controllers, and models so each file has one job — routes just declare 'this URL + this verb maps to this function', controllers hold the actual logic, and models define the data shape. It made it much easier to add the review feature later without touching listing code."*

---

## 4. Data Models

### User (`models/user.js`)
```js
{ email: String }  // + username, hash, salt added automatically by passport-local-mongoose
```
`passport-local-mongoose` is a plugin that bolts on `username`, `hash`, and `salt` fields and gives the model `.register()` and `.authenticate()` static methods — **you never write password-hashing code yourself.**

### Listing (`models/listing.js`)
```js
{
  title: String (required),
  description: String,
  image: { url: String, filename: String },   // Cloudinary URL + public_id
  price: Number,
  location: String,
  country: String,
  reviews: [{ type: ObjectId, ref: 'Review' }],
  owner: { type: ObjectId, ref: 'user' },
}
```
Has a `post("findOneAndDelete")` **Mongoose hook**: when a listing is deleted, it also deletes every Review document referenced in its `reviews` array — so deleting a listing doesn't leave orphaned reviews behind. (Good example if asked "have you used Mongoose middleware/hooks?")

### Review (`models/review.js`)
```js
{
  Comment: String,
  rating: Number (1–5),
  createdAt: { type: Date, default: Date.now },
  author: { type: ObjectId, ref: 'user' },
}
```

**Relationship, in interview words:** *"A Listing has a one-to-many relationship with Reviews. Rather than embedding full review documents, I store an array of ObjectId references and use Mongoose's `.populate()` on the show page to pull in the actual review (and its author) documents — keeps listing documents small and reviews independently queryable/deletable."*

---

## 5. Authentication & Session Flow

1. **Sign up** — `POST /signup` → `User.register(newUser, password)` (passport-local-mongoose hashes+salts the password and saves the user) → `req.login()` immediately logs them in → redirect to `/listings`.
2. **Log in** — `POST /login` → `passport.authenticate("local", {...})` middleware checks username/password against the stored hash → on success, redirects to wherever they originally tried to go (`saveRedirectUrl` middleware remembers that URL), or `/listings` by default.
3. **Log out** — `GET /logout` → `req.logout()` (Passport) destroys the authenticated session.
4. **Session storage** — `express-session` normally keeps sessions in server memory, which is lost on restart and doesn't scale past one server. Instead, sessions are persisted in MongoDB via `connect-mongo`, with a 7-day cookie expiry.
5. **Per-request user** — `passport.serializeUser`/`deserializeUser` store just the user's ID in the session cookie and rehydrate the full user document into `req.user` on every request. `app.js` also copies it to `res.locals.currUser` so every EJS view can check `currUser` without passing it explicitly.

**Common interview Q:** *"How are passwords stored?"* → *"They're never stored in plain text — `passport-local-mongoose` salts and hashes them (PBKDF2 under the hood) before saving, and login compares hashes, not raw passwords."*

---

## 6. Authorization (Middleware)

All in `middleware.js`:

| Middleware | Checks | Used on |
|---|---|---|
| `isLoggedIn` | `req.isAuthenticated()` (Passport) | Any route that requires being logged in |
| `isOwner` | Current user's ID === listing's `owner` | Edit/update/delete listing |
| `isReviewAuthor` | Current user's ID === review's `author` | Delete review |
| `validateListing` / `validateReview` | Joi schema validates `req.body` shape | Create/update listing, create review |

**Defense in depth example (from this project, good story):** the delete-review route was always protected server-side by `isReviewAuthor` — but the *UI* originally showed the delete button to every logged-in user regardless of who wrote the review. Clicking it as a non-author would just get silently redirected by the middleware. Fixed by also hiding the button client-side unless `currUser` matches `review.author` — the server check is the real security boundary, the UI check is just good UX (don't show a button that will just reject you).

---

## 7. Validation & Error Handling Pattern

- **Joi (`schema.js`)** validates incoming `req.body` *before* it reaches Mongoose — e.g. `price` must be a non-negative number, `title`/`description`/`location`/`country` are required strings, review `rating` must be 1–5.
- **`ExpressError`** (`utils/ExpressError.js`) — a small custom class extending `Error`, carrying `statusCode` + `message`, thrown when validation fails.
- **`wrapAsync`** (`utils/wrapAsync.js`) — every async controller gets wrapped in this; it catches any rejected promise and forwards it to `next(err)` instead of needing a `try/catch` in every single controller. Classic DRY pattern for async Express routes.
- **Centralized error handler** — one `app.use((err, req, res, next) => {...})` at the bottom of `app.js` catches everything and renders a friendly `error.ejs` page with the message, instead of the app crashing with a stack trace.

**Real bug + fix worth telling in an interview (great "debugging story"):** `ExpressError`'s constructor originally took `(message, statusCode)`, but every call site in the code called it as `new ExpressError(400, errMsg)` — i.e. arguments in the *opposite* order. That meant `statusCode` ended up holding the *error text* and `message` held the number `400`. When the error handler called `res.status(statusCode)` with a string instead of a number, Node threw `RangeError: Invalid status code` and **crashed the entire process** — not just that one request. Fixed by aligning the constructor's parameter order with how it was actually called everywhere. *(Great answer to "tell me about a tricky bug you fixed" — it shows you can read a stack trace, trace a value back to where it originated, and understand why a wrong type reaching a low-level API (`res.status()`) can bring down a whole Node process instead of just failing one request.)*

---

## 8. Image Upload Flow

1. Form has `enctype="multipart/form-data"` and a `type="file"` input named `listing[image]`.
2. `multer({ storage, limits: { fileSize: 10MB } })` (in `routes/listing.js`) intercepts the upload.
3. `storage` is a `CloudinaryStorage` engine (`CloudConfig.js`) configured with `resource_type: 'auto'` (accepts basically any image format, incl. AVIF/HEIC) targeting a `wanderlust_DEV` folder on Cloudinary.
4. Multer streams the file **directly to Cloudinary** — it never touches the server's local disk.
5. `req.file.path` (secure Cloudinary URL) and `req.file.filename` (Cloudinary public ID) are saved on the listing document.

**Why this matters (interview answer):** *"I upload straight to Cloudinary instead of saving to local disk because most hosting platforms (Render, Heroku, etc.) have an ephemeral filesystem — anything written to disk disappears on redeploy or restart. Using an external object store keeps uploaded images durable regardless of what happens to the server instance."*

---

## 9. Routes Reference

```
GET    /listings                          → index (public)
GET    /listings/new                       → new-listing form   (auth)
POST   /listings                           → create listing     (auth)
GET    /listings/:id                       → show listing       (public)
GET    /listings/:id/edit                  → edit form           (auth + owner)
PUT    /listings/:id                       → update listing      (auth + owner)
DELETE /listings/:id                       → delete listing      (auth + owner)

POST   /listings/:id/reviews               → create review       (auth)
DELETE /listings/:id/reviews/:reviewId     → delete review        (auth + review author)

GET/POST /signup                           → render / handle signup
GET/POST /login                            → render / handle login
GET      /logout                           → log out
```

Note the review routes are mounted with `express.Router({ mergeParams: true })` — without `mergeParams`, the nested review router wouldn't have access to `:id` from the parent `/listings/:id/reviews` mount path.

---

## 10. Environment Variables

| Variable | Purpose |
|---|---|
| `ATLASDB_URL` | MongoDB Atlas connection string — used for both the main DB and the session store |
| `SECRET` | Signs session cookies; also used as the `connect-mongo` crypto secret |
| `CLOUD_NAME` | Cloudinary account cloud name |
| `CLOUD_API_KEY` | Cloudinary API key |
| `API_SECRET_KEY` | Cloudinary API secret |
| `PORT` | Server port (defaults to 8080 locally; Render sets this automatically) |
| `NODE_ENV` | When `"production"`, skips loading `.env` (real env vars come from the host instead) |

`.env` is git-ignored — never committed. Every teammate/deploy target sets these independently.

---

## 11. Running Locally

```bash
npm install
# create a .env file with the variables from section 10
node app.js        # or: npm start (fixed to run app.js — see section 12)
```

---

## 12. Deployment (Render) — what to check

Fixed as part of this cleanup pass:
- **`package.json`'s `start` script pointed at a non-existent `index.js`** (`node index.js`) instead of `app.js`. Render runs `npm start` by default, so this would crash the deploy immediately. Fixed to `"start": "node app.js"`.

Still to verify on the Render dashboard (can't be fixed from code):
- [ ] All 5 env vars from section 10 are set under the Render service's **Environment** tab (`.env` is git-ignored, so nothing from it reaches Render automatically).
- [ ] Set `NODE_ENV=production` on Render.
- [ ] MongoDB Atlas → **Network Access** allows `0.0.0.0/0` (Allow access from anywhere) — Render's outbound IPs aren't static, so a specific-IP allowlist will randomly fail.
- [ ] Build command: `npm install` (default is fine, no frontend build step exists).
- [ ] Start command: `npm start` (now correct) or `node app.js`.

---

## 13. Other Real Bugs Fixed This Session (good "debugging story" material)

1. **Edits silently reverted when uploading a new image at the same time.** `updateListings` called `Listing.findByIdAndUpdate(id, {...})` *without* `{ new: true }`, so the returned document was the **pre-update** version. When a new image was also uploaded, the code then called `.save()` on that stale document — overwriting the just-applied title/price/description/etc. changes with their old values (only the image stuck). Fixed by adding `{ new: true }` so the in-memory document reflects the update before `.save()` runs again.
2. **Every review had the exact same `createdAt` timestamp.** The schema had `default: Date.now()` — calling the function immediately at schema-definition time (once, at server boot) instead of passing `Date.now` (a reference Mongoose calls fresh for every new document). Classic JS gotcha: `Date.now()` vs `Date.now`.
3. **Star-rating widget silently dropped the rating on submit.** The `<fieldset class="starability-checkmark"` tag was missing its closing `>`, so the browser folded the next `<input>` (the hidden default-rating radio) into the fieldset's own opening tag instead of rendering it as a real element. Result: if a user submitted a review without clicking a star, `rating` was missing from the request entirely, tripping Joi's `.required()` — which combined with bug below to crash the server.
4. Compounding the above: the mismatched `ExpressError` argument order (section 7) meant that Joi validation failure didn't show a nice error page — it crashed the whole Node process.

These are honestly great answers to *"tell me about a bug that was hard to track down"* — each one is a real, non-contrived example of tracing a symptom back to a root cause.

---

## 14. Interview Q&A Bank

### General / Project Overview

**Q: Why did you build this project?**
> "I was learning backend development and wanted something bigger than a to-do list — a project with real relationships between users, listings, and reviews, plus auth, file uploads, and a database, close to a real-world CRUD app like Airbnb."

**Q: What was the hardest part?**
> "Getting authorization right — making sure only the owner of a listing can edit/delete it, and only the author of a review can delete their own review, while keeping that logic out of the route/controller files by pulling it into reusable middleware."

**Q: What would you do differently / improve?**
> "A few things: add automated tests (I didn't write any), add pagination and search/filtering on the listings page since right now it loads everything, convert some server-rendered pages into a proper REST API + frontend framework if it needed to scale, and add rate-limiting on login/signup. I'd also add a proper logging library instead of `console.log`."

### Backend / Node / Express

**Q: What is middleware in Express?**
> "A function with `(req, res, next)` that runs in the middle of the request/response cycle — it can inspect or modify the request, end the response early, or call `next()` to pass control to the next handler. I used it for auth checks (`isLoggedIn`, `isOwner`), validation, and centralized error handling."

**Q: How does error handling work in your app?**
> "Async route handlers are wrapped in a `wrapAsync` helper that catches rejected promises and calls `next(err)`. Validation failures throw a custom `ExpressError` with a status code. Everything funnels into one `app.use((err, req, res, next) => {...})` at the end of `app.js`, which renders a single error page — so I don't need try/catch scattered through every controller."

**Q: What does `method-override` do and why do you need it?**
> "HTML forms only support GET and POST natively. To do a proper RESTful update/delete from a plain HTML `<form>`, I send `POST /listings/123?_method=PUT` and the `method-override` middleware rewrites `req.method` to PUT before routing happens."

### MongoDB / Mongoose

**Q: Why MongoDB instead of a SQL database?**
> "The data is naturally document-shaped — a listing 'has' an owner and a list of reviews — and I didn't need complex multi-table joins or strict relational constraints for this project. Mongoose also gave me schema validation and hooks on top of MongoDB's flexibility."

**Q: How do you model relationships in MongoDB?**
> "I store references (ObjectIds) rather than embedding, e.g. `Listing.reviews` is an array of ObjectIds pointing at `Review` documents, and `Listing.owner`/`Review.author` point at `User`. On the show page I use `.populate()` to pull in the actual referenced documents in one query instead of doing manual lookups."

**Q: What's a Mongoose middleware/hook, and have you used one?**
> "Yes — `listingSchema.post('findOneAndDelete', ...)` runs after a listing is deleted and deletes every Review document that belonged to it, so I don't end up with orphaned reviews nobody can reach."

**Q: Difference between Joi validation and Mongoose schema validation?**
> "Joi validates the *shape of the incoming HTTP request* before it touches my business logic at all — e.g. rejecting a request with no title. Mongoose schema validation is a second, DB-level guarantee about what actually gets persisted. Having both means bad data gets rejected as early as possible, but the DB layer isn't relying solely on the API layer to have done its job."

### Auth / Security

**Q: How is authentication implemented?**
> "Passport.js with the `passport-local` strategy, backed by `passport-local-mongoose`, which adds `username`/`hash`/`salt` fields to my User model and handles all password hashing — I never handle raw passwords or write hashing code myself."

**Q: How do sessions work here?**
> "`express-session` creates a signed cookie holding a session ID; the actual session data is stored server-side. Instead of the default in-memory store (which loses everyone's login on a restart and doesn't work across multiple server instances), I used `connect-mongo` to persist sessions in MongoDB."

**Q: What's the difference between authentication and authorization in your app?**
> "Authentication ('who are you') is `isLoggedIn` — just checks if there's a logged-in user at all. Authorization ('are you allowed to do this') is `isOwner`/`isReviewAuthor` — checks if *this specific* logged-in user owns *this specific* resource."

**Q: Any security considerations you handled?**
> "Passwords are hashed, not stored in plaintext. Session secrets and DB/API credentials are kept in environment variables, never committed to git. Ownership checks happen server-side, not just hidden in the UI. I also added a file-size limit on uploads (10MB) to avoid unbounded upload abuse."

### Frontend / Debugging

**Q: Why server-rendered EJS instead of React/a SPA?**
> "For a project this size, server-rendered pages are simpler — no separate API layer, no client-side state management, and it was more important for me to focus on learning backend concepts (routing, auth, DB modeling) than frontend architecture."

**Q: Tell me about a bug you had to debug.**
> (Use any of the 4 bugs from section 13 — pick the `ExpressError` one, it's the meatiest: describe the symptom — a crash with a weird `Invalid status code` error — how you traced it back through the stack trace to `res.status()`, found the value being passed was a string, then traced *that* back to the constructor call order mismatch, and fixed the root cause instead of just symptom-patching.)

---

## 15. Quick Cheat-Sheet (memorize these numbers/names)

- **Stack:** Node.js, Express 4, MongoDB Atlas, Mongoose 8, EJS + ejs-mate, Passport (local strategy), Bootstrap 5
- **Auth:** Passport + passport-local-mongoose (hashing) + express-session/connect-mongo (persistent sessions)
- **File uploads:** Multer → Cloudinary (no local disk storage)
- **Validation:** Joi (request shape) + Mongoose (DB shape)
- **Error handling:** custom `ExpressError` + `wrapAsync` + one centralized error middleware
- **Pattern:** classic MVC — `routes/` → `controllers/` → `models/`, cross-cutting logic in `middleware.js`
