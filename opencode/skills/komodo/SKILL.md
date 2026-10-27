---
name: komodo
description: Use for Komodo API access, stacks, actions, procedures, resource syncs, deployment failures, stale builds, and production deployment verification. Access is preconfigured on this host through an owner-only credential file and a standalone Python client. No environment variables, Docker, or application container are required.
---

# Komodo

## Access first

Access is configured on this host. Start with the read-only command below.

The client automatically reads `/home/simho/.config/komodo/credentials.json`.
The directory is mode `700`; the file is mode `600` and ignored by the configuration repository.
The key belongs to the `simho` Komodo account, which has administrative access.

Use `scripts/api.py` from this skill directory. It needs only Python 3's standard library.
It needs no environment exports, Docker, `curl`, `jq`, or MCP tool.

Credential precedence:

1. `KOMODO_ADDRESS`, `KOMODO_API_KEY`, and `KOMODO_API_SECRET` in the caller's environment.
2. Missing values from the JSON file named by `KOMODO_CREDENTIALS_FILE`.
3. If that path is unset, missing values from `~/.config/komodo/credentials.json`.

The file uses those same three key names. It must be owned by the current user with owner-only permissions, such as mode `600`.

For this home server, Core currently runs on `rbpi`; the known endpoint is `http://rbpi.lan:9120`.
The credential file supplies this address. Use HTTPS outside a trusted private network.

Verify access with a read-only request. Filter the response before tool output reaches the transcript:

```bash
python3 ~/.config/opencode/skills/komodo/scripts/api.py read ListStacks '{}' \
  | python3 -c 'import json,sys; print(json.dumps([{k:x.get(k) for k in ("id","name")} | {"state":x.get("info",{}).get("state")} for x in json.load(sys.stdin)],indent=2))'
```

If access fails:

1. Check the credential file's presence, owner, and permissions.
2. Check environment overrides by name only.
3. Verify DNS and network access to the configured endpoint.
4. Distinguish missing credentials, HTTP authorization errors, and connection failures.
5. If the credential file is absent, report its path and the failed check.
6. If a mutation times out, inspect updates before retrying. The server may have accepted the operation.

Keep credentials in the owner-only store, out of command arguments, logs, transcripts, and source control.

## API contract

The standalone client accepts:

```text
python3 scripts/api.py <read|write|execute> <Operation> '[JSON params]'
```

This installation uses `POST /read`, `/write`, or `/execute` with a `{"type":"Operation","params":{}}` body.
It uses `X-Api-Key` and `X-Api-Secret` headers.
Verify operation schemas in the installed client or current official Komodo documentation.
The local client currently exists at `/home/simho/projects/net-worth-estimator/tmp/node_modules/komodo_client/dist/types.d.ts`.

Useful read operations:

| Operation | Params | Evidence |
| --- | --- | --- |
| `ListStacks` | `{}` | Stack names, IDs, states |
| `GetStack` | `{"stack":"NAME"}` | Active config, deployed Compose, resolved build contexts |
| `ListActions` | `{}` | Action names and run states |
| `GetAction` | `{"action":"NAME"}` | Active action source, not merely the source file on disk |
| `ListProcedures` | `{}` | Procedure states and next scheduled runs |
| `ListResourceSyncs` | `{}` | Sync source, state, last synced commit |
| `GetResourceSync` | `{"sync":"NAME"}` | Sync configuration and pending changes |
| `ListUpdates` | `{}` | Recent operation records under `.updates` |
| `GetUpdate` | `{"id":"ID"}` | Completion, success, per-stage logs |

Safe update inspection:

```bash
python3 ~/.config/opencode/skills/komodo/scripts/api.py read ListUpdates '{}' \
  | python3 -c 'import json,sys; print(json.dumps([{k:x.get(k) for k in ("id","operation","start_ts","status","success","target")} for x in json.load(sys.stdin)["updates"]],indent=2))'
```

Deployment logs, action source, and `.info.deployed_config` can contain secrets.
Filter responses to the required fields, such as build references or stage outcomes.

## Diagnose before changing production

1. Read `/home/simho/home-server/AGENTS.md` and narrower instructions.
2. Read the live stack, action, procedure, sync, and relevant update records.
3. Distinguish app commits from infrastructure commits. A stack's `deployed_hash` can identify the Compose repository, not app source.
4. Compare requested app SHA, resolved build contexts, build logs, and recorded built SHA.
5. Check active operations before deploying. Wait for an in-flight deployment before starting another.

Managed runtime files can live in Komodo checkouts on another host.
Use mount information and API evidence to establish actual paths.

## Deployment workflow

Keep the repository source and live resource configuration consistent.

Common execute operations and verified parameter shapes:

```text
PullRepo    {"repo":"home-server"}
RunSync     {"sync":"servers"}
RunAction   {"action":"NAME","args":{}}
DeployStack {"stack":"NAME"}
```

`RunSync` can apply changes to multiple resources. Inspect its scope and pending changes before execution.
The normal deployment procedure runs every 30 minutes. A push alone does not prove sync or deployment.

1. Push the reviewed infrastructure change.
2. Establish required non-secret variables before syncing resources that reference them.
3. Pull the linked repo and sync the required resource configuration through Komodo.
4. Read the live action and stack again. Verify they contain the intended change.
5. Run the action or stack deployment through Komodo.
6. Track its update ID until `status` is `Complete`. Require `success: true`.
7. If an action starts a deployment, verify the child deployment update as well.
8. Verify exact build inputs, running services, and HTTP health after deployment.

Use Komodo for managed-service lifecycle operations; Docker inspection provides additional runtime evidence.
If an operation fails, inspect its failed stages before retrying.

## Known failure modes

- **Wrong action source:** `komodo/actions.toml` can define inline action code independently of `komodo/actions/*.js`.
  Updating the script alone does not prove the synced action changed. Compare `GetAction.config.file_contents` after sync.
- **Serialization drift:** This installation preserved doubled regex backslashes from TOML in live action code.
  Check raw inline code, parsed TOML, and live source. Prefer escape-free expressions where practical.
- **Pinned old app:** A successful deploy can rebuild an old commit while bookkeeping records current GitHub HEAD.
  Require immutable app build contexts and verify them before recording success.
- **Repo checkout overwrites edits:** `DeployStack` can check out the linked repo before Compose executes.
  A prior `WriteStackFileContents` edit is not a durable pin in this setup.
- **No rebuild:** Build-context services require `run_build = true`. Restart preserves the existing image and environment.
- **False completion:** An accepted request or green action is insufficient. Check the deployment, image inputs, and health.

Net-worth-specific contract: `NET_WORTH_BUILD_SHA` requests the next exact app commit.
`NET_WORTH_BUILT_SHA` records the verified completed build. They serve different purposes.
`GetStack.info.deployed_config` contains the output of `docker compose config`, including expanded build references.
The net-worth action verifies both app contexts and repairs stale deployments even when bookkeeping already matches HEAD.

## Completion

Report the deployed app SHA, infrastructure commit, deployment update ID, and health results.
State any verification gap directly. A clean Git tree, pushed commits, synced config, and healthy production are separate outcomes.

Official references: https://komo.do/docs/deploy/compose and https://komo.do/docs/configuration/variables.
