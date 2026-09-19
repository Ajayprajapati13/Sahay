// Example scam messages for trying out the scam checker (nothing here is used as real user data)
const sampleData = {
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
