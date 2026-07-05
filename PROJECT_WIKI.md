# Gainbase Project Wiki

Welcome to the **Gainbase** Project Wiki. This document serves as the comprehensive, single source of truth for the architecture, file organization, state management, and business logic of the Gainbase iOS portfolio tracking and personal finance application.

---

## 🗺️ Table of Contents

- [1. Overview & Architecture](#1-overview--architecture)
- [2. Directory & File Mapping](#2-directory--file-mapping)
- [3. Application Modes & Flow](#3-application-modes--flow)
- [4. State Management (Zustand Stores)](#4-state-management-zustand-stores)
- [5. Business Logic & Financial Calculations](#5-business-logic--financial-calculations)
- [6. Background Fetch & Offline Sync](#6-background-fetch--offline-sync)
- [7. Maintenance Protocol for AI Agents](#7-maintenance-protocol-for-ai-agents)

---

## 1. Overview & Architecture

**Gainbase** is an iOS application built using **React Native** and **Expo** (~54.0.35) with the **Expo Router** (v6) file-based navigation. It is designed to combine portfolio investment tracking with cash-flow/personal budget management. 

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
end
```

---

## 2. Directory & File Mapping

Here is the functional map of the directory tree and key files:

| Directory/File | Description | Key Contents / Files |
| :--- | :--- | :--- |
| `app/` | File-based navigation routes & screens. | `_layout.tsx` (Root Stack Config, registers background sync). |
| `app/(tabs)/` | Tabs layout and index page wrapper. | `_layout.tsx` (Dynamic tab visibilities based on mode), `index.tsx` (Slide animated home screen), `profile.tsx`. |
| `app/add-*.tsx` | Modals to add various assets/transactions. | `add-transaction.tsx`, `add-money-transaction.tsx`, `add-loan.tsx`, `add-budget.tsx`, `add-account.tsx`, `add-subscription.tsx`. |
| `app/*-details/` | Detailed analytical screens. | `stock-details/[symbol]`, `account-details`, `loan-details`, `budget-details`, `subscription-details`, `sector-details`. |
| `components/` | Reusable presentation UI elements. | `MoneyDashboard.tsx`, `PortfolioHealthCard.tsx`, `ActivityCalendar.tsx`, `ShareableCard.tsx`, `AppSwitcher.tsx`, `HealthGauge.tsx`. |
| `constants/` | Constant configurations (colors, APIs, dimensions). | `Colors.ts` (light/dark themes), `Api.ts` (API configuration endpoints). |
| `hooks/` | Business-logic custom hooks. | `usePortfolioHealth.ts` (health grading algorithm), `useInsights.ts` (investment flags: buy, sell/hold, observe). |
| `lib/` | Core mathematical/computational logic. | `finance.ts` (XIRR calculation, future projection models, Indian number formatter). |
| `store/` | Zustand state management with storage persistence. | `usePortfolioStore.ts`, `useMoneyStore.ts`, `useAppModeStore.ts`. |
| `tasks/` | Background automation tasks. | `backgroundFetch.ts` (registers background sync jobs). |
| `types/` | TypeScript interface definitions. | `index.ts` (portfolio types), `money.ts` (money manager types). |
| `services/` | Peripheral external service adapters. | `DataExportService.ts` (exports/imports transactions). |

---

## 3. Application Modes & Flow

Gainbase has two distinct user modes configured in `useAppModeStore` and switched via `AppSwitcher`:

### A. Investments Tracker Mode
*   **Default View**: Displays total portfolio value, invested amount, total return percentage/PnL, day return percentage/PnL, XIRR, and privacy mode visibility toggle.
*   **Holdings Breakdown**: Horizontal allocation pie charts by sector, company name, asset type, or broker. Sorting features for current value, total returns, or contribution percentage.
*   **Detail Screens**: 
    *   `stock-details/[symbol]`: Real-time and historical transactions for a stock ticker, current/yesterday close price, gains.
    *   `portfolio-health`: Visual score gauges (out of 100) based on diversity, performance, risk concentration, and activity consistency.
    *   `insights`: Actionable suggestions categorized into **Buy**, **Sell/Hold**, and **Observe**.
    *   `forecast-details`: Custom portfolio forecasting (projections) adjusting years, SIP amount, step-up percentage, and inflation adjustments.
    *   `index-comparison`: Compares portfolio returns against indexes (e.g., Nifty 50, S&P 500).

### B. Money Manager Mode
*   **Default View**: Displays net worth, monthly income/expense/EMIs/subscriptions summaries on the top card, an **Upcoming Payments (14 days)** list summarizing soon-to-be-due EMIs and Subscriptions, **Recent Transactions** (restricting to the single most recent transaction date and capped at 3 items), and active budget meters.
*   **Accounts Tab**: Lists all monetary accounts grouped by type with a premium card at the top summarizing Net Worth, Assets, Liabilities, and a dynamic **Asset Distribution** category breakdown.
*   **Cash Flow Tracker**: Income & expense categorization, transaction additions with an interactive **arithmetic calculator keyboard** for inline calculations/bill splits, activity heat maps.
*   **Loan & EMI Tracker**: List of active loans, outstanding balances, monthly EMI burden calculation, tracking next payment dates.
*   **Budgeting Suite**: Setting monthly budget caps, displaying category-wise spending meters (e.g., food, bills, shopping).
*   **Subscription Manager**: Tracking active SaaS subscriptions, recurring cycles, monthly cost burdens, auto-advancing billing cycles.

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
    *   `transactions`: Complete list of stock/ETF transactions (`id`, `symbol`, `type` [BUY/SELL], `quantity`, `price`, `date`, `broker`).
    *   `tickers`: Array of ticker metadata (yesterday close, current price, company name, asset type, sector, etc.) fetched from Google sheet sync endpoints.
    *   `isPrivacyMode`: Boolean.
    *   `showCurrencySymbol`: Boolean (shows or hides `₹`).
    *   `theme`: `'system' | 'light' | 'dark'`.
    *   `watchlist`: List of ticker symbols.
    *   `forecastYears`, `targetCorpus`, `sipStepUp`, `manualMonthlySIP`, `isInflationAdjusted`.
*   **Calculations / Selectors**:
    *   `calculateSummary()`: Returns total cost, current value, realized/unrealized gains, XIRR, and 1-day/1-year returns.
    *   `getAllocationData(dimension)`: Allocates portfolio weights based on sector, broker, etc.
    *   `getHoldingsData()`: Aggregates buy/sell transactions into current positions, calculating average buy price, current cost, market value, and total return.

### 3. `useMoneyStore` (`money-manager-storage`)
*   **State**:
    *   `accounts`: List of monetary accounts (e.g., Bank, Credit Card, Cash).
    *   `moneyTransactions`: List of income and expense transactions.
    *   `loans`: Borrowed or lent funds with principal, interest rate, duration, and EMI configuration.
    *   `emiPayments`: Log of EMI transaction logs.
    *   `budgets`: Set budgets per month/year.
    *   `subscriptions`: Active repeating subscriptions.
    *   `categories`: List of tags for income/expense categorization.
*   **Calculations / Selectors**:
    *   `getNetWorth()`: Computes total assets (investment values + bank balances) minus liabilities (loans).
    *   `getMonthlyEMIBurden()`, `getMonthlySubscriptionBurden()`.
    *   `getCategorySpending(budgetId, year, month)`.

---

## 5. Business Logic & Financial Calculations

### 📈 Internal Rate of Return (XIRR)
*   **Location**: [finance.ts](file:///Users/akashsharma/Documents/Gainbase/lib/finance.ts#L10-L33)
*   **Methodology**: Newton-Raphson numerical iterative solver.
*   **Formula**:
    $$\sum_{i=1}^{n} \frac{CF_i}{(1 + rate)^{d_i / 365}} = 0$$
    Where $CF_i$ is cashflow transaction amount (positive/negative), $d_i$ represents the number of days elapsed since the first transaction. The solver iterates up to 100 times to converge at a precision of $10^{-6}$.

### 🚀 Future Wealth Projection
*   **Location**: [finance.ts](file:///Users/akashsharma/Documents/Gainbase/lib/finance.ts#L35-L124)
*   **Methodology**: Monthly compounded returns on base value, plus recurring SIP contributions that step up annually by a given percentage. Optionally discounts the final projected value by the annual inflation rate ($6\%$ default) to show current purchasing power.

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
    *   **Sell/Hold**: Concentration $> 25\%$ (High Risk), Profit Book $> 30\%$ (Booking Profit), Stop Loss $< -15\%$ (Underperformance).
    *   **Buy / Add**: Concentration $< 2\%$ (Sub-scale Holding), Large-cap buffer tracking.
    *   **Observe**: Extreme volatility, sync freshness.

---

## 6. Background Fetch & Offline Sync

*   **Location**: [backgroundFetch.ts](file:///Users/akashsharma/Documents/Gainbase/tasks/backgroundFetch.ts)
*   **Implementation**: Utilizes `expo-background-fetch` and `expo-task-manager`.
*   **Behavior**:
    1.  Registers a task named `background-portfolio-sync`.
    2.  Fires periodically in the background (frequency managed by iOS scheduler, standard 15-30 minute window).
    3.  Attempts to trigger `fetchTickers()` inside `usePortfolioStore` to fetch live prices and update local ticker prices silently.

---

## 7. Maintenance Protocol for AI Agents

Whenever you make updates to the Gainbase codebase:
1.  **Locate Changes**: Note the modified folders/files.
2.  **Update Wiki**: If you change any store schema, calculation parameters, pages, or add new features, **immediately** update the corresponding sections of this `PROJECT_WIKI.md`.
3.  **Commit Document**: Keep the wiki updated in the same pull request or tool execution stream as your implementation.

---
*Wiki last updated: July 2026*
