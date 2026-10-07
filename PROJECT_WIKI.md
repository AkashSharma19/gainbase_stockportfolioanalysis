# Gainbase Project Wiki

Welcome to the **Gainbase** Project Wiki. This document serves as the comprehensive, single source of truth for the architecture, file organization, state management, and business logic of the Gainbase iOS portfolio tracking and personal finance application.

---

## 🗺️ Table of Contents

- [1. Overview & Architecture](#1-overview--architecture)
- [2. Directory & File Mapping](#2-directory--file-mapping)
- [3. Application Modes & Flow](#3-application-modes--flow)
- [4. State Management (Zustand Stores)](#4-state-management-zustand-stores)
- [5. Business Logic & Financial Calculations](#5-business-logic--financial-calculations)
- [6. Background Fetch, Cloud Sync & OTA Updates](#6-background-fetch-cloud-sync--ota-updates)
- [7. Maintenance Protocol for AI Agents](#7-maintenance-protocol-for-ai-agents)

---

## 1. Overview & Architecture

**Gainbase** is an iOS & Android application built using **React Native** (0.86.3) and **Expo** (~57.0.20) with the **Expo Router** file-based navigation. It is designed to combine portfolio investment tracking with cash-flow/personal budget management and Over-The-Air (OTA) continuous deployment. 

### High-Level Architecture Diagram
```mermaid
graph TD
    AppRouter["Expo Router (app/)"] -->|Determines active mode| HomeScreen["AppHomeScreen (app/(tabs)/index.tsx)"]
    HomeScreen --> AppSwitcher["AppSwitcher (components/)"]
    
    subgraph Zustand Stores (AsyncStorage Persisted)
        PortfolioStore["usePortfolioStore (store/)"]
        MoneyStore["useMoneyStore (store/)"]
        AppModeStore["useAppModeStore (store/)"]
    end
    
    subgraph Core Features
        InvestmentsMode["Investments Tracker Mode"]
        MoneyMode["Money Manager Mode"]
    end
    
    AppModeStore -->|activeMode: 'investments' | InvestmentsMode
    AppModeStore -->|activeMode: 'money' | MoneyMode
    
    InvestmentsMode -.->|Reads state| PortfolioStore
    MoneyMode -.->|Reads state| MoneyStore
    
    PortfolioStore -->|Calculates XIRR & Projections| FinanceLib["Finance Library (lib/finance.ts)"]
    PortfolioStore -->|Calculates Health Grade| HealthHook["usePortfolioHealth (hooks/)"]
    PortfolioStore -->|Calculates Recommendations| InsightsHook["useInsights (hooks/)"]
    
    subgraph Continuous Deployment
        EASCloud["EAS Update CDN (Expo)"] -->|OTA Bundle Updates| AppUpdate["AppUpdateCard (components/AppUpdateCard.tsx)"]
    end
end
```

---

## 2. Directory & File Mapping

Here is the functional map of the directory tree and key files:

| `app/` | File-based navigation routes & screens. | `_layout.tsx` (Root Stack Config, registers background task, cloud-backup route), `reorder-accounts.tsx` (Minimalist full-page Account Categories & Accounts Reorder studio with dynamic safe top insets, section up/down shifts, and nested account controls), `manage-categories.tsx` (Streamlined full-page Category Management with reorder toggle mode, bottom-right floating hover add category action button [FAB], in-tree bottom sheet drawer overlay for adding and editing categories with cross-platform `KeyboardAvoidingView` [`Platform.OS === 'ios' ? 'padding' : 'height'`], and full-page Choose Icon picker modal), `settings.tsx` (Settings & Preferences screen with Theme selector, Currency symbol toggle, and Over-The-Air `AppUpdateCard`), `analytics.tsx` (Investments analytics dashboard with 3D icons across dimensions and Money Manager broker brand logos hydrated for Broker dimension), `money-analytics.tsx` (Uncluttered cash flow analytics with dynamic monthly/quarterly/yearly period navigator, streamlined 3-tab navigation for `Expense`, `Income`, and `Surplus`, interactive category drill-down routing to filtered transaction logs, category breakdown with 3D category icons and contribution progress bars matching investments analytics, and month-by-month cashflow history), `all-money-transactions.tsx` (Complete personal finance transaction log with parameter-driven category/type/dateRange filter hydration, 3D category icons, date presets, and transaction editing), `money-insights.tsx` (Dedicated Smart Insights for Money Manager with Lucide search and category count badges), `money-health.tsx` (Personal financial health grade dashboard with SVG radial progress grade ring), `goals.tsx` (Dynamic Formula-Driven Financial Goal Tracker with minimal card face, high-resolution 3D category icons, swipe-to-edit/delete actions, live evaluations, and standardized 5px milestone tracks), `create-goal.tsx` (Full-screen Create & Edit Financial Goal Studio modal with dynamic safe top insets, Cancel/Save header, AI Natural Language Assistant, full-page Goal Category, What to Track, Goal Direction, and searchable full-page 3D Goal Icon catalog grid modal, and milestone inputs), `custom-goal-formula.tsx` (Dedicated Custom Mathematical Formula & Variables Studio page with live syntax evaluator, arithmetic operator bar, domain filter tabs, search, and 28+ variable insert rows), `ai-chat.tsx` (Gemini AI Chat system with unified BackButton header), `cloud-backup.tsx` (Native Google OAuth cloud backup & Supabase synchronization hub with ThemedText typography), `win-loss-details.tsx` (Win/loss stock positions details with unified #34C759/#FF3B30 colors), `index-comparison.tsx` (Benchmark returns), `portfolio-health.tsx` & `portfolio-health-formula.tsx` (Grades/criteria with resilient empty state card), `monthly-analysis.tsx` & `yearly-analysis.tsx` (Month/year performance breakdowns), `sectors.tsx` (Industry sectors listing with unified high-resolution 3D Category icons, search bar, and BackButton header), `stock-details/[symbol].tsx` (Unified Stock Detail studio with inline action pills `[ ↗ Buy More ]` and `[ ↙ Sell ]` routing with pre-filled ticker/price). |
| `app/(tabs)/` | Tabs layout and navigation index page wrapper. | `_layout.tsx` (Custom Floating Island Pill Dock navigation bar with active capsule highlights, prominent center white `+` action pill, dynamic safe bottom insets across iOS Home indicator and Android 3-button/gesture navigation bars, and labels across both modes: Portfolio, Insights, Add (+), Explore, Profile in Invest mode; Dashboard, Accounts, Add (+), EMIs, Profile in Money mode), `index.tsx` (Home screen displaying `MoneyDashboard` or `PortfolioSummary` with **Recent Investments** card), `explore.tsx` (Unified Stock search & watchlist with 3D Category icons for Browse Sectors, star toggle, filter drawer, hybrid local Supabase store search and Twelve Data debounced global market search with exchange tags & live quote hydration), `insights.tsx` (Investments insights with Lucide search and filter categories), `money-accounts.tsx` (Net worth details & accounts list with credit card utilization warning badges and investment return percentages), `money-loans.tsx` (Loans & EMIs with unified repayment progress meters), `profile.tsx` (User profile & customizations with Settings launcher leading to OTA updates), `add.tsx` (Center add navigation wrapper routing to mode-specific transaction modals), `two.tsx` (Investments Transaction History sub-screen with Back button, direct `+` button, category filter tabs, broker details, and swipeable/long-press actions). |
| `app/add-*.tsx` | Modals and full-screen flows to add various assets/transactions. | `add-transaction.tsx` (Full-screen BUY/SELL stock transaction studio with dynamic safe top header, full-page Select Symbol asset picker modal with debounced Twelve Data remote global search, one-tap 'Sell All' position liquidation shortcut, and full-page Select Broker modal featuring unified BankLogo brand badges across existing and suggested brokers), `add-money-transaction.tsx` (Full-screen visual 5-column 3D icon category grid, 3-segment capsule selector [Spent/Income/Transfer], full-page Choose Account sheet, and bottom calculator keypad sheet with real-time Indian numbering comma formatting [e.g. `1,24,433`], live math expression evaluation preview, and Save action), `add-loan.tsx` (Full-screen Loan & EMI Studio with dynamic safe top header, auto-suggested 3D icons on loan title, full-page Choose Icon selector with search, and amortization calculator), `add-budget.tsx` (Full-screen Monthly Budgets Studio with dynamic safe top insets, 3D category icons, haptics, empty search fallback state, and category limit inputs), `add-account.tsx` (Full-screen Monetary Accounts Studio with dynamic safe top header, full-page searchable Brand Logo selector, full-page Account Type picker, and full-page Broker linker), `add-subscription.tsx` (Full-screen Subscription Studio with dynamic safe top header, auto-suggested 3D icons on service title, and full-page Choose Icon selector). |
| `app/*-details/` | Detailed analytical screens. | `stock-details/[symbol].tsx` (Unified Stock Detail studio with dynamic safe area bottom padding, elastic scroll physics, and sticky bottom quick trade [Buy More / Sell] action pills), `account-details/[id].tsx` (Monetary account details showing clean minimalist balance hero card without redundant tags/logos, interactive empty state with '+ Log First Transaction' quick shortcut, transaction log with high-resolution 3D Category icons, credit card utilization warning alerts, and investment absolute/percentage return badges), `loan-details/[id].tsx` (Institutional loan dashboard with unified hero card, progress bar, 2x2 metric grid, principal vs. interest stacked cost breakdown, action pills, dynamic safe area bottom insets, and tabbed amortization schedule with upcoming/paid views), `prepay-loan/[id].tsx` (Dedicated loan prepayment simulator & action execution studio with multi-strategy comparison and direct payment logging), `budget-details/[id].tsx` (Category spend limits tracking with high-resolution 3D category icons and standard '••••••' privacy masking), `subscription-details/[id].tsx` (Unified subscription dashboard with clean hero card, category/status badges, horizontal metadata rows, quick action pills for logging payments or cancelling/reactivating, and tabbed renewal schedule with cycle numbers and next due badges), `sector-details/[sector].tsx` (Industry sector allocation details with prominent 3D Category icons), `analytics-details/[type]/[value].tsx` (Multi-dimensional queries with 3D Category icons and BankLogo broker branding). |
| `components/` | Reusable presentation UI elements. | `AppUpdateCard.tsx` (Over-The-Air OTA update card with live check, progress indicator, download state, and instant app restart), `BackButton.tsx` (Unified 38x38 circular navigation back button with subtle border and hitSlop), `Category3DIcon.tsx` (High-resolution 3D rendered category and financial goal icons with offline fallback vector support), `CategoryIcon.tsx` (Lucide-based vector category icons), `MoneyDashboard.tsx`, `FinancialGoalsCard.tsx` (Analytics-driven financial goals & milestones tracker card with live formula evaluation, 3D goal icons, and multi-segment milestone progress track), `FinancialInsights.tsx` (Smart insights dashboard summary card with category chips or AI generation CTA when empty), `PortfolioHealthCard.tsx`, `ActivityCalendar.tsx`, `MoneyActivityCalendar.tsx`, `ForecastCard.tsx`, `InsightsSummaryCard.tsx`, `WinLossCard.tsx`, `HealthDetailCard.tsx`, `HealthGauge.tsx`, `TopMovers.tsx`, `ShareableCard.tsx`, `AppSwitcher.tsx` (Top header mode switcher featuring Investments, Money Manager, solid card surfaces and crisp borders in light/dark modes, smooth tab navigation synchronization, and Gemini AI launcher), `GeminiAiButton.tsx` (Animated Siri/Gemini chromatic fluid glowing orb with Google Gemini 4-point star SVG, solid opaque pill surfaces preventing Android elevation clipping, and haptic trigger for Gemini AI Chat). |
| `constants/` | Constant configurations (colors, APIs, dimensions). | `Colors.ts` (light/dark themes), `Category3DIcons.ts` (Comprehensive 3D icons catalog with expanded streaming, music, gaming, tech, subscription, and financial goal icons [Target, Rocket, Star, Crown, Shield, Fire, Coin, Investments], fuzzy keyword matcher `findBest3DIconForText`, and auto-suggestions), `Api.ts` (API configuration endpoints). |
| `hooks/` | Business-logic custom hooks. | `usePortfolioHealth.ts` (health grading algorithm), `useInsights.ts` (investment flags: buy, sell/hold, observe), `useMoneyInsights.ts` (unified budgeting/cashflow insights). |
| `lib/` | Core business logic, mathematical engines, parsers, and financial algorithms. | `goalEvaluator.ts` (Dynamic formula evaluator with 28+ live variables including unblocked CreditCardDebt, BlockedCCDebt, and TotalCCDebt, dynamic debt peak tracking, proportional target ratio milestone tracks, and weighted segment progress calculation), `goalAiParser.ts` (Dual-engine natural language goal intent parser combining Gemini LLM and offline heuristic NLP engine for auto-prefilling goal formulas, milestones, and metadata), `xirr.ts` (Bisection/Newton-Raphson XIRR calculator), `analyticsHelper.ts` (Aggregation & benchmarking engine), `taxCalculator.ts` (Capital gains tax engine), `healthScoreCalculator.ts` (Comprehensive portfolio & personal finance health grades and criteria evaluation), `geminiHelper.ts` (Gemini API bridge & system prompts), `csvImporter.ts` (Tradebook CSV ingestion engine). |
| `store/` | Zustand state management with storage persistence. | `usePortfolioStore.ts`, `useMoneyStore.ts`, `useGoalStore.ts` (Custom formula financial goals and completion state), `useAppModeStore.ts`, `useAiStore.ts` (Gemini chat messages with `ChatAction` ledger commands and AI stock insights). |
| `tasks/` | Background automation tasks. | `backgroundFetch.ts` (registers periodic data backup jobs). |
| `types/` | TypeScript interface definitions. | `index.ts` (portfolio types), `money.ts` (money manager types), `goals.ts` (financial goals, variable definitions, and evaluated goals). |
| `utils/` | Utility helpers & sync engine. | `formatters.ts` (Universal Indian numbering system `en-IN` amount formatting, live input comma masking, calculator expression parsing, and currency helpers), `syncEngine.ts` (Two-way incremental sync between local store and Supabase). |
| `services/` | Peripheral external service adapters. | `MarketDataSyncService.ts` (Batches and synchronizes live Twelve Data market prices, 52W range, and logos into Supabase `public.tickers`), `TwelveDataService.ts` (Twelve Data Market Data API client providing live quotes, 52-week metrics, real-time USD/INR Forex exchange rates, and logo resolution), `DataExportService.ts` (exports/imports transactions backup), `logoService.ts` (Official high-res company vector logos, sector normalizer, and stock utilities). |

---

## 3. Application Modes & Flow

Gainbase has two distinct user modes configured in `useAppModeStore` and switched via `AppSwitcher`:

### A. Investments Tracker Mode
*   **Default View**: Displays total portfolio value, invested amount, total return percentage/PnL, day return percentage/PnL, XIRR, and privacy mode visibility toggle (standard `'••••••'` masking). Includes a **Recent Investments** section displaying the latest 3 transactions with company logos/initials, Buy/Sell indicators, broker tags, and a "View All" button leading to the full transaction log.
*   **Holdings Breakdown**: Horizontal allocation pie charts by sector, company name, asset type, or broker (grouping unassigned broker holdings under **"Unassigned"**). Multi-mode sorting and display filters for **Current (Invested)**, **Returns (%)**, **XIRR (%)**, and **Contribution (Current)** with ascending/descending toggles.
*   **Detail Screens**: 
    *   `stock-details/[symbol]`: Real-time and historical transactions for a stock ticker, current/yesterday close price, gains.
    *   `portfolio-health`: Visual score gauges (out of 100) based on diversity, performance, risk concentration, and activity consistency, featuring an interactive empty state card with CTA when no holdings exist.
    *   `insights`: Institutional-grade AI stock portfolio strategist utilizing Google Notes minimal card UI: prominent title, clean unboxed note body, and bottom tag chips for Ticker, Signal Badge, and Metric Value.
    *   `forecast-details`: Custom portfolio forecasting (projections) adjusting years, SIP amount, step-up percentage, and inflation adjustments.
    *   `index-comparison`: Compares portfolio returns against indexes (e.g., Nifty 50, S&P 500).

### B. Money Manager Mode
*   **Unified iOS Design System**: All Money Manager screens and configuration modals adhere strictly to the high-end iOS grouped form, card, and typography system established in the Investments Tracker. Hero values use clean regular weights (`fontSize: 24, fontWeight: '400'`, matching the Investments Portfolio card rather than heavy bold weights), row values use `fontSize: 14, fontWeight: '400'`, uppercase section titles use `fontSize: 10, fontWeight: '700', letterSpacing: 1`, icon buttons use `38x38 borderRadius: 19`, and dividers use `marginBottom: 16`. Modals use clean `Cancel` (left, textSecondary) / `Save` (right, mode accent) header actions, centered titles, segmented pill switchers, and grouped card containers (`borderRadius: 16` or `12`, border dividers, right-aligned values with chevron indicators, and searchable sheet modals). Progress bars follow the unified design token system: 5px height for compact rows and 8px height for hero cards with `currColors.cardSecondary` track background.
*   **Default View (`MoneyDashboard`)**: Displays Net Worth, monthly income/expense/EMIs/subscriptions/savings rate summaries on a clean flat card along with **Daily Burn Rate** (`₹X/day`) and **Avg Daily Earning** (`+₹X/day`, calculated from month-to-date income divided by the total number of days in the current month). Features dynamic side-by-side **Visual Analytics Compact Cards** (a multi-segment SVG Donut Chart for live AI Insights / Signals breakdown and a circular SVG Progress Gauge for Financial Health Score & Grade), an **Upcoming Payments (14 days)** list summarizing soon-to-be-due EMIs and Subscriptions, **Recent Transactions** (restricting to the single most recent transaction date, capped at 3 items, with high-resolution 3D category icons), and activity heat maps.
*   **Accounts Tab (`money-accounts`) & Reordering (`reorder-accounts`)**: Lists all monetary accounts grouped by type with a premium hero card at the top summarizing Net Worth, Assets, Liabilities (featuring one-tap Privacy Mode toggle and Analytics shortcuts matching the Investments Portfolio card). Grouped account categories feature uppercase group headers, total balance summaries, and a dedicated minimal full-page **Reorder Accounts** screen (`app/reorder-accounts.tsx`) supporting section up/down shifts and nested account reordering. Investment accounts display their live investment current value (linked to portfolio brokers) alongside manual invested amounts and absolute/percentage returns. Credit cards show real-time utilization stats with progress bars color-coded dynamically (yellow/red) when utilization exceeds moderate (30%) and high (70%) thresholds.
*   **Manage Categories (`manage-categories`)**: Minimal full-page Category Management studio with native **drag-and-drop reordering** (`react-native-draggable-flatlist` with `GripVertical` drag handles, interactive scale elevation, position indicators, and haptic feedback), inline category creation/editing, and a full-page **Choose Icon** modal (`presentationStyle="fullScreen"`) matching the unified app standard.
*   **Cash Flow & Add Transaction**: Modern Visual Add Transaction experience (`add-money-transaction.tsx`): circular top navigation buttons (`✕` close, `(?)` quick tips), floating segmented capsule selector (`Spent`, `Income`, `Transfer`), 5-column visual category grid with purple/teal active selection outline and manage shortcut, full-page `Choose Account` / `Destination Account` sheet with circular `✕` and `✓` header actions, search bar, uppercase section headers (`BANK ACCOUNTS`, `CREDIT CARDS`, `CASH & WALLETS`, `INVESTMENTS`, `EMERGENCY FUND`, `PEER BALANCES`), account cards with bank logos or category badges, active highlighted border, and a bottom `+ Add new account` pill button. Bottom calculator keypad sheet features currency pill, live calculation preview, note & date shortcut modal, 4x4 keypad with haptics and math operators (`+`, `-`, `×`, `÷`, `.`, `0-9`, `⌫`, `=`), and prominent full-width `Save` button. The transaction ledger (`all-money-transactions.tsx`) features a summary card, clean grouped rows with 3D category icons, and a collapsible Bottom Sheet Filter (date ranges, category tags with 3D icons, transaction types).
*   **Loan & EMI Tracker (`money-loans`)**: Segmented switcher between Loans and Subscriptions with dynamic header titles ("Loans & EMIs" / "Subscriptions"), total monthly EMI burden and debt summary card, direct high-resolution 3D category icons without boxed wrappers (`Category3DIcon` with `LOAN_3D_ICON_MAP`), and clean grouped cards tracking remaining EMI counts, interest rates, and loan progress. Integrated across `loan-details`, `add-loan`, `prepay-loan`, and `MoneyDashboard` upcoming payments.
*   **Subscription Manager (`add-subscription`)**: Tracking active SaaS subscriptions, recurring cycles, monthly cost burdens, auto-advancing billing cycles, and grouped service details.
*   **Smart Insights Screen (`money-insights`)**: Dedicated AI-only page matching the Google Notes minimal card UI of the Investments Insights page. Features an initial AI Hero generation state, search filter, category tabs (`All`, `Alerts`, `Tips`, `Achievements`), and a header **[ ✨ REFRESH ]** button. Cards feature a clean static informational layout: title header with icon, unboxed note body with comfortable line-height, and bottom tag chips for Domain, Signal Badge, and Metric Value.
*   **Financial Health Dashboard (`money-health`)**: Dedicated page evaluating Savings rate, Emergency fund cushions, DTI ratios, and credit card utilization ratios into a unified health score out of 100 with actionable feedback and SVG circular radial progress grade ring.

---

## 4. State Management (Zustand Stores)

All stores use `AsyncStorage` via Zustand's `persist` middleware to survive app restarts.

### 1. `useAppModeStore` (`app-mode-storage`)
*   **Purpose**: Manages the current application UI mode.
*   **State**:
    *   `activeMode`: `'investments' | 'money'`
    *   `isTransitioning`: Boolean indicating tab animation state.
*   **Actions**:
    *   `setActiveMode(mode)`
    *   `setIsTransitioning(val)`

### 2. `usePortfolioStore` (`portfolio-storage`)
*   **State**:
    *   `transactions`: Complete list of stock/ETF transactions (`id`, `symbol`, `type` [BUY/SELL], `quantity`, `price`, `date`, `broker`). Automatically validates and sanitizes all transaction IDs to unique strings during addition, import, and rehydration.
    *   `tickers`: Array of ticker metadata (yesterday close, current price, company name, asset type, sector, currency, etc.) fetched from the `public.tickers` table in Supabase and enriched with Twelve Data.
    *   `isPrivacyMode`: Boolean.
    *   `showCurrencySymbol`: Boolean (shows or hides `₹`).
    *   `theme`: `'system' | 'light' | 'dark'`.
    *   `watchlist`: List of ticker symbols.
    *   `deletedTransactionIds`, `deletedWatchlistIds`: Lists of deleted records to track offline deletions for Supabase cloud sync.
    *   `forecastYears`, `targetCorpus`, `sipStepUp`, `manualMonthlySIP`, `isInflationAdjusted`.
*   **Actions**:
    *   `addTransaction(transaction)`: Inserts new transaction with guaranteed string ID and timestamp.
    *   `removeTransaction(id)`: Safely removes transaction by string ID comparison and queues ID for Supabase deletion sync.
    *   `updateTransaction(id, transaction)`: Safely updates transaction by string ID.
    *   `importTransactions(transactions)`: Sanitizes IDs and appends imported records.
*   **Calculations / Selectors**:
    *   `calculateSummary()`: Returns total cost, current value, realized/unrealized gains, XIRR, and 1-day/1-year returns.
    *   `getAllocationData(dimension)`: Allocates portfolio weights based on sector, broker, etc. For `Broker` dimension, accurately evaluates multi-broker stock positions per `(symbol, broker)` pair.
    *   `getHoldingsData(brokerFilter?)`: Aggregates buy/sell transactions into current positions (or filtered per broker), calculating average buy price, current cost, market value, and total return.

### 3. `useMoneyStore` (`money-manager-storage`)
*   **State**:
    *   `accounts`: List of monetary accounts (e.g., Bank, Credit Card, Cash, or Investments). Investment accounts can be linked to a portfolio broker via `linkedBroker`. Supports custom account order positioning.
    *   `accountTypesOrder`: Custom display order array for account type sections on the Accounts screen.
    *   `moneyTransactions`: List of income and expense transactions.
    *   `loans`: Borrowed or lent funds with principal, interest rate, duration, and EMI configuration. Supports "EMIs Already Paid" tracking upon loan creation with automatic amortization schedule computation and historical EMI payment generation.
    *   `emiPayments`: Log of EMI transaction logs (linked to transactions via `transactionId`).
    *   `budgets`: Set budgets per month/year with deterministic category IDs, updatedAt ISO timestamps, and AsyncStorage deduplication on rehydration.
    *   `subscriptions`: Active repeating subscriptions.
    *   `subscriptionPayments`: Log of subscription payment logs (linked to transactions via `transactionId`).
    *   `categories`: List of tags for income/expense categorization.
    *   `deletedAccountIds`, `deletedTransactionIds`, `deletedLoanIds`, `deletedEmiPaymentIds`, `deletedBudgetIds`, `deletedBudgetCategoryIds`, `deletedSubscriptionIds`, `deletedSubscriptionPaymentIds`: Lists of deleted records to track offline deletions for Supabase cloud sync.
*   **Actions**:
    *   `setAccountTypesOrder(order)`: Persists customized ordering of account type sections.
    *   `reorderAccounts(accounts)`: Persists customized ordering of individual accounts.
    *   `addBudget(budget)`: Inserts or updates budget with guaranteed string ID and timestamp, preventing duplicate ID accumulation.
    *   `updateBudget(id, updates)`: Updates budget with fresh ISO timestamp.
    *   `removeMoneyTransaction(id)`: Deletes a transaction, adjusts account balances, and automatically removes linked EMI/subscription payments (reverting loan outstanding balance/billing cycles).
    *   `removeEMIPayment(paymentId)`: Directly removes an EMI payment and reverts the outstanding loan balance.
    *   `removeSubscriptionPayment(paymentId)`: Directly removes a subscription payment log and reverts the billing cycle.
*   **Calculations / Selectors**:
    *   `getNetWorth()`: Computes total assets (investment values + bank balances) minus liabilities (loans). Accounts linked to a broker dynamically evaluate active portfolio investment values instead of static manual balances.
    *   `getMonthlyEMIBurden()`, `getMonthlySubscriptionBurden()`.
    *   `getCategorySpending(budgetId, year, month)`.

---

## 5. Business Logic & Financial Calculations

### 📈 Internal Rate of Return (XIRR) & Date Arithmetic
*   **Location**: [finance.ts](file:///Users/akashsharma/Documents/Gainbase/lib/finance.ts#L10-L170)
*   **Methodology**: Newton-Raphson numerical iterative solver with Bisection fallback.
*   **Formula**:
    $$\sum_{i=1}^{n} \frac{CF_i}{(1 + rate)^{d_i / 365}} = 0$$
    Where $CF_i$ is cashflow transaction amount (positive/negative), $d_i$ represents the number of days elapsed since the first transaction. The solver iterates up to 60 times to converge at a precision of $10^{-6}$.
*   **Short-Term Holding Stability**: When total holding duration is under 30 days, annualizing returns produces extreme volatility; the engine automatically returns simple percentage return. Solvers clamp realistic rates within $[-99\%, +500\%]$ to prevent numerical divergence.
*   **Calendar & Cycle Clamping (`advanceDateByCycle`)**: Recurring cycles (weekly, monthly, quarterly, yearly) preserve original day of the month and clamp to each target month's maximum valid days (preventing JavaScript 31st day overflow skips into subsequent months). Used across subscriptions, loan tenures, and analytics timeframes.

### 🚀 Future Wealth Projection
*   **Location**: [finance.ts](file:///Users/akashsharma/Documents/Gainbase/lib/finance.ts#L171-L260) & [ForecastCard.tsx](file:///Users/akashsharma/Documents/Gainbase/components/ForecastCard.tsx)
*   **Methodology**: Monthly compounded returns on base value, plus recurring SIP contributions that step up annually by a given percentage. Expected annual return for long-term multi-year projections is sanitized and bounded within realistic market boundaries ($1\% - 30\%$, defaulting to $12\%$ benchmark if portfolio history is empty or non-positive), preventing exponential numerical overflow. Optionally discounts the final projected value by the annual inflation rate ($6\%$ default) to show current purchasing power. Forecast card UI applies dynamic flexbox constraints and text containment to guarantee clean presentation.

### 🩺 Portfolio Health Grading
*   **Location**: [usePortfolioHealth.ts](file:///Users/akashsharma/Documents/Gainbase/hooks/usePortfolioHealth.ts)
*   **Rules**: Max score is 100, broken into four dimensions (25 points each):
    1.  **Diversity**: Checks count of sectors ($\ge 5$), asset types ($\ge 3$), and total stocks ($\ge 12$).
    2.  **Performance & Cost**: Checks total return percentage, proportion of green (profitable) holdings, and XIRR performance.
    3.  **Concentration & Risk**: Verifies if any single stock dominates $>25\%$ of the total valuation, or if cash/ETFs act as buffers.
    4.  **Activity & Consistency**: Scores based on frequency of investments (Activity heat maps) and timeframe of holding.

### 💡 Portfolio Insights Trigger Rules
*   **Location**: [useInsights.ts](file:///Users/akashsharma/Documents/Gainbase/hooks/useInsights.ts)
*   **Triggers**:
    *   **Sell**: Concentration $> 25\%$ (High Risk), Stop Loss $< -15\%$ (Tax-Loss Harvesting).
    *   **Hold**: Profit Book $> 30\%$ (Booking Profit).
    *   **Buy / Add**: Concentration $< 2\%$ (Sub-scale Holding), Large-cap buffer tracking, DCA Opportunity.
    *   **Not Sure**: Extreme volatility, 52W high/low proximity, winning/losing streaks, sector concentration, sync freshness.

### 💡 Money Insights Trigger Rules
*   **Location**: [useMoneyInsights.ts](file:///Users/akashsharma/Documents/Gainbase/hooks/useMoneyInsights.ts)
*   **Triggers**:
    *   **Success**: Monthly savings rate $\ge 20\%$, healthy Debt-to-Income (DTI) ratio $\le 15\%$.
    *   **Warning**: Spending deficit (savings rate $\le 0\%$), budget overspent ($\ge 100\%$), credit card utilization $> 50\%$, cash cover below 1.5x of monthly EMIs, low emergency fund savings (covers $< 3$ months of average expenses), high DTI ratio $> 35\%$, high credit card outstanding debt relative to savings ($> 50\%$).
### 📅 Loan Installment & Next EMI Schedule Resolution
*   **Location**: [finance.ts](file:///Users/akashsharma/Documents/Gainbase/lib/finance.ts#L150-L270) (`getNextLoanDuePayment`)
*   **Methodology**: Accurately tracks cumulative payment credits and monthly advance rollovers. When multiple EMI payments are logged in the same calendar month or in advance, the engine advances the next unpaid due date by the exact number of excess installment credits ($+K$ months), preventing already-paid future installments from erroneously appearing in the 14-day upcoming payments dashboard.

### 🤖 AI Co-pilot Chat & Natural Language Action Execution
*   **Location**: [ai-chat.tsx](file:///Users/akashsharma/Documents/Gainbase/app/ai-chat.tsx) & [useAiStore.ts](file:///Users/akashsharma/Documents/Gainbase/store/useAiStore.ts)
*   **Capabilities**:
    *   **Transaction Necessity Guidance ("Was it needed or not?")**: Evaluates every user expense, peer loan, or purchase intent with candid financial feedback (Essential Need vs Discretionary Want vs Receivable / Peer Loan vs Investment).
    *   **Natural Language Action Detection**: Parses ledger commands directly from conversational chat (e.g. *"I gave 500rs to Rajat"*, *"Spent 450 on food"*, *"Paid 15000 home loan EMI"*, *"Paid Netflix subscription"*).
    *   **Interactive Approval Card**: Displays a dedicated card UI inline in chat showing account targets, loan/subscription linkages, amounts, necessity badges, and explicit **Approve Action** / **Dismiss** buttons before mutating local stores.
    *   **Automatic Account & EMI Linkage**:
        *   Creates `receivable`, `payable`, `wallet`, or `savings` accounts automatically on confirmation if the target account does not yet exist.
        *   When an EMI payment is approved, automatically links to the loan in `loans`, registers the payment via `addEMIPayment` (reducing outstanding balance and logging into amortization history on the EMI page), and posts the expense transaction.
        *   When a subscription payment is approved, logs via `addSubscriptionPayment` and automatically advances the subscription renewal cycle.

---

---

## 6. Background Automation & Cloud Sync

### A. Background Data Backup
*   **Location**: [backgroundFetch.ts](file:///Users/akashsharma/Documents/Gainbase/tasks/backgroundFetch.ts)
*   **Behavior**: Fires periodically (every 24 hours) in the background. Attempts to serialize user transactions/portfolio data to `Gainbase/data.json` under `FileSystem.documentDirectory` for secure local backup.

### B. Supabase Cloud Sync & Authentication
*   **Location**: [syncEngine.ts](file:///Users/akashsharma/Documents/Gainbase/utils/syncEngine.ts) & [cloud-backup.tsx](file:///Users/akashsharma/Documents/Gainbase/app/cloud-backup.tsx)
*   **Authentication Methods**: Supports Cross-Platform Native Google Sign-In (`@react-native-google-signin/google-signin`):
    *   **iOS**: Configured with `GOOGLE_IOS_CLIENT_ID` and `iosUrlScheme` (`com.googleusercontent.apps...`) in `app.json`.
    *   **Android**: Handled natively by Google Play Services. Uses `com.akashsharma.gainbase` package name and signing certificate SHA-1 fingerprint (registered as an Android OAuth Client ID in Google Cloud Console). Both platforms request ID Tokens against `GOOGLE_WEB_CLIENT_ID`, which Supabase Auth validates via `supabase.auth.signInWithIdToken`.
*   **Sync Behavior**: 
    1.  Automatically triggers on app launch (once local Zustand persist hydration from AsyncStorage finishes) and manual trigger on the Cloud Sync screen.
    2.  Compares local and remote database rows by unique `id` and `updatedAt` timestamps.
    3.  Upserts new/edited items in batch to Supabase.
    4.  Processes deletions (hard deletes / synchronization) without losing cloud backups during local device resets.
    5.  When local data is cleared or empty on the device, cloud sync automatically adopts the device and pulls all cloud data down cleanly without device mismatch blocks.
    6.  Sanitizes and normalizes all timestamp and date fields to valid ISO-8601 strings (preventing PostgreSQL empty string timestamp syntax errors).
    7.  Features intelligent content-fingerprint deduplication across all 10 tables, preventing double records and automatically purging duplicate cloud copies on resync.
    8.  Maintains strict foreign key integrity by dynamically remapping parent IDs (e.g. accounts, loans, budgets, subscriptions) on child entities, pushing parent tables first, and deleting child records before parents.
    9.  Syncs the `logo` column for accounts (added to local store and remote Supabase db table `accounts`).
    10. Synchronizes custom `categories`, `categoryMetadata`, `loan_icons`, and `subscription_icons` via Supabase Auth `user_metadata` (`supabase.auth.updateUser`) and database tables, ensuring 3D icons on loans, EMIs, subscriptions, and custom categories seamlessly persist across multi-device sync and cloud backup restores without resetting.

### C. Ticker Price Synchronization & Market Data
*   **Behavior**:
    1. **Google Sheet & Supabase Integration**: Portfolio ticker metadata (Current Value, Yesterday Close, High52, Low52, Company Name, Asset Type, Sector, PE, Market Cap, Historical data) is ingested directly from the user's Google Sheet into Supabase `public.tickers` table.
    2. **Local Store Hydration (`fetchTickers`)**: `usePortfolioStore` fetches all authentic Google Sheet ticker records directly from Supabase on app start and pull-to-refresh, populating the local state without external polling.
    3. **Twelve Data Market Data Integration (`TwelveDataService`)**: Provides on-demand real-time stock quotes, 52-week high/low metrics, and official logos for global equities and Indian tickers as a live fallback and expansion layer. Search queries are strictly filtered to the top 4 premier exchanges (**NYSE, NASDAQ, NSE, BSE**), automatically excluding obscure secondary cross-listings. Foreign currencies (USD/EUR/etc.) are automatically converted to INR using real-time Forex exchange rates.
    4. **High-Resolution Stock Logo Engine (`getCompanyLogoUrl`)**: Dynamically resolves official company logos across the application (Stock Details Hero Card, Explore search & watchlist, Top Movers, Holdings/Allocations, and Transaction Pickers) matching against clean company domains, Twelve Data logos, and ticker symbols.
    5. **Direct Google Sheet Search**: Search across **Explore** and **Add Transaction** operates directly and exclusively against the user's authentic Google Sheet database (`tickers` store), matching symbols and company names without external dictionaries.

### D. Native iOS Scene-Based Lifecycle & OTA Integration (iOS SDK Compatibility)
*   **Architecture**: Conforms to Apple's modern `UIScene` lifecycle required by recent iOS SDKs.
*   **Scene Delegation**: [SceneDelegate.swift](file:///Users/akashsharma/Documents/Gainbase/ios/Gainbase/SceneDelegate.swift) manages the `UIWindow` and boots React Native via `appDelegate.reactNativeFactory.startReactNative`, handling scene connections, universal links, and deep link URL events.
*   **App Delegation & OTA Startup**: [AppDelegate.swift](file:///Users/akashsharma/Documents/Gainbase/ios/Gainbase/AppDelegate.swift) initializes `ExpoReactNativeFactory` using the standard Expo SDK 52 delegate structure (`ReactNativeDelegate.bundleURL()` points cleanly to `main.jsbundle` in Release mode). The internal `ExpoUpdatesReactDelegateHandler` automatically handles the background update checks and replaces the root view whenever a new OTA bundle is ready.
*   **Configuration**: [Info.plist](file:///Users/akashsharma/Documents/Gainbase/ios/Gainbase/Info.plist), [Expo.plist](file:///Users/akashsharma/Documents/Gainbase/ios/Gainbase/Supporting/Expo.plist), and [app.json](file:///Users/akashsharma/Documents/Gainbase/app.json) declare `UIApplicationSceneManifest` and `EXUpdates` credentials.

---

### E. 3D Icon System (Category3DIcon)

*   **Catalog**: `constants/Category3DIcons.ts` → `CATEGORY_3D_ICONS_LIST` (source of truth; each item: `{ id, name, group, path, keywords }`). Includes high-resolution 3D asset for Account Transfers (`transfer` / 3D Curved Exchange & Cycle Arrows).
*   **Resolver**: `components/Category3DIcon.tsx` resolves icons by:
    1. Direct key match in `LOCAL_3D_ICON_MAP`
    2. Exact compound category mapping in `KEYWORD_TO_ID` (e.g., `'Shopping - Electronics'` → `laptop`, `'EMI Payments'` → `credit_card`, `'Subscriptions - OTT'` → `tv`, `'Subscriptions - WiFi'` → `internet`, `'Transport - Fuel'` → `fuel`, `'Transport - Cab'` → `car`, `'Travel/ Trips'` → `compass`, `'Food & Dining'` → `food`, `'Rent & Bills'` → `receipt`, `'Electricity Bill'` → `electric`, `'transfer'` / `'account transfer'` → `transfer`)
    3. ID or name match in `CATEGORY_3D_ICONS_LIST`
    4. Reverse token-level word matching
    5. Smart fuzzy suggestion ranking via `findBest3DIconForText`
    6. Heuristic keyword partial matching
    7. Fallback to `CategoryIcon` (vector) if no 3D asset matches
*   **Usage**:
    - **Goal Icons**: `app/create-goal.tsx` — full-page modal with search grid. Icon ID stored in `FinancialGoal.icon`.
    - **Category Icons**: `app/manage-categories.tsx` — full-page 3D icon picker grid. Icon ID stored in `Category.icon`. Features floating hover action button (FAB) in the bottom right corner for adding categories, responsive Bottom Sheet Drawer for adding and editing categories (cross-platform `KeyboardAvoidingView` with iOS `'padding'` and Android `'height'` plus full-width drawer overlay to prevent keyboard obstruction), live 3D icon preview card with auto-matching, tap to open full-page icon catalog, swipe-left-to-delete gesture (`react-native-gesture-handler` `Swipeable`), and drag-and-drop reordering (`react-native-draggable-flatlist`).
    - **Account Icons (Receivable/Payable)**: `app/add-account.tsx` — icon picker appears conditionally for `receivable`/`payable` account types only. Icon ID stored in `Account.icon`. Displayed on `app/(tabs)/money-accounts.tsx` using `Category3DIcon` when `CATEGORY_3D_ICONS_LIST.find(i => i.id === item.icon)` resolves.
    - **Budget Details, Transaction Feeds & Money Analytics**: Transactions and category breakdown lists in `components/MoneyDashboard.tsx`, `app/budget-details/[id].tsx`, `app/account-details/[id].tsx`, `app/money-analytics.tsx`, and `app/all-money-transactions.tsx` render unified 3D category and transfer icons.

### F. UI/UX Design System & Token Standardization
*   **Theme & Color Contrast System**: 
    *   **Light Theme Contrast & Accessibility**: Configured `textSecondary` to `#5C5C60` (5.1:1 contrast ratio against white `#FFFFFF`), `tintMoney` to `#00876E` (deep emerald teal for white mode, WCAG AA compliant), `border` to `#D8D8DC`, `cardSecondary` to `#EFEFF4`, and `tabIconDefault` to `#68686E`. This resolves washed-out text and invisible navigation icons on Android displays while preserving vibrant punchy `#00C9A7` in dark mode.
    *   **Themed Typography**: `<ThemedText>` automatically defaults to dynamic `currColors.text` (`#1C1C1E` in light theme, `#FFFFFF` in dark theme), preventing white-on-white text clipping across all screens and modals.
    *   **Dynamic Tooltips & Charts**: Gifted-Charts bar tooltips, heatmaps, and benchmark bars adapt dynamically to `currColors.card`, `currColors.border`, and `currColors.text`.
*   **Privacy Mode Masking**: Standardized on `'••••••'` (6 clean bullet dots) across all financial summary cards, holdings, stock details, analytics, forecasts, and history lists.
*   **Navigation & BackButton**: Unified `38x38` circular `<BackButton />` (`borderRadius: 19`, `hitSlop: 8`, subtle card background) across all stacked screens.
*   **Modal Form Standards**: Standardized iOS modal top bar with `Cancel` (`textSecondary`, `Outfit_500Medium`) on left and `Save` (accent color, `Outfit_600SemiBold`) on right.
*   **Amount Input Row Standard**: Right-aligned numeric inputs embed the currency prefix directly into the `TextInput` (`placeholder="₹ 0"` and `value={amount ? \`₹ ${amount}\` : ''}` with `styles.input` `flex: 1`, `textAlign: 'right'`), eliminating flex-shrink clipping or scroll-under text overlapping issues while keeping `₹` and the formatted digits seamlessly together at the right edge.
*   **Progress Bars & Gauges**: Standardized compact list rows to `height: 5, borderRadius: 2.5` and hero cards to `height: 8, borderRadius: 4` with `currColors.cardSecondary` track fill.
*   **Branding & App Icon**: Configured with the **Infinite Growth Ribbon** aesthetic (3D ascending mint-to-violet gradient loop on deep space black). `assets/images/icon.png` (1024x1024 universal icon), `assets/images/adaptive-icon.png` (Android adaptive icon), `assets/images/splash-icon.png` (launch mark), and `assets/images/favicon.png` with matching `#000000` splash and adaptive background fills in [app.json](file:///Users/akashsharma/Documents/Gainbase/app.json).
*   **Typography**: Outfitted with Google Font Outfit tokens via `<ThemedText type="...">` avoiding conflicting React Native font-weight overrides.

### G. Over-The-Air (OTA) Updates, Versioning & Build Management
*   **Engine**: `expo-updates` with Expo EAS Update cloud CDN.
*   **Channel & Branch Mapping**: Both the `production` channel (production release builds) and `preview` channel (internal test APK builds configured in `eas.json`) are pointed to the `production` branch (`eas channel:edit preview --branch production`). Native `Expo.plist` / `AndroidManifest.xml` request `expo-channel-name`.
*   **Runtime Version Matching**: `app.json` declares `"runtimeVersion": { "policy": "appVersion" }`. Every OTA update published targets all installed binaries that match the exact semantic version (e.g., `1.0.0`), preventing binary-mismatch crashes.
*   **Dynamic Version Resolver**: [utils/version.ts](file:///Users/akashsharma/Documents/Gainbase/utils/version.ts) exports `getAppVersionInfo()` which extracts the active `version`, native `buildNumber`, `runtimeVersion`, EAS `channel`, and live OTA update hash (`otaUpdateId`), formatting them into a standard label (e.g. `v1.0.0 (Build 2) • OTA #8f3a1b`).
*   **In-App Updater Card**: [components/AppUpdateCard.tsx](file:///Users/akashsharma/Documents/Gainbase/components/AppUpdateCard.tsx) embedded in [app/settings.tsx](file:///Users/akashsharma/Documents/Gainbase/app/settings.tsx). Features live channel and dynamic version metadata, manual update check trigger with `Updates.checkForUpdateAsync()`, download progress indicator, and instant reload via `Updates.reloadAsync()`.
*   **Automated Version & Build Scripts**:
    *   `npm run bump:patch`: Increments patch version (e.g. `1.0.0` → `1.0.1`) and increments build numbers in `app.json` (iOS `buildNumber`, Android `versionCode`) and `package.json`.
    *   `npm run bump:minor`: Increments minor version (e.g. `1.0.0` → `1.1.0`) and increments build numbers.
    *   `npm run bump:build`: Increments internal build numbers without changing the user-facing semantic version.
    *   `npm run ota:publish`: Publishes an automated OTA update to the production channel (`eas update --branch production --auto`).

---

## 7. Maintenance Protocol for AI Agents

Whenever you make updates to the Gainbase codebase:
1.  **Locate Changes**: Note the modified folders/files.
2.  **Update Wiki**: If you change any store schema, calculation parameters, pages, or add new features, **immediately** update the corresponding sections of this `PROJECT_WIKI.md`.
3.  **Commit Document**: Keep the wiki updated in the same pull request or tool execution stream as your implementation.

---
*Wiki last updated: October 4, 2026*

