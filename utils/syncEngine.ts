import { supabase } from '../lib/supabase';
import { useMoneyStore } from '../store/useMoneyStore';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { Account, MoneyTransaction, Loan, EMIPayment, Budget, BudgetCategory, Subscription, SubscriptionPayment } from '../types/money';
import { Transaction } from '../types';

interface SyncStatus {
  success: boolean;
  message: string;
  timestamp: number;
}

// Global flag to prevent concurrent sync operations
let isSyncing = false;

/**
 * Helper to ensure valid ISO timestamp string for PostgreSQL timestamptz columns.
 * Prevents "invalid input syntax for type timestamp with time zone: """ errors.
 */
function ensureTimestamp(val: any, fallback: string = new Date().toISOString()): string {
  if (!val || typeof val !== 'string' || val.trim() === '') {
    return fallback;
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) {
    return fallback;
  }
  return d.toISOString();
}

function ensureOptionalTimestamp(val: any): string | null {
  if (!val || typeof val !== 'string' || val.trim() === '') {
    return null;
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) {
    return null;
  }
  return d.toISOString();
}

/**
 * Content fingerprint generators for reliable deduplication across local and cloud
 */
const getAccountFingerprint = (a: any) =>
  `${(a.name || '').trim().toLowerCase()}|${(a.type || '').trim().toLowerCase()}|${(a.institution || '').trim().toLowerCase()}`;

const getMoneyTxFingerprint = (t: any) =>
  `${t.type || 'expense'}|${Number(t.amount || 0)}|${(t.category || '').trim().toLowerCase()}|${t.accountId || t.account_id || ''}|${t.date ? String(t.date).slice(0, 10) : ''}|${(t.note || '').trim().toLowerCase()}`;

const getLoanFingerprint = (l: any) =>
  `${(l.name || '').trim().toLowerCase()}|${(l.lender_name || l.lenderName || '').trim().toLowerCase()}|${Number(l.principal_amount || l.principalAmount || 0)}|${l.start_date || l.startDate ? String(l.start_date || l.startDate).slice(0, 10) : ''}`;

const getEmiFingerprint = (e: any) =>
  `${e.loan_id || e.loanId || ''}|${Number(e.amount || 0)}|${e.date ? String(e.date).slice(0, 10) : ''}`;

const getBudgetFingerprint = (b: any) =>
  `${(b.name || '').trim().toLowerCase()}|${(b.period || '').toLowerCase()}|${b.start_date || b.startDate ? String(b.start_date || b.startDate).slice(0, 10) : ''}|${Number(b.total_limit || b.totalLimit || 0)}`;

const getBudgetCategoryFingerprint = (c: any) =>
  `${c.budget_id || c.budgetId || ''}|${(c.name || '').trim().toLowerCase()}`;

const getSubFingerprint = (s: any) =>
  `${(s.name || '').trim().toLowerCase()}|${(s.provider || '').trim().toLowerCase()}|${Number(s.amount || 0)}|${(s.billing_cycle || s.billingCycle || '').toLowerCase()}`;

const getSubPaymentFingerprint = (sp: any) =>
  `${sp.subscription_id || sp.subscriptionId || ''}|${Number(sp.amount || 0)}|${sp.date ? String(sp.date).slice(0, 10) : ''}`;

const getPortfolioTxFingerprint = (t: any) =>
  `${(t.symbol || '').trim().toUpperCase()}|${(t.type || 'BUY').toUpperCase()}|${Number(t.quantity || 0)}|${Number(t.price || 0)}|${t.date ? String(t.date).slice(0, 10) : ''}|${(t.broker || '').trim().toLowerCase()}`;

const getWatchlistFingerprint = (w: any) =>
  `${(w.symbol || w.id || '').trim().toUpperCase()}`;

/**
 * Generic two-way merge function with content fingerprint deduplication & ID remapping
 */
