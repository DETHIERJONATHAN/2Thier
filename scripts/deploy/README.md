# Temporary Cloud Run deploy mode

This folder provides a temporary deploy workflow for periods where GitHub Actions cannot run.

Goal:

- keep production deploys possible
- keep each deploy traceable
- keep rollback simple
- make the return to GitHub clean later

## Important safety rules

1. Do not deploy a dirty working tree.
2. Create a local git commit before each deploy.
3. Avoid destructive database migrations during this temporary mode.
4. Keep one production deploy per commit.
5. If something looks unclear, stop and inspect before deploying.

## What the scripts do

`manual-cloud-run.ps1`

- checks that `git` and `gcloud` exist
- refuses a dirty worktree by default
- captures the current Cloud Run service state
- builds the Docker image in Cloud Build from the repo `Dockerfile`
- deploys the image to Cloud Run with the same service settings as the GitHub workflow
- runs a health check on `/api/health`
- creates a local git tag when the worktree is clean
- stores deploy metadata in `.git/manual-deploy/`

`rollback-cloud-run.ps1`

- routes 100% of traffic to a chosen Cloud Run revision
- defaults to the previous serving revision from the latest deploy log when possible
- runs a health check
- stores rollback metadata in `.git/manual-deploy/`

## Prerequisites

- `gcloud` installed and authenticated
- access to project `thiernew`
- access to deploy Cloud Run service `crm-api`
- local git repository in a clean state

Useful checks:

```powershell
gcloud auth list
gcloud config list project
git status --short
```

## Normal deploy flow

1. Review the local changes.
2. Commit them locally.
3. Run the manual deploy script.
4. Verify the health check and service URL.
5. Keep the deploy log file path.

Example:

```powershell
git status --short
git add -A
git commit -m "Deploy: <what changed>"
powershell -ExecutionPolicy Bypass -File .\scripts\deploy\manual-cloud-run.ps1
```

Optional override if you really know what you are doing:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy\manual-cloud-run.ps1 -AllowDirtyWorktree
```

That override is not recommended because the deployed source may no longer match a commit.

## Rollback flow

Fastest safe rollback:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy\rollback-cloud-run.ps1
```

If needed, list revisions first:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy\rollback-cloud-run.ps1 -ListRevisions
```

Rollback to a specific revision:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy\rollback-cloud-run.ps1 -Revision crm-api-00012-abc
```

## Where the script stores state

Deploy logs are stored locally in:

```text
.git/manual-deploy/
```

This keeps the logs out of Git while still making rollback and later recovery easier.

## Return to GitHub when billing is fixed

When GitHub Actions is available again:

1. Push the local commits.
2. Push the local deploy tags if you want to preserve them remotely.
3. Prefer pushing to a branch first if you want one last review.
4. Once you push to `main`, the GitHub workflow will deploy again.

Important:

- redeploying the same code later from GitHub is usually fine
- Cloud Run will just create a new revision
- this is not a problem by itself
- the real risk is schema or data drift, not the extra revision

Recommended recovery flow:

```powershell
git push origin <branch>
git push origin --tags
```

Then merge or push to `main` only when you are ready to restore the normal GitHub deploy path.

## Honest limitations

- This mode does not replace remote source control.
- If your machine dies before you push, local-only commits and tags can be lost.
- Rollback is easy for code-only changes and much less safe for destructive database changes.
- The temporary workflow is good for continuity, not as a permanent operating model.
