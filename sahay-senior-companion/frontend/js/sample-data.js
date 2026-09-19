// Preloaded authentic sample assets and text data
const sampleData = {
  passbook: {
    bank_name: "State Bank of India (SBI)",
    branch_name: "Malleshwaram 8th Cross Branch, Bengaluru",
    branch_address: "Margosa Road, Near Post Office, Opposite Old Banyan Tree",
    account_number_masked: "SBI •••• 4821",
    ifsc_code: "SBIN0001234",
    customer_name: "Ajay Kumar Sharma",
    account_type: "Senior Citizen Pension Savings",
    balance: "₹34,520",
    last_pension_expected: "₹28,000",
    svg_preview: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240"><rect width="400" height="240" rx="16" fill="%231E3A8A"/><rect x="12" y="12" width="376" height="216" rx="12" fill="%23F8FAFC"/><text x="32" y="44" font-family="Arial" font-size="18" font-weight="bold" fill="%231E3A8A">STATE BANK OF INDIA</text><text x="32" y="66" font-family="Arial" font-size="12" fill="%2364748B">Malleshwaram 8th Cross Branch (IFSC: SBIN0001234)</text><line x1="32" y1="78" x2="368" y2="78" stroke="%23CBD5E1" stroke-width="1.5"/><text x="32" y="105" font-family="Arial" font-size="14" fill="%23334155">Account Holder:</text><text x="160" y="105" font-family="Arial" font-size="14" font-weight="bold" fill="%230F172A">Ajay Kumar Sharma</text><text x="32" y="135" font-family="Arial" font-size="14" fill="%23334155">Account Number:</text><text x="160" y="135" font-family="Arial" font-size="16" font-weight="bold" fill="%231E3A8A">•••• •••• 4821</text><text x="32" y="165" font-family="Arial" font-size="14" fill="%23334155">Scheme:</text><text x="160" y="165" font-family="Arial" font-size="13" font-weight="bold" fill="%230D9488">Senior Citizen Pension Savings</text><rect x="32" y="185" width="160" height="28" rx="6" fill="%23DCFCE7"/><text x="42" y="204" font-family="Arial" font-size="12" font-weight="bold" fill="%2315803D">✔ Verified Genuine</text></svg>`
  },
  
  prescription: {
    doctor_name: "Dr. V. Sharma, M.D. (Cardiology)",
    clinic: "Apollo Clinic & Heart Care, Malleshwaram",
    date: "18-Sep-2026",
    medicines: [
      { name: "Telmisartan 40mg", dosage: "1 Tablet", when: "Morning after breakfast (9:00 AM)", purpose: "Controls blood pressure" },
      { name: "Atorvastatin 10mg", dosage: "1 Tablet", when: "Night after dinner (9:30 PM)", purpose: "Cholesterol balance" },
      { name: "Shelcal 500", dosage: "1 Tablet", when: "After lunch (2:00 PM)", purpose: "Bone health" }
    ],
    svg_preview: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240"><rect width="400" height="240" rx="16" fill="%230D9488"/><rect x="12" y="12" width="376" height="216" rx="12" fill="%23FFFFFF"/><text x="32" y="44" font-family="Arial" font-size="17" font-weight="bold" fill="%230D9488">APOLLO CLINIC &amp; HEART CARE</text><text x="32" y="66" font-family="Arial" font-size="13" fill="%23334155">Dr. V. Sharma, M.D. (Cardiology) - Reg #28419</text><line x1="32" y1="78" x2="368" y2="78" stroke="%23E2E8F0" stroke-width="1.5"/><text x="32" y="105" font-family="Arial" font-size="13" font-weight="bold" fill="%231E3A8A">Rx: Telmisartan 40mg (1 tab morning OD)</text><text x="32" y="130" font-family="Arial" font-size="13" font-weight="bold" fill="%231E3A8A">Rx: Atorvastatin 10mg (1 tab at bedtime)</text><text x="32" y="155" font-family="Arial" font-size="13" font-weight="bold" fill="%231E3A8A">Rx: Shelcal 500 (1 tab daily after food)</text><text x="32" y="195" font-family="Arial" font-size="12" fill="%2364748B">Advice: Regular morning walking 20 mins. BP 130/85 (Stable).</text></svg>`
  },

  scamMessages: {
    electricity: {
      title: "Fake Electricity Disconnection Threat",
      sender: "+91 98765 43210 (WhatsApp)",
      text: "Dear Consumer, your electricity power will be disconnected tonight at 9:30 PM from power office because your previous month bill was not update. Please immediately call electricity officer at 9876543210. BESCOM/TNEB.",
      svg_preview: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="220" viewBox="0 0 400 220"><rect width="400" height="220" rx="16" fill="%23DC2626"/><rect x="12" y="12" width="376" height="196" rx="12" fill="%23FFF1F2"/><text x="32" y="44" font-family="Arial" font-size="16" font-weight="bold" fill="%23991B1B">🚨 FORWARDED SMS (SUSPICIOUS)</text><text x="32" y="75" font-family="Arial" font-size="13" fill="%231F2937">"Dear Consumer, your electricity power will</text><text x="32" y="95" font-family="Arial" font-size="13" fill="%231F2937">be disconnected TONIGHT at 9:30 PM.</text><text x="32" y="115" font-family="Arial" font-size="13" fill="%231F2937">Call officer urgently at 9876543210."</text><rect x="32" y="145" width="220" height="32" rx="8" fill="%23FEE2E2"/><text x="44" y="166" font-family="Arial" font-size="12" font-weight="bold" fill="%23B91C1C">Fake Urgency Detected</text></svg>`
    },
    pensionApk: {
      title: "Fake Digital Life Certificate APK",
      sender: "VM-PENSN",
      text: "Dear Pensioner, your monthly pension credit is on hold due to missing Life Certificate (Jeevan Pramaan). Urgently download and install PensionUpdate.apk from http://fake-pension-gov.in/app to avoid account cancellation."
    }
  }
};
