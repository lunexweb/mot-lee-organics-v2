export const COMPANY_EFT_DETAILS = {
  accountName: 'MOT LEE ORGANICS (PTY) LTD',
  accountNumber: '4123365997',
  accountType: 'Current',
  branchCode: '632005',
  swiftCode: 'ABSAZAJJ',
  salesEmail: 'sales@motleeorganics.com',
  whatsapp: '+27 66 147 4766',
  invoiceFooter: 'Powered by www.lunexweb.com',
}

// Complete SA banks list for auto-fill in bank detail forms
export const SOUTH_AFRICAN_BANKS: Array<{
  name: string
  universalBranchCode: string
  swiftCode: string
}> = [
  // Big 5 Banks
  { name: 'Absa', universalBranchCode: '632005', swiftCode: 'ABSAZAJJ' },
  { name: 'First National Bank (FNB)', universalBranchCode: '250655', swiftCode: 'FIRNZAJJ' },
  { name: 'Standard Bank', universalBranchCode: '051001', swiftCode: 'SBZAZAJJ' },
  { name: 'Nedbank', universalBranchCode: '198765', swiftCode: 'NEDSZAJJ' },
  { name: 'Capitec Bank', universalBranchCode: '470010', swiftCode: 'CABLZAJJ' },
  
  // Other Major Banks
  { name: 'Investec Bank', universalBranchCode: '580105', swiftCode: 'IVESZAJJ' },
  { name: 'African Bank', universalBranchCode: '430000', swiftCode: 'AFRIZAJJ' },
  { name: 'Bidvest Bank', universalBranchCode: '462005', swiftCode: 'BIDVZAJJ' },
  { name: 'Discovery Bank', universalBranchCode: '679000', swiftCode: 'DISCZAJJ' },
  { name: 'Grindrod Bank', universalBranchCode: '587000', swiftCode: 'GRINZAJJ' },
  { name: 'Mercantile Bank', universalBranchCode: '450905', swiftCode: 'MERCZAJJ' },
  { name: 'Postbank', universalBranchCode: '460010', swiftCode: 'POBLZAJJ' },
  { name: 'TymeBank', universalBranchCode: '678910', swiftCode: 'TYMEZAJJ' },
  { name: 'Bank Zero', universalBranchCode: '678911', swiftCode: 'BANKZAJJ' },
  { name: 'Bank of Athens', universalBranchCode: '410105', swiftCode: 'BANKZAJJ' },
  { name: 'GBS Mutual Bank', universalBranchCode: '578000', swiftCode: 'GBSMZAJJ' },
  { name: 'HBZ Bank', universalBranchCode: '551605', swiftCode: 'HBZBZAJJ' },
  { name: 'Mzanzi Bank', universalBranchCode: '462015', swiftCode: 'MZANZAJJ' },
  { name: 'SASFIN Bank', universalBranchCode: '683000', swiftCode: 'SASFZAJJ' },
  { name: 'Ubank', universalBranchCode: '470015', swiftCode: 'UBANZAJJ' },
  { name: 'VBS Mutual Bank', universalBranchCode: '588000', swiftCode: 'VBSMZAJJ' },
]


