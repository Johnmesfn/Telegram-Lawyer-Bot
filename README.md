# 📜 Telegram Lawyer Bot

A **Telegram bot** built with **Node.js**, **MongoDB**, and **Luxon** for managing **legal case deadlines**.  
It helps lawyers and professionals **track cases, deadlines, and reminders** — with **automatic timezone detection** and **smart notifications**.  

---

## ✨ Key Features

- **📂 Case Management**
  - Add, edit, delete, and list cases
  - Prevents duplicate case file numbers per user
  - Expired cases automatically marked as inactive

- **⏰ Smart Notifications**
  - Automatic reminders at **30 days, 7 days, and 1 day** before deadlines
  - Expired cases cleaned up daily
  - Hourly deadline checks for accuracy

- **🌍 Timezone Support**
  - Detects timezone from user’s language code
  - Manual timezone selection available
  - Special handling for **Ethiopian users** 🇪🇹

- **⚙️ User Settings**
  - Toggle notifications on/off  
  - Change timezone anytime  
  - Track user activity  

- **🛡️ Error Handling & Logging**
  - Comprehensive logging in `/logs/access.log`  
  - User-friendly error messages  
  - Global error handling for crashes  

- **🗄️ Database Maintenance Tools**
  - `fixDatabase.js` → fixes null/duplicate file numbers  
  - `recreateCollection.js` → rebuilds cases collection safely  

---

## 🔑 Environment Variables

The bot requires a `.env` file in the project root. Example:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/lawyerBotDB
SESSION_SECRET=your_session_secret_here
````

### 1. Get your **Telegram Bot Token**

1. Open Telegram and search for **@BotFather**.
2. Run `/newbot` and follow the steps.
3. Copy the **HTTP API token** you receive.
4. Paste it into `TELEGRAM_BOT_TOKEN`.

### 2. Set up **MongoDB URI**

* If you use **MongoDB Atlas**:

  1. Create a free cluster at [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
  2. Create a database user and password.
  3. Copy the connection string (something like:
     `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/lawyerBotDB`).
  4. Replace `<username>` and `<password>` in your `.env`.

* If you use **local MongoDB**:

  ```env
  MONGO_URI=mongodb://localhost:27017/lawyerBotDB
  ```

### 3. Generate a secure **SESSION\_SECRET**

The session secret can be any long random string. For example, run this command:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output (64 hex characters) into your `.env` as `SESSION_SECRET`.

---

## 🐳 Run with Docker

### Build and Run (requires MongoDB)

```bash
docker build -t telegram-lawyer-bot .
docker run --env-file .env telegram-lawyer-bot
```

### Run with Docker Compose (bot + MongoDB)

```bash
docker-compose up -d
```

This starts both the **bot** and a **MongoDB container**.

---

## 🛠️ Local Setup (without Docker)

1. **Clone the repo**

   ```bash
   git clone https://github.com/Johnmesfn/Telegram-Lawyer-Bot.git
   cd Telegram-Lawyer-Bot
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Create `.env` file** (see [Environment Variables](#-environment-variables))

4. **(Optional) Fix database issues**

   ```bash
   node fixDatabase.js
   # or
   node recreateCollection.js
   ```

5. **Start the bot**

   ```bash
   node bot.js
   ```

   Or in development mode with auto-reload:

   ```bash
   npm run dev
   ```

---

## 📂 Project Structure

```
models/               # MongoDB models (Case, User, UserSession)
utils/                # Helper utilities (dates, logging, sessions, cleanup)
bot.js                # Main Telegram bot logic
fixDatabase.js        # Script to fix DB issues
recreateCollection.js # Script to rebuild DB
testEthiopianTimezone.js # Timezone test script
Dockerfile            # Docker build file
docker-compose.yml    # Docker Compose setup (optional)
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
Feel free to fork this repository and submit a pull request.

---

## 📜 License

MIT License © 2025
Developed with ❤️ by [Yohannes Mesfin](https://github.com/Johnmesfn)