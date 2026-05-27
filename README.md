# 知愛家教育機構 - 幼生管理平台

## 系統架構

- **前端**：React 19 + Tailwind CSS 4 + shadcn/ui
- **後端**：Express 4 + tRPC 11
- **資料庫**：MySQL / TiDB（透過 Drizzle ORM）
- **檔案儲存**：S3 相容儲存（AWS S3 / MinIO / Cloudflare R2）
- **認證**：自建帳密系統（Email + Password，JWT Session）

## 功能列表

- 儀表板（每日概覽）
- 每日課程記錄
- 幼生打卡（上課/下課/請假）
- 老師請假管理
- 家長溝通記錄
- 意外傷害記錄（含照片上傳）
- 成長檔案
- 統計功能
- 會議記錄
- 幼生名單管理
- 老師名單管理
- 帳號管理（白名單）
- 登入紀錄

## 環境需求

- Node.js 18+
- pnpm 8+
- MySQL 8.0+ 或 TiDB

## 環境變數設定

在專案根目錄建立 `.env` 檔案：

```env
# 資料庫連線（必填）
DATABASE_URL=mysql://user:password@host:3306/database_name

# JWT 密鑰（必填，請使用隨機字串）
JWT_SECRET=your-random-secret-key-at-least-32-chars

# S3 儲存設定（照片上傳功能需要）
S3_ENDPOINT=https://s3.amazonaws.com  # 或 MinIO/R2 的 endpoint
S3_REGION=us-east-1
S3_BUCKET=your-bucket-name
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_PUBLIC_URL=https://your-bucket.s3.amazonaws.com  # 公開存取 URL 前綴（選填）

# 伺服器埠號（選填，預設 3000）
PORT=3000
```

## 安裝與啟動

### 1. 安裝依賴

```bash
pnpm install
```

### 2. 初始化資料庫

確保 `DATABASE_URL` 已正確設定，然後執行：

```bash
pnpm db:push
```

這會自動建立所有需要的資料表。

### 3. 設定管理員帳號

在 `allowed_emails` 資料表中加入允許註冊的 Email：

```sql
INSERT INTO allowed_emails (email, name, role) VALUES ('admin@example.com', '管理員', 'admin');
```

### 4. 開發模式

```bash
pnpm dev
```

瀏覽器開啟 http://localhost:3000

### 5. 生產模式建構

```bash
pnpm build
pnpm start
```

## 部署到各平台

### Railway

1. 建立新專案，連結 Git 倉庫
2. 新增 MySQL 服務，取得 `DATABASE_URL`
3. 在 Settings > Variables 中設定所有環境變數
4. Build Command: `pnpm install && pnpm build`
5. Start Command: `pnpm start`

### Render

1. 建立 Web Service，連結 Git 倉庫
2. Build Command: `pnpm install && pnpm build`
3. Start Command: `pnpm start`
4. 在 Environment 中設定所有環境變數
5. 另外建立 MySQL 資料庫服務

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]
```

### VPS (Ubuntu)

```bash
# 安裝 Node.js 和 pnpm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install -g pnpm

# 安裝 MySQL
sudo apt-get install -y mysql-server

# 部署應用
cd /opt/kindergarten
pnpm install
pnpm build

# 使用 PM2 管理進程
npm install -g pm2
pm2 start dist/index.js --name kindergarten
pm2 save
pm2 startup
```

## 使用者角色

| 角色 | 說明 |
|------|------|
| admin | 管理員，可管理帳號白名單和所有功能 |
| supervisor | 主管，可管理老師名單 |
| user | 一般使用者，可使用基本功能 |

## 首次使用流程

1. 在 `allowed_emails` 表中加入管理員 Email（role 設為 `admin`）
2. 開啟網站，點擊「註冊」
3. 輸入已加入白名單的 Email 和密碼
4. 登入後即可使用所有功能
5. 在「帳號管理」頁面可新增其他使用者的 Email

## Logo 設定

將您的 logo 圖片放在 `client/public/logo.png`，系統會自動使用。

## 注意事項

- 資料庫連線建議啟用 SSL（在 DATABASE_URL 中加入 `?ssl=true`）
- S3 儲存如果不設定，照片上傳功能將無法使用，但其他功能正常
- JWT_SECRET 請使用足夠長度的隨機字串（建議 32 字元以上）
- 生產環境建議使用 HTTPS，cookie 會自動切換為 secure 模式
