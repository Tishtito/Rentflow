# Deploying the Rentflow web apps

| Host | App | Root on the server |
|---|---|---|
| https://admin.rentflow.codepasstech.top | admin app | `/home/tito/rentflow/frontend/apps/admin/dist` |
| https://rentflow.codepasstech.top | tenant portal | `/home/tito/rentflow/frontend/apps/portal/dist` |

Both hosts hand `/api/` and `/sanctum/` to the Laravel app on the same server, so the browser calls the API
same-origin (first-party login cookie, no CORS). The server, DNS, PHP and API side are set up from the backend
repo's `deploy/` (`../backend/deploy/README.md`): do that first.

| File | Contents |
|---|---|
| `deploy.sh` | builds both apps with `apps/*/.env.production` and rsyncs each `dist/` to the server |
| `nginx/rentflow-admin.conf`, `nginx/rentflow-portal.conf` | the two static sites |

## nginx (first time)

The sites include `snippets/rentflow-common.conf` and `snippets/rentflow-php.conf`, which are installed from the
backend repo (`backend/deploy/nginx/README.md`). Only `dist/` is uploaded, so copy the site files over yourself:

```bash
scp deploy/nginx/rentflow-admin.conf deploy/nginx/rentflow-portal.conf tito@102.212.246.251:/tmp/
# on the server:
sudo mv /tmp/rentflow-admin.conf /tmp/rentflow-portal.conf /etc/nginx/sites-available/
for s in admin portal; do sudo ln -sf /etc/nginx/sites-available/rentflow-$s.conf /etc/nginx/sites-enabled/; done
sudo nginx -t && sudo systemctl reload nginx
```

HTTPS: the `certbot --nginx` command in `backend/deploy/nginx/README.md` covers all three hostnames. After
editing a site later, copy it again and reload; re-run `sudo certbot --nginx` if the 443 block was overwritten.

## Deploy

```bash
./deploy/deploy.sh
```

Creates `apps/{admin,portal}/.env.production` from the `.example` if missing, runs `pnpm install --frozen-lockfile`,
builds `@rentflow/admin` + `@rentflow/portal`, and uploads each `dist/` (`rsync --delete`).
Override the target with `SERVER=user@host REMOTE=/path ./deploy/deploy.sh`.

## CI/CD (GitHub Actions, branch `dev`)

`.github/workflows/dev.yml`: a pull request into `dev` runs the checks (typecheck, lint, test, build); a merge (push) into `dev` runs
them again and, only if they pass, runs `./deploy/deploy.sh` from GitHub, then checks both sites answer. Deploys queue one at a time.

Repo settings → Environments → `dev` (or repository secrets). The server's host key is committed in `deploy/known_hosts`
(update it if the server is rebuilt: `ssh-keyscan 102.212.246.251`, compared with a trusted `known_hosts`).

| Name | Kind | Value |
|---|---|---|
| `DEPLOY_SSH_KEY` | secret | private key of the CI-only key `rentflow-ci` (its `.pub` is in the server's `~tito/.ssh/authorized_keys`) |
| `VITE_GOOGLE_CLIENT_ID` | variable | optional; written into both `.env.production` files (empty = Google button hidden) |

Rotate the key: make a new one (`ssh-keygen -t ed25519 -N '' -C rentflow-ci -f rentflow-ci`), add the `.pub` to
`authorized_keys`, update `DEPLOY_SSH_KEY` in **both** repos, then remove the old line from `authorized_keys`.
`./deploy/deploy.sh` from a laptop still works for a manual deploy.
