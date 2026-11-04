// FIXED VERSION - Replace the downloadOfflineTemplate function section

// CHANGE THIS SECTION (around line 149-180):

// OLD CODE:
/*
    // Combined reference sheet: Products (cols A-C) | gap (col D) | Advisors (cols E-F)
    const maxRows = Math.max(users.length, cards.length, 1);
    const refData: any[] = [];

    // Header row
    refData.push({
      'product_category': 'product_category',
      'bank_name': 'bank_name',
      'product_name': 'product_name',
      '_gap': '',
      'user_id': 'user_id (Copy this to Excel)',
      'advisor_name': 'advisor_name',
    });

    for (let i = 0; i < maxRows; i++) {
      const u = users[i];
      const c = cards[i];
      const bankName = c ? (typeof c.bank === 'string' ? c.bank : (c.bank?.name || c.bankName || '')) : '';
      const userId = u ? (u.id || '') : '';
      const userName = u ? (u.name || '') : '';
      
      refData.push({
        'product_category': c ? (c.type || 'credit_card') : '',
        'bank_name': bankName,
        'product_name': c ? (c.name || '') : '',
        '_gap': '',
        'user_id': userId,  // This is the actual DB user ID (e.g., CH0934B74F)
        'advisor_name': userName,
      });
    }
*/

// NEW CODE:
    // Combined reference sheet: Products (cols A-C) | gap (col D) | Advisors (cols E-F)
    // FILTER OUT users who are REFERRED BY others - only show independent advisors/managers
    const activeAdvisors = users.filter(u => !u.referredById);
    const maxRows = Math.max(activeAdvisors.length, cards.length, 1);
    const refData: any[] = [];

    // Header row
    refData.push({
      'product_category': 'product_category',
      'bank_name': 'bank_name',
      'product_name': 'product_name',
      '_gap': '',
      'user_id': 'user_id (Copy this to Excel)',
      'advisor_name': 'advisor_name',
    });

    for (let i = 0; i < maxRows; i++) {
      const u = activeAdvisors[i];
      const c = cards[i];
      const bankName = c ? (typeof c.bank === 'string' ? c.bank : (c.bank?.name || c.bankName || '')) : '';
      const userId = u ? (u.id || '') : '';
      const userName = u ? (u.name || '') : '';
      
      refData.push({
        'product_category': c ? (c.type || 'credit_card') : '',
        'bank_name': bankName,
        'product_name': c ? (c.name || '') : '',
        '_gap': '',
        'user_id': userId,
        'advisor_name': userName,
      });
    }