function mergeTable<Local extends { id: string; updatedAt?: string }, Remote extends { id: string; user_id: string; updated_at: string; is_deleted: boolean }>(
  localItems: Local[],
  deletedLocalIds: string[],
  remoteItems: Remote[],
  mapLocalToRemote: (l: Local, userId: string) => any,
  mapRemoteToLocal: (r: Remote) => Local,
  getFingerprint?: (item: any) => string,
): {
  mergedLocal: Local[];
  toPush: any[];
  duplicateRemoteIdsToDelete: string[];
  idRemap: Map<string, string>;
} {
  const deletedSet = new Set(deletedLocalIds);
  const duplicateRemoteIdsToDelete: string[] = [];
  const idRemap = new Map<string, string>();

  // 1. Deduplicate remoteItems
  const remoteById = new Map<string, Remote>();
  const remoteByFingerprint = new Map<string, Remote>();

  for (const remote of remoteItems) {
    if (deletedSet.has(remote.id)) continue;

    const fp = getFingerprint ? getFingerprint(remote) : null;
    if (remoteById.has(remote.id)) {
      duplicateRemoteIdsToDelete.push(remote.id);
      continue;
    }
    if (fp && remoteByFingerprint.has(fp)) {
      const existing = remoteByFingerprint.get(fp)!;
      const existingTime = new Date(existing.updated_at).getTime() || 0;
      const remoteTime = new Date(remote.updated_at).getTime() || 0;
      if (remoteTime > existingTime) {
        duplicateRemoteIdsToDelete.push(existing.id);
        idRemap.set(existing.id, remote.id);
        remoteById.delete(existing.id);
        remoteById.set(remote.id, remote);
        remoteByFingerprint.set(fp, remote);
      } else {
        duplicateRemoteIdsToDelete.push(remote.id);
        idRemap.set(remote.id, existing.id);
      }
      continue;
    }

    remoteById.set(remote.id, remote);
    if (fp) remoteByFingerprint.set(fp, remote);
  }

  // 2. Deduplicate localItems
  const localById = new Map<string, Local>();
  const localByFingerprint = new Map<string, Local>();
  const uniqueLocalItems: Local[] = [];

  for (const local of localItems) {
    if (deletedSet.has(local.id)) continue;

    const fp = getFingerprint ? getFingerprint(local) : null;
    if (localById.has(local.id)) {
      continue;
    }
    if (fp && localByFingerprint.has(fp)) {
      const existing = localByFingerprint.get(fp)!;
      idRemap.set(local.id, existing.id);
      continue;
    }

    localById.set(local.id, local);
    if (fp) localByFingerprint.set(fp, local);
    uniqueLocalItems.push(local);
  }

  const mergedLocal: Local[] = [];
  const toPush: any[] = [];
  const matchedRemoteIds = new Set<string>();

  // 3. Process local items against remote
  for (const local of uniqueLocalItems) {
    const fp = getFingerprint ? getFingerprint(local) : null;
    let remote = remoteById.get(local.id);

    if (!remote && fp) {
      remote = remoteByFingerprint.get(fp);
    }

    if (!remote) {
      // Exists locally but not remotely -> push to remote
      mergedLocal.push(local);
      toPush.push(mapLocalToRemote(local, ''));
    } else {
      matchedRemoteIds.add(remote.id);
      if (local.id !== remote.id) {
        idRemap.set(local.id, remote.id);
      }

      const localTime = (local.updatedAt && !isNaN(new Date(local.updatedAt).getTime()))
        ? new Date(local.updatedAt).getTime()
        : 0;
      const remoteTime = (remote.updated_at && !isNaN(new Date(remote.updated_at).getTime()))
        ? new Date(remote.updated_at).getTime()
        : 0;

      if (remote.is_deleted) {
        // Remote says deleted -> delete locally
      } else if (localTime > remoteTime) {
        // Local is newer -> push local to remote
        const updatedLocal = { ...local, id: remote.id };
        mergedLocal.push(updatedLocal);
        toPush.push(mapLocalToRemote(updatedLocal, ''));
      } else {
        // Remote is newer or equal -> pull remote to local
        mergedLocal.push(mapRemoteToLocal(remote));
      }
    }
  }

  // 4. Process remote items that were not matched locally
  for (const [remoteId, remote] of remoteById.entries()) {
    if (!matchedRemoteIds.has(remoteId) && !deletedSet.has(remoteId)) {
      if (!remote.is_deleted) {
        mergedLocal.push(mapRemoteToLocal(remote));
      }
    }
  }

  return { mergedLocal, toPush, duplicateRemoteIdsToDelete, idRemap };
}

/**
 * Perform a full two-way sync between local stores and Supabase
 */
