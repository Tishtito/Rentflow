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
