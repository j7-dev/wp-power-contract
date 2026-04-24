# `pipe.yml` 結構速查（power-contract 版）

> 對應檔案：`.github/workflows/pipe.yml`
> **兩個 Job**：`claude`（釐清 → 規劃 → 實作）→ `integration-tests`（測試 → 修復 → AI 驗收 → PR）
> **範本來源**：power-course `.github/workflows/pipe.yml`，已 adapt 至 power-contract 特性。

---

## 一、觸發方式與模式對照

**觸發事件**：`issue_comment` / `pull_request_review_comment` / `pull_request_review`，body 須含 `@claude`。
**Concurrency**：同一 issue/PR 的新 `@claude` 會取消舊的。

### 關鍵字 → 模式對照

| 留言 | 開工（clarifier → tdd） | 整合測試 + AI 驗收 |
|------|------------------------|-------------------|
| `@claude`（需求還需釐清） | ❌ 僅提澄清問題 | ❌ |
| `@claude`（需求已清楚） | ✅ 由 clarifier 自動升級 pipeline 並一路跑到 tdd | ❌ 需再打 `@claude PR` |
| `@claude 開工`（含 確認/OK/沒問題/開始/go/start） | ✅ | ❌ 需再打 `@claude PR` |
| `@claude 全自動` | ✅ | ✅ 自動 |
| `@claude PR` | ❌ 跳過 | ✅ 於現有分支直接跑 |

**解析優先序**：`全自動` > `PR` > `開工等` > 互動。

---

## 二、Job 1：`claude`

**Runner** `ubuntu-latest` / **Timeout** 180 min / **Permissions**：`contents`/`pull-requests`/`issues: write`、`id-token: write`、`actions: read`

### Job Outputs

| output | 意義 |
|--------|------|
| `branch_name` / `issue_num` | 本輪 `issue/{N}-{timestamp}` 分支與 issue 編號 |
| `initial_sha` | 進入 workflow 時的 HEAD（用於偵測變更） |
| `claude_ok` | clarifier + (planner/tdd) 整體成敗；skipped 視為 OK |
| `has_changes` | 是否有 commit 或 working tree 變動 |
| `agent_name` | `clarifier` / `clarifier+planner` / `...+tdd-coordinator` / `pr-only` |
| `pipeline_mode` / `full_auto_mode` / `pr_mode` | 模式旗標 |
| `run_integration_tests` | `full_auto_mode OR pr_mode` → 控制 Job 2 觸發 |

### Steps 流程

| 段 | 核心動作 |
|----|---------|
| **A** 前置 | eyes reaction → checkout → `resolve_branch`（找或建 `issue/{N}-*`）→ HTTPS → `save_sha` |
| **B** 模式解析 | `parse_agent` 設 `PIPELINE_MODE`/`FULL_AUTO_MODE`/`PR_MODE` → `fetch_context`（issue 上下文）→ 組 clarifier prompt（`PR_MODE=true` 則跳過） |
| **C** Clarifier | `claude-retry` composite action，agent=`wp-workflows:clarifier`，`max_turns=200`(pipeline)/`120`(interactive)；`PR_MODE=true` 跳過 |
| **D** 橋接 | `detect_specs`（比對 `specs/` diff）→ `dynamic_upgrade`（interactive + 生成 specs → 升級 pipeline_mode）→ 通知留言 |
| **E** Planner | `specs_available && pipeline_mode` 才跑；agent=`wp-workflows:planner`，`max_turns=120` |
| **F** TDD | `planner_ok=true` 才跑；agent=`wp-workflows:tdd-coordinator`，`max_turns=200` |
| **G** 收尾 | `check_result` 匯整 outputs → 若有變更 `git push --force-with-lease` 兜底推送 |

---

## 三、Job 2：`integration-tests`

**依賴** `needs: claude` / **Timeout** 150 min

### 啟動條件

```yaml
run_integration_tests == 'true' &&
(
  pr_mode == 'true'                           # PR 模式旁路 claude_ok/has_changes
  OR
  (claude_ok == 'true' && has_changes == 'true')
)
```

### Steps 流程