export async function syncAllData(syncMode: 'default' | 'force_push' | 'force_pull' | boolean = 'default'): Promise<SyncStatus> {
  if (isSyncing) {
    return { success: false, message: 'Sync already in progress', timestamp: Date.now() };
  }

  let mode: 'default' | 'force_push' | 'force_pull' = 'default';
  if (syncMode === true || syncMode === 'force_push') {
    mode = 'force_push';
  } else if (syncMode === 'force_pull') {
    mode = 'force_pull';
  }

  try {
    isSyncing = true;
    
    // 1. Check Authentication status
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session?.user) {
      isSyncing = false;
      return { success: false, message: 'User is not logged in to cloud', timestamp: Date.now() };
    }

    const userId = session.user.id;
    const nowStr = new Date().toISOString();

    // ----------------------------------------------------
    // DEVICE ID VALIDATION
    // ----------------------------------------------------
    const localDeviceId = usePortfolioStore.getState().getDeviceId();
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('primary_device_id')
      .eq('id', userId)
      .maybeSingle();

    if (profileErr) {
      console.error('Error fetching profile for device verification:', profileErr);
      throw profileErr;
    }

    if (!profile) {
      // Create user profile with current device ID
      const { error: insertErr } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          primary_device_id: localDeviceId,
          updated_at: nowStr,
        });
      if (insertErr) throw insertErr;
    } else if (!profile.primary_device_id) {
      // Set current device as primary
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ primary_device_id: localDeviceId, updated_at: nowStr })
        .eq('id', userId);
      if (updateErr) throw updateErr;
    } else if (profile.primary_device_id !== localDeviceId) {
      const isLocalEmpty =
        (useMoneyStore.getState().accounts?.length || 0) === 0 &&
        (useMoneyStore.getState().moneyTransactions?.length || 0) === 0 &&
        (usePortfolioStore.getState().transactions?.length || 0) === 0;

      if (mode === 'force_push' || mode === 'force_pull' || isLocalEmpty) {
        // Force overwrite or restoring into empty local device -> adopt primary device
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({ primary_device_id: localDeviceId, updated_at: nowStr })
          .eq('id', userId);
        if (updateErr) throw updateErr;

        if (mode === 'force_push') {
          const tablesToWipe = [
            'money_transactions',
            'emi_payments',
            'budget_categories',
            'subscription_payments',
            'portfolio_transactions',
            'watchlist',
            'budgets',
            'loans',
            'subscriptions',
            'accounts',
          ];
          for (const t of tablesToWipe) {
            const { error: wipeErr } = await supabase
              .from(t)
              .delete()
              .eq('user_id', userId);
            if (wipeErr) throw wipeErr;
          }
        }
      } else {
        isSyncing = false;
        return {
          success: false,
          message: 'DEVICE_MISMATCH',
          timestamp: Date.now(),
        };
      }
    }

    const forcePull = mode === 'force_pull';

    // ----------------------------------------------------
    // TABLE 1: ACCOUNTS (PARENT)
    // ----------------------------------------------------
    const localAccounts = forcePull ? [] : (useMoneyStore.getState().accounts || []);
    const deletedAccountIds = forcePull ? [] : (useMoneyStore.getState().deletedAccountIds || []);
    
    const { data: remoteAccounts, error: accountsFetchError } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId);
      
    if (accountsFetchError) throw accountsFetchError;

    const accountMerge = mergeTable(
      localAccounts,
      deletedAccountIds,
      remoteAccounts || [],
      (l: Account) => ({
        id: l.id,
        user_id: userId,
        name: l.name || 'Account',
        type: l.type || 'Bank',
        balance: Number(l.balance || 0),
        icon: l.icon || 'Landmark',
        color: l.color || '#007AFF',
        institution: l.institution || null,
        logo: l.logo || null,
        account_number: l.accountNumber || null,
        credit_limit: l.creditLimit !== undefined && l.creditLimit !== null ? Number(l.creditLimit) : null,
        interest_rate: l.interestRate !== undefined && l.interestRate !== null ? Number(l.interestRate) : null,
        include_in_assets: l.includeInAssets !== false,
        linked_broker: l.linkedBroker || null,
        is_archived: l.isArchived || false,
        is_deleted: false,
        updated_at: ensureTimestamp(l.updatedAt, nowStr),
      }),
      (r: any): Account => ({
        id: r.id,
        name: r.name,
        type: r.type,
        balance: Number(r.balance),
        icon: r.icon,
        color: r.color,
        institution: r.institution || undefined,
        logo: r.logo || undefined,
        accountNumber: r.account_number || undefined,
        creditLimit: r.credit_limit !== null ? Number(r.credit_limit) : undefined,
        interestRate: r.interest_rate !== null ? Number(r.interest_rate) : undefined,
        includeInAssets: r.include_in_assets,
        linkedBroker: r.linked_broker || undefined,
        isArchived: r.is_archived,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }),
      getAccountFingerprint
    );

    const validAccountIds = new Set(accountMerge.mergedLocal.map(a => a.id));

    // ----------------------------------------------------
    // TABLE 2: MONEY TRANSACTIONS (CHILD OF ACCOUNTS)
    // ----------------------------------------------------
    const localTxs = forcePull ? [] : (useMoneyStore.getState().moneyTransactions || []);
    const deletedTxIds = forcePull ? [] : (useMoneyStore.getState().deletedTransactionIds || []);
    
    const { data: remoteTxs, error: txsFetchError } = await supabase
      .from('money_transactions')
      .select('*')
      .eq('user_id', userId);
      
    if (txsFetchError) throw txsFetchError;

    const txsMerge = mergeTable(
      localTxs,
      deletedTxIds,
      remoteTxs || [],
      (l: MoneyTransaction) => {
        let accId = l.accountId;
        if (accountMerge.idRemap.has(accId)) {
          accId = accountMerge.idRemap.get(accId)!;
        }
        if (!validAccountIds.has(accId) && accountMerge.mergedLocal.length > 0) {
          accId = accountMerge.mergedLocal[0].id;
        }

        let toAccId = l.toAccountId || null;
        if (toAccId && accountMerge.idRemap.has(toAccId)) {
          toAccId = accountMerge.idRemap.get(toAccId)!;
        }
        if (toAccId && !validAccountIds.has(toAccId)) {
          toAccId = null;
        }

        return {
          id: l.id,
          user_id: userId,
          type: l.type || 'expense',
          amount: Number(l.amount || 0),
          category: l.category || 'General',
          subcategory: l.subcategory || null,
          account_id: accId,
          to_account_id: toAccId,
          date: ensureTimestamp(l.date, nowStr),
          note: l.note || null,
          is_recurring: l.isRecurring || false,
          recurring_frequency: l.recurringFrequency || null,
          attachment_uri: l.attachmentUri || null,
          is_deleted: false,
          updated_at: ensureTimestamp(l.updatedAt, nowStr),
        };
      },
      (r: any): MoneyTransaction => {
        let accId = r.account_id;
        if (accountMerge.idRemap.has(accId)) {
          accId = accountMerge.idRemap.get(accId)!;
        }
        if (!validAccountIds.has(accId) && accountMerge.mergedLocal.length > 0) {
          accId = accountMerge.mergedLocal[0].id;
        }

        let toAccId = r.to_account_id || undefined;
        if (toAccId && accountMerge.idRemap.has(toAccId)) {
          toAccId = accountMerge.idRemap.get(toAccId)!;
        }
        if (toAccId && !validAccountIds.has(toAccId)) {
          toAccId = undefined;
        }

        return {
          id: r.id,
          type: r.type as any,
          amount: Number(r.amount),
          category: r.category,
          subcategory: r.subcategory || undefined,
          accountId: accId,
          toAccountId: toAccId,
          date: r.date,
          note: r.note || undefined,
          isRecurring: r.is_recurring,
          recurringFrequency: r.recurring_frequency || undefined,
          attachmentUri: r.attachment_uri || undefined,
          updatedAt: r.updated_at,
        };
      },
      getMoneyTxFingerprint
    );

    // ----------------------------------------------------
    // TABLE 3: LOANS (PARENT OF EMIS)
    // ----------------------------------------------------
    const localLoans = forcePull ? [] : (useMoneyStore.getState().loans || []);
    const deletedLoanIds = forcePull ? [] : (useMoneyStore.getState().deletedLoanIds || []);
    
    const { data: remoteLoans, error: loansFetchError } = await supabase
      .from('loans')
      .select('*')
      .eq('user_id', userId);
      
    if (loansFetchError) throw loansFetchError;

    const loansMerge = mergeTable(
      localLoans,
      deletedLoanIds,
      remoteLoans || [],
      (l: Loan) => {
        let linkedAccId = l.linkedAccountId || null;
        if (linkedAccId && accountMerge.idRemap.has(linkedAccId)) {
          linkedAccId = accountMerge.idRemap.get(linkedAccId)!;
        }
        if (linkedAccId && !validAccountIds.has(linkedAccId)) {
          linkedAccId = null;
        }

        return {
          id: l.id,
          user_id: userId,
          name: l.name || 'Loan',
          lender_name: l.lenderName || '',
          principal_amount: Number(l.principalAmount || 0),
          outstanding_amount: Number(l.outstandingAmount || 0),
          interest_rate: Number(l.interestRate || 0),
          emi_amount: Number(l.emiAmount || 0),
          tenure_months: Number(l.tenureMonths || 0),
          start_date: ensureTimestamp(l.startDate, nowStr),
          end_date: ensureTimestamp(l.endDate, nowStr),
          linked_account_id: linkedAccId,
          type: l.type || 'borrowed',
          is_active: l.isActive !== false,
          is_deleted: false,
          updated_at: ensureTimestamp(l.updatedAt, nowStr),
        };
      },
      (r: any): Loan => {
        let linkedAccId = r.linked_account_id || undefined;
        if (linkedAccId && accountMerge.idRemap.has(linkedAccId)) {
          linkedAccId = accountMerge.idRemap.get(linkedAccId)!;
        }
        if (linkedAccId && !validAccountIds.has(linkedAccId)) {
          linkedAccId = undefined;
        }

        return {
          id: r.id,
          name: r.name,
          lenderName: r.lender_name,
          principalAmount: Number(r.principal_amount),
          outstandingAmount: Number(r.outstanding_amount),
          interestRate: Number(r.interest_rate),
          emiAmount: Number(r.emi_amount),
          tenureMonths: r.tenure_months,
          startDate: r.start_date,
          endDate: r.end_date,
          linkedAccountId: linkedAccId,
          type: r.type as any,
          isActive: r.is_active,
          updatedAt: r.updated_at,
        };
      },
      getLoanFingerprint
    );

    const validLoanIds = new Set(loansMerge.mergedLocal.map(l => l.id));

    // ----------------------------------------------------
    // TABLE 4: EMI PAYMENTS (CHILD OF LOANS)
    // ----------------------------------------------------
    const localEmis = forcePull ? [] : (useMoneyStore.getState().emiPayments || []);
    const deletedEmiIds = forcePull ? [] : (useMoneyStore.getState().deletedEmiPaymentIds || []);
    
    const { data: remoteEmis, error: emisFetchError } = await supabase
      .from('emi_payments')
      .select('*')
      .eq('user_id', userId);
      
    if (emisFetchError) throw emisFetchError;

    const emisMerge = mergeTable(
      localEmis,
      deletedEmiIds,
      remoteEmis || [],
      (l: EMIPayment) => {
        let loanId = l.loanId;
        if (loansMerge.idRemap.has(loanId)) {
          loanId = loansMerge.idRemap.get(loanId)!;
        }
        if (!validLoanIds.has(loanId) && loansMerge.mergedLocal.length > 0) {
          loanId = loansMerge.mergedLocal[0].id;
        }

        return {
          id: l.id,
          user_id: userId,
          loan_id: loanId,
          amount: Number(l.amount || 0),
          principal_portion: Number(l.principalPortion || 0),
          interest_portion: Number(l.interestPortion || 0),
          date: ensureTimestamp(l.date, nowStr),
          status: l.status || 'paid',
          transaction_id: l.transactionId || null,
          is_deleted: false,
          updated_at: ensureTimestamp(l.updatedAt, nowStr),
        };
      },
      (r: any): EMIPayment => {
        let loanId = r.loan_id;
        if (loansMerge.idRemap.has(loanId)) {
          loanId = loansMerge.idRemap.get(loanId)!;
        }
        if (!validLoanIds.has(loanId) && loansMerge.mergedLocal.length > 0) {
          loanId = loansMerge.mergedLocal[0].id;
        }

        return {
          id: r.id,
          loanId: loanId,
          amount: Number(r.amount),
          principalPortion: Number(r.principal_portion),
          interestPortion: Number(r.interest_portion),
          date: r.date,
          status: r.status as any,
          transactionId: r.transaction_id || undefined,
          updatedAt: r.updated_at,
        };
      },
      getEmiFingerprint
    );

    // ----------------------------------------------------
    // TABLE 5: BUDGETS & BUDGET CATEGORIES
    // ----------------------------------------------------
    const localBudgets = forcePull ? [] : (useMoneyStore.getState().budgets || []);
    const deletedBudgetIds = forcePull ? [] : (useMoneyStore.getState().deletedBudgetIds || []);
    
    const { data: remoteBudgets, error: budgetsFetchError } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId);
      
    if (budgetsFetchError) throw budgetsFetchError;

    const budgetsMerge = mergeTable(
      localBudgets,
      deletedBudgetIds,
      remoteBudgets || [],
      (l: Budget) => ({
        id: l.id,
        user_id: userId,
        name: l.name || 'Budget',
        period: l.period || 'monthly',
        start_date: ensureTimestamp(l.startDate, nowStr),
        end_date: ensureTimestamp(l.endDate, nowStr),
        total_limit: Number(l.totalLimit || 0),
        is_active: l.isActive !== false,
        is_deleted: false,
        updated_at: ensureTimestamp(l.updatedAt, nowStr),
      }),
      (r: any): Budget => ({
        id: r.id,
        name: r.name,
        period: r.period as any,
        startDate: r.start_date,
        endDate: r.end_date,
        totalLimit: Number(r.total_limit),
        categories: [], // will populate categories after merging budget_categories
        isActive: r.is_active,
        updatedAt: r.updated_at,
      }),
      getBudgetFingerprint
    );

    const validBudgetIds = new Set(budgetsMerge.mergedLocal.map(b => b.id));

    // Sync categories of Budgets
    const localCategories: (BudgetCategory & { budgetId: string })[] = [];
    localBudgets.forEach(b => {
      if (b.categories) {
        b.categories.forEach(c => {
          localCategories.push({ ...c, budgetId: b.id });
        });
      }
    });
    const deletedCategoryIds = forcePull ? [] : (useMoneyStore.getState().deletedBudgetCategoryIds || []);

    const { data: remoteCategories, error: catsFetchError } = await supabase
      .from('budget_categories')
      .select('*')
      .eq('user_id', userId);

    if (catsFetchError) throw catsFetchError;

    const catsMerge = mergeTable(
      localCategories,
      deletedCategoryIds,
      remoteCategories || [],
      (l: BudgetCategory & { budgetId: string }) => {
        let bId = l.budgetId;
        if (budgetsMerge.idRemap.has(bId)) {
          bId = budgetsMerge.idRemap.get(bId)!;
        }
        if (!validBudgetIds.has(bId) && budgetsMerge.mergedLocal.length > 0) {
          bId = budgetsMerge.mergedLocal[0].id;
        }

        return {
          id: l.id,
          user_id: userId,
          budget_id: bId,
          name: l.name || 'Category',
          icon: l.icon || 'Layers',
          color: l.color || '#007AFF',
          limit_amount: Number(l.limit || 0),
          spent: Number(l.spent || 0),
          is_deleted: false,
          updated_at: ensureTimestamp(l.updatedAt, nowStr),
        };
      },
      (r: any) => {
        let bId = r.budget_id;
        if (budgetsMerge.idRemap.has(bId)) {
          bId = budgetsMerge.idRemap.get(bId)!;
        }
        if (!validBudgetIds.has(bId) && budgetsMerge.mergedLocal.length > 0) {
          bId = budgetsMerge.mergedLocal[0].id;
        }

        return {
          id: r.id,
          budgetId: bId,
          name: r.name,
          icon: r.icon,
          color: r.color,
          limit: Number(r.limit_amount),
          spent: Number(r.spent),
          updatedAt: r.updated_at,
        };
      },
      getBudgetCategoryFingerprint
    );

    // Reconstruct budgets categories
    const budgetsWithCats = budgetsMerge.mergedLocal.map(b => {
      const cats = catsMerge.mergedLocal
        .filter(c => c.budgetId === b.id)
        .map(({ budgetId, ...c }) => c as BudgetCategory);
      return { ...b, categories: cats };
    });

    // ----------------------------------------------------
    // TABLE 6: SUBSCRIPTIONS (PARENT OF SUB PAYMENTS)
    // ----------------------------------------------------
    const localSubs = forcePull ? [] : (useMoneyStore.getState().subscriptions || []);
    const deletedSubIds = forcePull ? [] : (useMoneyStore.getState().deletedSubscriptionIds || []);
    
    const { data: remoteSubs, error: subsFetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId);
      
    if (subsFetchError) throw subsFetchError;

    const subsMerge = mergeTable(
      localSubs,
      deletedSubIds,
      remoteSubs || [],
      (l: Subscription) => {
        let linkedAccId = l.linkedAccountId || null;
        if (linkedAccId && accountMerge.idRemap.has(linkedAccId)) {
          linkedAccId = accountMerge.idRemap.get(linkedAccId)!;
        }
        if (linkedAccId && !validAccountIds.has(linkedAccId)) {
          linkedAccId = null;
        }

        return {
          id: l.id,
          user_id: userId,
          name: l.name || 'Subscription',
          provider: l.provider || '',
          amount: Number(l.amount || 0),
          billing_cycle: l.billingCycle || 'monthly',
          next_payment_date: ensureTimestamp(l.nextPaymentDate, nowStr),
          linked_account_id: linkedAccId,
          category: l.category || 'Entertainment',
          is_active: l.isActive !== false,
          logo: l.logo || null,
          color: l.color || '#007AFF',
          is_deleted: false,
          updated_at: ensureTimestamp(l.updatedAt, nowStr),
        };
      },
      (r: any): Subscription => {
        let linkedAccId = r.linked_account_id || undefined;
        if (linkedAccId && accountMerge.idRemap.has(linkedAccId)) {
          linkedAccId = accountMerge.idRemap.get(linkedAccId)!;
        }
        if (linkedAccId && !validAccountIds.has(linkedAccId)) {
          linkedAccId = undefined;
        }

        return {
          id: r.id,
          name: r.name,
          provider: r.provider,
          amount: Number(r.amount),
          billingCycle: r.billing_cycle as any,
          nextPaymentDate: r.next_payment_date,
          linkedAccountId: linkedAccId,
          category: r.category,
          isActive: r.is_active,
          logo: r.logo || undefined,
          color: r.color,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        };
      },
      getSubFingerprint
    );

    const validSubIds = new Set(subsMerge.mergedLocal.map(s => s.id));

    // ----------------------------------------------------
    // TABLE 7: SUBSCRIPTION PAYMENTS (CHILD OF SUBSCRIPTIONS)
    // ----------------------------------------------------
    const localSubPayments = forcePull ? [] : (useMoneyStore.getState().subscriptionPayments || []);
    const deletedSubPayIds = forcePull ? [] : (useMoneyStore.getState().deletedSubscriptionPaymentIds || []);
    
    const { data: remoteSubPayments, error: subPaymentsFetchError } = await supabase
      .from('subscription_payments')
      .select('*')
      .eq('user_id', userId);
      
    if (subPaymentsFetchError) throw subPaymentsFetchError;

    const subPaymentsMerge = mergeTable(
      localSubPayments,
      deletedSubPayIds,
      remoteSubPayments || [],
      (l: SubscriptionPayment) => {
        let subId = l.subscriptionId;
        if (subsMerge.idRemap.has(subId)) {
          subId = subsMerge.idRemap.get(subId)!;
        }
        if (!validSubIds.has(subId) && subsMerge.mergedLocal.length > 0) {
          subId = subsMerge.mergedLocal[0].id;
        }

        return {
          id: l.id,
          user_id: userId,
          subscription_id: subId,
          amount: Number(l.amount || 0),
          date: ensureTimestamp(l.date, nowStr),
          status: l.status || 'paid',
          transaction_id: l.transactionId || null,
          is_deleted: false,
          updated_at: ensureTimestamp(l.updatedAt, nowStr),
        };
      },
      (r: any): SubscriptionPayment => {
        let subId = r.subscription_id;
        if (subsMerge.idRemap.has(subId)) {
          subId = subsMerge.idRemap.get(subId)!;
        }
        if (!validSubIds.has(subId) && subsMerge.mergedLocal.length > 0) {
          subId = subsMerge.mergedLocal[0].id;
        }

        return {
          id: r.id,
          subscriptionId: subId,
          amount: Number(r.amount),
          date: r.date,
          status: r.status as any,
          transactionId: r.transaction_id || undefined,
          updatedAt: r.updated_at,
        };
      },
      getSubPaymentFingerprint
    );

    // ----------------------------------------------------
    // TABLE 8: PORTFOLIO TRANSACTIONS (INVESTMENTS)
    // ----------------------------------------------------
    const localPortfolioTxs = forcePull ? [] : (usePortfolioStore.getState().transactions || []);
    const deletedPortfolioTxIds = forcePull ? [] : (usePortfolioStore.getState().deletedTransactionIds || []);
    
    const { data: remotePortfolioTxs, error: portfolioTxsFetchError } = await supabase
      .from('portfolio_transactions')
      .select('*')
      .eq('user_id', userId);
      
    if (portfolioTxsFetchError) throw portfolioTxsFetchError;

    const portfolioMerge = mergeTable(
      localPortfolioTxs,
      deletedPortfolioTxIds,
      remotePortfolioTxs || [],
      (l: Transaction) => ({
        id: l.id,
        user_id: userId,
        symbol: l.symbol || '',
        quantity: Number(l.quantity || 0),
        price: Number(l.price || 0),
        date: ensureTimestamp(l.date, nowStr),
        type: l.type || 'BUY',
        currency: l.currency || 'INR',
        broker: l.broker || '',
        is_deleted: false,
        updated_at: ensureTimestamp(l.updatedAt, nowStr),
      }),
      (r: any): Transaction => ({
        id: r.id,
        symbol: r.symbol,
        quantity: Number(r.quantity),
        price: Number(r.price),
        date: r.date,
        type: r.type as any,
        currency: r.currency,
        broker: r.broker,
        updatedAt: r.updated_at,
      }),
      getPortfolioTxFingerprint
    );

    // ----------------------------------------------------
    // TABLE 9: WATCHLIST (STOCK SYMBOLS)
    // ----------------------------------------------------
    const localWatchlist = forcePull ? [] : (usePortfolioStore.getState().watchlist || []);
    const deletedWatchIds = forcePull ? [] : (usePortfolioStore.getState().deletedWatchlistIds || []);
    
    const { data: remoteWatchlist, error: watchFetchError } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', userId);
      
    if (watchFetchError) throw watchFetchError;

    // watchlists are array of strings locally. Map to symbols object.
    const localWatchlistObj = localWatchlist.map(sym => ({ id: sym, symbol: sym }));

    const watchMerge = mergeTable(
      localWatchlistObj,
      deletedWatchIds,
      remoteWatchlist || [],
      (l: { id: string; symbol: string }) => ({
        id: l.id,
        user_id: userId,
        symbol: l.symbol,
        is_deleted: false,
        updated_at: nowStr,
      }),
      (r: any) => ({
        id: r.symbol,
        symbol: r.symbol,
      }),
      getWatchlistFingerprint
    );

    const mergedWatchlist = watchMerge.mergedLocal.map(o => o.symbol);

    // ----------------------------------------------------
    // EXECUTE ALL PUSH MUTATIONS (PARENT TABLES FIRST)
    // ----------------------------------------------------
    const pushTasks = [
      // 1. Independent parent entities
      { name: 'accounts', data: accountMerge.toPush.map(item => ({ ...item, user_id: userId })) },
      { name: 'loans', data: loansMerge.toPush.map(item => ({ ...item, user_id: userId })) },
      { name: 'budgets', data: budgetsMerge.toPush.map(item => ({ ...item, user_id: userId })) },
      { name: 'subscriptions', data: subsMerge.toPush.map(item => ({ ...item, user_id: userId })) },
      { name: 'watchlist', data: watchMerge.toPush.map(item => ({ ...item, user_id: userId })) },
      { name: 'portfolio_transactions', data: portfolioMerge.toPush.map(item => ({ ...item, user_id: userId })) },

      // 2. Dependent child entities (foreign key references)
      { name: 'money_transactions', data: txsMerge.toPush.map(item => ({ ...item, user_id: userId })) },
      { name: 'emi_payments', data: emisMerge.toPush.map(item => ({ ...item, user_id: userId })) },
      { name: 'budget_categories', data: catsMerge.toPush.map(item => ({ ...item, user_id: userId })) },
      { name: 'subscription_payments', data: subPaymentsMerge.toPush.map(item => ({ ...item, user_id: userId })) },
    ];

    for (const task of pushTasks) {
      if (task.data.length > 0) {
        const { error: upsertError } = await supabase
          .from(task.name)
          .upsert(task.data);
          
        if (upsertError) {
          console.error(`Error syncing table ${task.name}:`, upsertError);
          throw upsertError;
        }
      }
    }

    // ----------------------------------------------------
    // EXECUTE ALL DELETIONS (CHILD TABLES FIRST, PARENTS LAST)
    // ----------------------------------------------------
    const deleteTasks = [
      // 1. Delete dependent child records first to satisfy FK constraints
      { name: 'money_transactions', ids: [...deletedTxIds, ...txsMerge.duplicateRemoteIdsToDelete] },
      { name: 'emi_payments', ids: [...deletedEmiIds, ...emisMerge.duplicateRemoteIdsToDelete] },
      { name: 'budget_categories', ids: [...deletedCategoryIds, ...catsMerge.duplicateRemoteIdsToDelete] },
      { name: 'subscription_payments', ids: [...deletedSubPayIds, ...subPaymentsMerge.duplicateRemoteIdsToDelete] },
      { name: 'portfolio_transactions', ids: [...deletedPortfolioTxIds, ...portfolioMerge.duplicateRemoteIdsToDelete] },
      { name: 'watchlist', ids: [...deletedWatchIds, ...watchMerge.duplicateRemoteIdsToDelete] },

      // 2. Delete parent entities last
      { name: 'budgets', ids: [...deletedBudgetIds, ...budgetsMerge.duplicateRemoteIdsToDelete] },
      { name: 'loans', ids: [...deletedLoanIds, ...loansMerge.duplicateRemoteIdsToDelete] },
      { name: 'subscriptions', ids: [...deletedSubIds, ...subsMerge.duplicateRemoteIdsToDelete] },
      { name: 'accounts', ids: [...deletedAccountIds, ...accountMerge.duplicateRemoteIdsToDelete] },
    ];

    for (const task of deleteTasks) {
      if (task.ids.length > 0) {
        const { error: deleteError } = await supabase
          .from(task.name)
          .delete()
          .in('id', task.ids);

        if (deleteError) {
          console.error(`Error deleting from table ${task.name}:`, deleteError);
          throw deleteError;
        }
      }
    }

    // ----------------------------------------------------
    // UPDATE ZUSTAND STORES WITH THE MERGED DATA
    // ----------------------------------------------------
    
    // useMoneyStore batch update
    useMoneyStore.setState({
      accounts: accountMerge.mergedLocal,
      moneyTransactions: txsMerge.mergedLocal,
      loans: loansMerge.mergedLocal,
      emiPayments: emisMerge.mergedLocal,
      budgets: budgetsWithCats,
      subscriptions: subsMerge.mergedLocal,
      subscriptionPayments: subPaymentsMerge.mergedLocal,
      
      // Clear tracking lists since they are successfully synced
      deletedAccountIds: [],
      deletedTransactionIds: [],
      deletedLoanIds: [],
      deletedEmiPaymentIds: [],
      deletedBudgetIds: [],
      deletedBudgetCategoryIds: [],
      deletedSubscriptionIds: [],
      deletedSubscriptionPaymentIds: [],
    });

    // usePortfolioStore batch update
    usePortfolioStore.setState({
      transactions: portfolioMerge.mergedLocal,
      watchlist: mergedWatchlist,
      
      // Clear tracking lists
      deletedTransactionIds: [],
      deletedWatchlistIds: [],
      lastSyncedAt: Date.now(),
    });

    // Force run portfolio stores analysis calculations & ticker update
    usePortfolioStore.getState().fetchTickers().catch((e) => console.warn('Sync post-fetch tickers error:', e));
    usePortfolioStore.getState().calculateSummary();

    isSyncing = false;
    return { success: true, message: 'Sync complete!', timestamp: Date.now() };

  } catch (error: any) {
    isSyncing = false;
    console.error('Two-way Cloud Sync Error:', error);
    return { success: false, message: error.message || 'An error occurred during sync', timestamp: Date.now() };
  }
}

export async function wipeCloudData(): Promise<{ success: boolean; message: string }> {
  try {
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session?.user) {
      return { success: false, message: 'User is not logged in' };
    }

    const userId = session.user.id;

    const tablesToWipe = [
      'accounts',
      'money_transactions',
      'loans',
      'emi_payments',
      'budgets',
      'budget_categories',
      'subscriptions',
      'subscription_payments',
      'portfolio_transactions',
      'watchlist',
    ];

    for (const t of tablesToWipe) {
      const { error } = await supabase
        .from(t)
        .delete()
        .eq('user_id', userId);
      if (error) throw error;
    }

    // Reset profile device registration
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ primary_device_id: null, updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (profileError) throw profileError;

    // Reset last synced time in store
    usePortfolioStore.setState({ lastSyncedAt: null });

    return { success: true, message: 'Cloud data successfully wiped' };
  } catch (error: any) {
    console.error('Wipe Cloud Data Error:', error);
    return { success: false, message: error.message || 'Failed to wipe cloud data' };
  }
}
