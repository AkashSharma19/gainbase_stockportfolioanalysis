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
 * Generic two-way merge function for individual tables
 */
function mergeTable<Local extends { id: string; updatedAt?: string }, Remote extends { id: string; user_id: string; updated_at: string; is_deleted: boolean }>(
  localItems: Local[],
  deletedLocalIds: string[],
  remoteItems: Remote[],
  mapLocalToRemote: (l: Local, userId: string) => any,
  mapRemoteToLocal: (r: Remote) => Local
): {
  mergedLocal: Local[];
  toPush: any[];
} {
  const localMap = new Map(localItems.map((item) => [item.id, item]));
  const remoteMap = new Map(remoteItems.map((item) => [item.id, item]));
  const deletedSet = new Set(deletedLocalIds);

  const mergedLocal: Local[] = [];
  const toPush: any[] = [];

  // Process local active items
  for (const local of localItems) {
    if (deletedSet.has(local.id)) {
      // Local item has been deleted -> will be processed via deletedLocalIds block below
      continue;
    }

    const remote = remoteMap.get(local.id);
    if (!remote) {
      // Exists locally but not remotely -> push to remote
      mergedLocal.push(local);
      const remoteRecord = mapLocalToRemote(local, ''); // userId will be filled before push
      toPush.push(remoteRecord);
    } else {
      // Exists in both -> compare updatedAt timestamps
      const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
      const remoteTime = new Date(remote.updated_at).getTime();

      if (remote.is_deleted) {
        // Remote says deleted -> delete locally
        // (Do not add to mergedLocal, no need to push)
      } else if (localTime > remoteTime) {
        // Local is newer -> push local to remote
        mergedLocal.push(local);
        toPush.push(mapLocalToRemote(local, ''));
      } else {
        // Remote is newer or equal -> pull remote to local
        mergedLocal.push(mapRemoteToLocal(remote));
      }
    }
  }



  // Process remote items that do not exist locally
  for (const remote of remoteItems) {
    if (!localMap.has(remote.id) && !deletedSet.has(remote.id)) {
      if (!remote.is_deleted) {
        // Remote is new and active -> pull it
        mergedLocal.push(mapRemoteToLocal(remote));
      }
    }
  }

  return { mergedLocal, toPush };
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
      if (mode === 'force_push' || mode === 'force_pull') {
        // Force overwrite -> switch primary device
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({ primary_device_id: localDeviceId, updated_at: nowStr })
          .eq('id', userId);
        if (updateErr) throw updateErr;

        if (mode === 'force_push') {
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
    // TABLE 1: ACCOUNTS
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
        name: l.name,
        type: l.type,
        balance: l.balance,
        icon: l.icon,
        color: l.color,
        institution: l.institution || null,
        logo: l.logo || null,
        account_number: l.accountNumber || null,
        credit_limit: l.creditLimit || null,
        interest_rate: l.interestRate || null,
        include_in_assets: l.includeInAssets !== false,
        linked_broker: l.linkedBroker || null,
        is_archived: l.isArchived || false,
        is_deleted: false,
        updated_at: l.updatedAt || nowStr,
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
      })
    );

    // ----------------------------------------------------
    // TABLE 2: MONEY TRANSACTIONS
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
      (l: MoneyTransaction) => ({
        id: l.id,
        user_id: userId,
        type: l.type,
        amount: l.amount,
        category: l.category,
        subcategory: l.subcategory || null,
        account_id: l.accountId,
        to_account_id: l.toAccountId || null,
        date: l.date,
        note: l.note || null,
        is_recurring: l.isRecurring || false,
        recurring_frequency: l.recurringFrequency || null,
        attachment_uri: l.attachmentUri || null,
        is_deleted: false,
        updated_at: l.updatedAt || nowStr,
      }),
      (r: any): MoneyTransaction => ({
        id: r.id,
        type: r.type as any,
        amount: Number(r.amount),
        category: r.category,
        subcategory: r.subcategory || undefined,
        accountId: r.account_id,
        toAccountId: r.to_account_id || undefined,
        date: r.date,
        note: r.note || undefined,
        isRecurring: r.is_recurring,
        recurringFrequency: r.recurring_frequency || undefined,
        attachmentUri: r.attachment_uri || undefined,
        updatedAt: r.updated_at,
      })
    );

    // ----------------------------------------------------
    // TABLE 3: LOANS
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
      (l: Loan) => ({
        id: l.id,
        user_id: userId,
        name: l.name,
        lender_name: l.lenderName,
        principal_amount: l.principalAmount,
        outstanding_amount: l.outstandingAmount,
        interest_rate: l.interestRate,
        emi_amount: l.emiAmount,
        tenure_months: l.tenureMonths,
        start_date: l.startDate,
        end_date: l.endDate,
        linked_account_id: l.linkedAccountId || null,
        type: l.type,
        is_active: l.isActive,
        is_deleted: false,
        updated_at: l.updatedAt || nowStr,
      }),
      (r: any): Loan => ({
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
        linkedAccountId: r.linked_account_id || undefined,
        type: r.type as any,
        isActive: r.is_active,
        updatedAt: r.updated_at,
      })
    );

    // ----------------------------------------------------
    // TABLE 4: EMI PAYMENTS
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
      (l: EMIPayment) => ({
        id: l.id,
        user_id: userId,
        loan_id: l.loanId,
        amount: l.amount,
        principal_portion: l.principalPortion,
        interest_portion: l.interestPortion,
        date: l.date,
        status: l.status,
        transaction_id: l.transactionId || null,
        is_deleted: false,
        updated_at: l.updatedAt || nowStr,
      }),
      (r: any): EMIPayment => ({
        id: r.id,
        loanId: r.loan_id,
        amount: Number(r.amount),
        principalPortion: Number(r.principal_portion),
        interestPortion: Number(r.interest_portion),
        date: r.date,
        status: r.status as any,
        transactionId: r.transaction_id || undefined,
        updatedAt: r.updated_at,
      })
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
        name: l.name,
        period: l.period,
        start_date: l.startDate,
        end_date: l.endDate,
        total_limit: l.totalLimit,
        is_active: l.isActive,
        is_deleted: false,
        updated_at: l.updatedAt || nowStr,
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
      })
    );

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
      (l: BudgetCategory & { budgetId: string }) => ({
        id: l.id,
        user_id: userId,
        budget_id: l.budgetId,
        name: l.name,
        icon: l.icon,
        color: l.color,
        limit_amount: l.limit,
        spent: l.spent,
        is_deleted: false,
        updated_at: l.updatedAt || nowStr,
      }),
      (r: any) => ({
        id: r.id,
        budgetId: r.budget_id,
        name: r.name,
        icon: r.icon,
        color: r.color,
        limit: Number(r.limit_amount),
        spent: Number(r.spent),
        updatedAt: r.updated_at,
      })
    );

    // Reconstruct budgets categories
    const budgetsWithCats = budgetsMerge.mergedLocal.map(b => {
      const cats = catsMerge.mergedLocal
        .filter(c => c.budgetId === b.id)
        .map(({ budgetId, ...c }) => c as BudgetCategory);
      return { ...b, categories: cats };
    });

    // ----------------------------------------------------
    // TABLE 6: SUBSCRIPTIONS
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
      (l: Subscription) => ({
        id: l.id,
        user_id: userId,
        name: l.name,
        provider: l.provider,
        amount: l.amount,
        billing_cycle: l.billingCycle,
        next_payment_date: l.nextPaymentDate,
        linked_account_id: l.linkedAccountId || null,
        category: l.category,
        is_active: l.isActive,
        logo: l.logo || null,
        color: l.color,
        is_deleted: false,
        updated_at: l.updatedAt || nowStr,
      }),
      (r: any): Subscription => ({
        id: r.id,
        name: r.name,
        provider: r.provider,
        amount: Number(r.amount),
        billingCycle: r.billing_cycle as any,
        nextPaymentDate: r.next_payment_date,
        linkedAccountId: r.linked_account_id || undefined,
        category: r.category,
        isActive: r.is_active,
        logo: r.logo || undefined,
        color: r.color,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })
    );

    // ----------------------------------------------------
    // TABLE 7: SUBSCRIPTION PAYMENTS
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
      (l: SubscriptionPayment) => ({
        id: l.id,
        user_id: userId,
        subscription_id: l.subscriptionId,
        amount: l.amount,
        date: l.date,
        status: l.status,
        transaction_id: l.transactionId || null,
        is_deleted: false,
        updated_at: l.updatedAt || nowStr,
      }),
      (r: any): SubscriptionPayment => ({
        id: r.id,
        subscriptionId: r.subscription_id,
        amount: Number(r.amount),
        date: r.date,
        status: r.status as any,
        transactionId: r.transaction_id || undefined,
        updatedAt: r.updated_at,
      })
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
        symbol: l.symbol,
        quantity: l.quantity,
        price: l.price,
        date: l.date,
        type: l.type,
        currency: l.currency,
        broker: l.broker,
        is_deleted: false,
        updated_at: l.updatedAt || nowStr,
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
      })
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
      })
    );

    const mergedWatchlist = watchMerge.mergedLocal.map(o => o.symbol);

    // ----------------------------------------------------
    // EXECUTE ALL PUSH MUTATIONS TO SUPABASE
    // ----------------------------------------------------
    
    // We execute batches inside a transaction or sequential operations
    const pushTasks = [
      { name: 'accounts', data: accountMerge.toPush.map(item => ({ ...item, user_id: userId })) },
      { name: 'money_transactions', data: txsMerge.toPush.map(item => ({ ...item, user_id: userId })) },
      { name: 'loans', data: loansMerge.toPush.map(item => ({ ...item, user_id: userId })) },
      { name: 'emi_payments', data: emisMerge.toPush.map(item => ({ ...item, user_id: userId })) },
      { name: 'budgets', data: budgetsMerge.toPush.map(item => ({ ...item, user_id: userId })) },
      { name: 'budget_categories', data: catsMerge.toPush.map(item => ({ ...item, user_id: userId })) },
      { name: 'subscriptions', data: subsMerge.toPush.map(item => ({ ...item, user_id: userId })) },
      { name: 'subscription_payments', data: subPaymentsMerge.toPush.map(item => ({ ...item, user_id: userId })) },
      { name: 'portfolio_transactions', data: portfolioMerge.toPush.map(item => ({ ...item, user_id: userId })) },
      { name: 'watchlist', data: watchMerge.toPush.map(item => ({ ...item, user_id: userId })) },
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
    // EXECUTE ALL DELETIONS (HARD DELETES)
    // ----------------------------------------------------
    const deleteTasks = [
      { name: 'accounts', ids: deletedAccountIds },
      { name: 'money_transactions', ids: deletedTxIds },
      { name: 'loans', ids: deletedLoanIds },
      { name: 'emi_payments', ids: deletedEmiIds },
      { name: 'budgets', ids: deletedBudgetIds },
      { name: 'budget_categories', ids: deletedCategoryIds },
      { name: 'subscriptions', ids: deletedSubIds },
      { name: 'subscription_payments', ids: deletedSubPayIds },
      { name: 'portfolio_transactions', ids: deletedPortfolioTxIds },
      { name: 'watchlist', ids: deletedWatchIds },
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

    // Force run portfolio stores analysis calculations if active
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