| 段 | 核心動作 |
|----|---------|
| **H** 環境 | checkout(branch_name) → Node 20 / pnpm / composer → 建 uploads → wp-env start（3 次重試，delay 15/45/90s，含 unhealthy 容器 recovery） |
| **I** PHPUnit 3 循環 | `test_cycle_1` 失敗 → `claude_fix_1` → `test_cycle_2` 失敗 → `claude_fix_2` → `test_cycle_3`（final，無修復）。所有步驟 `continue-on-error: true`，路徑 `--env-cwd=wp-content/plugins/power-contract` |
| **J** 彙整 | `final_result` parse PHPUnit summary（`OK (...)` 或 `Tests: ...`）→ 發測試結果留言 |
| **K** AI 驗收 | `detect_smoke` 檢查 diff 有無動到 `js/src/`、`inc/templates/`、`inc/assets/`、`inc/classes/` → **跳過 LC Bypass（plugin.php 已內建 `'lc' => false`）**，僅標記 `.e2e-progress.json` → 建置前端（`pnpm run build`）→ 安裝 CJK 字型 + Playwright chromium → `run_ai_acceptance`（agent=`wp-workflows:browser-tester`） |
| **L** 媒體 | `collect_smoke_media` 集中到 `/tmp/smoke-media` → 上傳 Bunny CDN（`ci/{branch}/smoke-test`）→ Artifact 備份 7 天 → 發 Smoke Test 報告留言（**已修正範本 Gotcha #1：條件指向 `collect_smoke_media`**） |
| **M** PR 守門 | `run_ai_acceptance.outcome != 'failure'` → `自動建立 PR`（gh pr create，body 含測試 badge + AI 驗收 badge + `Closes #N`）；反之發「驗收失敗不自動開 PR」通知 |

### Job Outputs

`final_result_*` 系列：`status` / `cycle` / `fix_count` / `test_total/passed/failures/errors/assertions/skipped/incomplete/warnings`

---

## 四、外部依賴資產

| 類型 | 路徑 |
|------|------|
| Composite action | `./.github/actions/claude-retry` |
| Prompt 模板 | `.github/prompts/{clarifier-pipeline,clarifier-interactive,planner,tdd-coordinator}.md` |
| 留言模板 | `.github/templates/{pipeline-upgrade-comment,test-result-comment,acceptance-comment}.md` |
| Shell script | `.github/scripts/upload-to-bunny.sh` |
| Marketplace | `https://github.com/j7-dev/wp-workflows.git`（提供 4 個 agents） |
| Secrets | `CLAUDE_CODE_OAUTH_TOKEN`、`BUNNY_STORAGE_{HOST,ZONE,PASSWORD}`、`BUNNY_CDN_URL` |

---

## 五、power-contract 特化差異（vs power-course 範本）

| 項目 | power-course | power-contract（本檔案） |
|------|--------------|---------------------------|
| `--env-cwd` 路徑 | `wp-content/plugins/wp-power-course` | `wp-content/plugins/power-contract` |
| LC Bypass | 用 node 修改 `plugin.php`，注入 `'lc' => false`（anchor `'capability' => 'manage_woocommerce',`） | **整段移除**：plugin.php 已內建 `'lc' => false`，僅保留 `.e2e-progress.json` 標記 step |
| 前端建置 | `pnpm run build && pnpm run build:wp` | `pnpm run build`（`build:wp` script 不存在） |
| AI 驗收 prompt | LMS 業務 + Admin SPA + HashRouter 路由 | 簽合約業務 + CPT URL（`edit.php?post_type=contract_template`）+ shortcode 5 種 |
| 預設 port | 8895（`.wp-env.json` 明寫） | 8892 / testsPort 8893（`.wp-env.json` 明寫，與 playwright / CLAUDE.md 對齊） |
| Smoke 報告 step `if` | ❌ 指向 `upload_smoke_media.outputs.has_media`（永遠空） | ✅ 修正為 `collect_smoke_media.outputs.has_media` |

---

## 六、修改自查清單

- [ ] 新增 `env.` / `steps.<id>.outputs.` 引用，名稱是否拼對？
- [ ] 跨 job 走 `needs.<job>.outputs.`，Job 1 `outputs:` 區塊同步新增？
- [ ] Stage gating 改動時，B/D/E/F/G 五段一起看
- [ ] Prompt / 留言模板的 `{{ISSUE_NUM}}` placeholder 有對應？
- [ ] Secrets 是否在 repo settings 備齊？
- [ ] 若 plugin.php 改用其他 LC 設定方式，重新評估 K 段是否要還原 LC Bypass
- [ ] 若 `.wp-env.json` 變更 `port` 欄位，AI 驗收 prompt / `playwright.config.ts` / `tests/e2e/fixtures/test-data.ts` / `.claude/CLAUDE.md` 同步更新
