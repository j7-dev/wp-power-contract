# `.github/` 目錄架構（power-contract）

> **用途**：本目錄定義 power-contract 的 CI-driven AI Agent Pipeline。架構參照 power-course 範本，已針對 power-contract 特性 adapt。
>
> **核心哲學**：透過 workflow 串接多個 agent（clarifier → planner → tdd-coordinator → browser-tester），agent 之間以 **Git commit**、**GitHub Issue comment**、**step outputs** 為橋樑。

---

## 一、目錄結構

```
.github/
├── workflows/
│   ├── pipe.yml          # 主 pipeline（@claude 觸發）
│   ├── pipe.md           # pipe.yml 的中文規格書（必讀）
│   ├── issue.yml         # Issue 開啟/編輯時自動展開需求（@claude 展開 / dev / 工程）
│   └── act-test.yml      # 本地 act 工具測試用，不發布
├── actions/
│   └── claude-retry/
│       └── action.yml    # claude-code-action 3 次重試包裝（30s / 60s backoff）
├── prompts/              # AI agent 指令模板
│   ├── clarifier-interactive.md   # 互動澄清模式（首輪至少 5 問）
│   ├── clarifier-pipeline.md      # 全自動模式（直接生 specs）
│   ├── planner.md                 # 讀 specs 產實作計畫
│   └── tdd-coordinator.md         # TDD 紅綠重構循環協調
├── templates/            # gh issue comment 用的長文本模板
│   ├── test-result-comment.md     # PHPUnit 結果回報
│   ├── acceptance-comment.md      # AI 驗收 Smoke Test 報告
│   └── pipeline-upgrade-comment.md # 動態升級為 pipeline 模式通知
├── scripts/
│   └── upload-to-bunny.sh         # Bunny CDN 媒體上傳
└── instruction.md        # 本文件
```

---

## 二、Pipeline 整體流程

### Job 1：`claude`（釐清 → 規劃 → 實作）

```
A 前置 → B 模式解析 → C Clarifier → D 橋接（升級 pipeline）
       → E Planner（max_turns=120）→ F TDD（max_turns=200）→ G 收尾
```

### Job 2：`integration-tests`（測試 → 修復 → AI 驗收 → PR）

```
H wp-env start（3 retries）→ I PHPUnit 3 循環（test→fix→test→fix→test）
                          → J 彙整 → K AI 驗收（含前端 build）
                          → L 媒體（Bunny CDN）→ M 自動 PR
```

詳見 `workflows/pipe.md`。

---

## 三、power-contract 特性適配紀錄

| 特性偵測 | 影響 | 採取的做法 |
|---------|------|-----------|
| `plugin.php` 已內建 `'lc' => false`，且**沒有** `'capability' => 'manage_woocommerce'` 那行 | 範本的 LC Bypass step 用該 anchor 修改 plugin.php，會找不到 anchor 而失效 | **移除整段 LC Bypass node script**，僅保留 `.e2e-progress.json` 標記 step（讓 browser-tester 知道授權已停用） |
| `.wp-env.json` 明確指定 `port: 8892` / `testsPort: 8893` | 避免與其他 plugin 的 wp-env 衝突 | AI 驗收 prompt 統一使用 `localhost:8892`；playwright / fixtures / CLAUDE.md 均對齊 8892 |
| 沒有 `pnpm run build:wp` script | 範本 K 段執行 `pnpm run build && pnpm run build:wp` | 改成只跑 `pnpm run build` |
| 前端是 jQuery + TypeScript（**非** React SPA） | 範本 AI 驗收 prompt 講 Refine.dev / HashRouter | 重寫為簽合約業務（5 個 shortcode、CPT contract_template / contract、SignaturePad、html2canvas、WooCommerce 結帳整合） |
| Admin URL 路徑 | 範本用 `?page=power-course#/`（SPA） | 改為 CPT 標準 URL：`edit.php?post_type=contract_template`、`edit.php?post_type=contract`、設定頁 `?page=contract_template_settings` |
| `tests/Integration/` 已存在、`phpunit.xml.dist` 已存在 | I/J 段（PHPUnit）保留 | 路徑 `--env-cwd=wp-content/plugins/power-contract` |
| `specs/` 已存在（含 features/activities/api/entity/clarify/actors） | clarifier-pipeline 保留完整 | 不簡化 |

---

## 四、必備 Secrets（repo settings）

| Secret | 必填 | 用途 |
|--------|------|------|
| `CLAUDE_CODE_OAUTH_TOKEN` | ✅ | Claude Code Action 授權 |
| `GITHUB_TOKEN` | ✅（內建） | comment / PR 寫入 |
| `BUNNY_STORAGE_HOST` | 選（K 段用） | Smoke Test 截圖/影片 CDN 上傳 |
| `BUNNY_STORAGE_ZONE` | 選 | 同上 |
| `BUNNY_STORAGE_PASSWORD` | 選 | 同上 |
| `BUNNY_CDN_URL` | 選 | 回寫留言用的公開 URL |

未設 Bunny 系列 secrets 時，L 段 `upload_smoke_media` 仍會跑（continue-on-error），但 CDN 連結會掛掉，artifact 備份仍可用。

---

## 五、本地測試

```bash
# Windows PowerShell
mkdir -p "$env:TEMP/act-artifacts"
act workflow_dispatch -W .github/workflows/act-test.yml `
  --container-architecture linux/amd64 `
  -P ubuntu-latest=catthehacker/ubuntu:act-latest `
  --container-options "--privileged" `
  --artifact-server-path "C:/Users/$env:USERNAME/AppData/Local/Temp/act-artifacts"
```

`act-test.yml` mock 掉 wp-env / Claude Code，只驗多 job 結構與 artifact 跨 job 傳遞。

---

## 六、TODO / Gotchas（power-contract 專屬）

1. **`.wp-env.json` port 已統一為 8892**：本專案所有 port 引用（`.wp-env.json` / `playwright.config.ts` / `tests/e2e/fixtures/test-data.ts` / `.claude/CLAUDE.md` / AI 驗收 prompt）皆對齊 `8892`；`testsPort` 為 `8893`。未來若要變更，請全域一致更新這 5 個位置。
2. **若日後改用其他 LC 機制**：例如將 `'lc' => false` 改回 `'lc' => true` 並用 capability 控制，需還原範本中的 LC Bypass node script，並確認 anchor line 存在。
3. **PHPUnit `tests/Integration/`**：目前測試類別包含 Contract / ContractTemplate / Settings / Shortcodes 4 個資料夾 + `TestCase.php` 基類；新增測試時遵循 `*Test.php` 命名以便 phpunit autodiscovery。
4. **plugin slug**：composer.json 中是 `zenbuapps/power-contract`，目錄名稱是 `power-contract`（無 `wp-` 前綴），但 `package.json.name` 是 `create-power-contract`（template generator 副作用）。CI 中所有 `--env-cwd` 都用 `wp-content/plugins/power-contract`。
