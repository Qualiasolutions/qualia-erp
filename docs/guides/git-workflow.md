# Git & GitHub — The Qualia Way

> We use Git and GitHub for version control. This guide covers the workflow you'll actually use — no deep Git theory.

---

## The Basics

- **Git** = version control. Tracks changes to your code.
- **GitHub** = where repos are hosted online. Our org: [github.com/qualiasolutions](https://github.com/qualiasolutions)
- **Repo** = a project's codebase (one repo per project)
- **Branch** = an isolated copy of the code where you work without affecting the live site
- **Commit** = a snapshot of your changes with a message describing what you did
- **PR (Pull Request)** = a request to merge your branch into the main branch

---

## The Workflow

```
1. Create a branch → 2. Make changes → 3. Commit → 4. Push → 5. Create PR → 6. Merge → 7. Deploy
```

### 1. Always start on a new branch

**Never work directly on `main` or `master`.** Always create a feature branch:

```bash
# Check what branch you're on
git branch

# Create and switch to a new branch
git checkout -b feature/add-contact-form
```

Branch naming:

- `feature/` — new feature (`feature/client-portal`)
- `fix/` — bug fix (`fix/login-redirect`)
- `refactor/` — code cleanup (`refactor/split-actions`)

### 2. Make your changes

Write code, add files, etc. When you're done with a logical chunk of work, commit it.

### 3. Commit with a clear message

```bash
# See what changed
git status

# Stage your changes
git add app/contact/page.tsx components/contact-form.tsx

# Commit with a descriptive message
git commit -m "feat: add contact form page"
```

**Commit message prefixes we use:**

| Prefix      | Meaning                               | Example                        |
| ----------- | ------------------------------------- | ------------------------------ |
| `feat:`     | New feature                           | `feat: add client portal`      |
| `fix:`      | Bug fix                               | `fix: login redirect loop`     |
| `refactor:` | Code restructure (no behavior change) | `refactor: split actions file` |
| `style:`    | CSS/visual changes                    | `style: update header spacing` |
| `docs:`     | Documentation                         | `docs: update README`          |
| `chore:`    | Config, deps, tooling                 | `chore: update dependencies`   |

### 4. Push your branch

```bash
# First push (creates the branch on GitHub)
git push -u origin feature/add-contact-form

# Subsequent pushes
git push
```

### 5. Create a Pull Request

```bash
# Using GitHub CLI (fastest)
gh pr create --title "feat: add contact form" --body "Adds contact form page with validation and email sending"
```

Or go to GitHub.com → your repo → you'll see a "Compare & pull request" button.

### 6. Merge

After review (or self-review for small changes):

```bash
# Merge via CLI
gh pr merge --squash
```

Or click "Merge" on GitHub.

### 7. Deploy

Merging to main auto-deploys via Vercel. If you need to deploy immediately:

```bash
vercel --prod
```

---

## Daily Commands

These are the Git commands you'll use every day:

```bash
# See what's changed
git status

# See your current branch
git branch

# Switch to an existing branch
git checkout main

# Pull latest changes
git pull

# See recent commits
git log --oneline -10

# See what changed in files
git diff
```

---

## Common Situations

### "I need to start fresh from main"

```bash
git checkout main
git pull
git checkout -b feature/new-thing
```

### "I made changes on the wrong branch"

```bash
# Stash your changes (save them temporarily)
git stash

# Switch to the right branch
git checkout feature/correct-branch

# Apply your saved changes
git stash pop
```

### "My branch is behind main"

```bash
# While on your feature branch
git checkout main
git pull
git checkout feature/my-branch
git merge main
# Resolve any conflicts if they appear
```

### "I need to undo my last commit"

```bash
# Undo the commit but keep the changes
git reset --soft HEAD~1
```

### "I accidentally committed to main"

Don't panic. Tell your lead. They can help you move the commit to a proper branch.

---

## GitHub CLI (gh)

We use the `gh` command-line tool for GitHub operations:

```bash
# Create a PR
gh pr create --title "title" --body "description"

# List PRs
gh pr list

# View a PR
gh pr view 123

# Create a repo
gh repo create qualiasolutions/project-name --private
```

---

## Rules

1. **Never push directly to `main` or `master`.** Always use a feature branch.
2. **Write clear commit messages.** Future-you will thank you.
3. **Commit often.** Small commits are easier to understand and revert.
4. **Pull before you push.** Run `git pull` on main before creating a branch.
5. **Don't commit secrets.** No `.env` files, no API keys in code.
