// Sahay Bilingual Language Engine (English & Hindi)
const translations = {
  en: {
    app_title: "Sahay",
    tagline: "Your Caring Companion for Independence & Peace of Mind",
    tab_dashboard: "🏠 Things I'm Tracking",
    tab_bank: "🏦 Bank Visit",
    tab_transport: "🚗 Rides & Errands",
    tab_health: "💊 Health & Doctor",
    tab_scam: "🛡️ Safety & Scams",
    tab_family: "👨‍👩‍👧 Family Portal",
    
    greeting_morning: "Good morning!",
    greeting_sub: "Sahay is here to help you today.",
    btn_listen_greeting: "🔊 Read Today's Plan",
    
    voice_tap_prompt: "Tap or Speak to Sahay",
    voice_listening: "Listening gently... Speak now",
    voice_hint: "Try: 'Take me to the bank', 'Check my pension', or 'Scan my prescription'",
    
    step_prepare: "1. Prepare",
    step_assist: "2. Assist (At Branch)",
    step_followup: "3. Follow Up",
    
    btn_confirm: "Yes, Go Ahead",
    btn_change: "Change Something",
    btn_read_back: "🔊 Read Aloud",
    
    bank_title: "Bank Visit",
    bank_purpose_prompt: "What is the primary purpose of your bank visit today?",
    btn_purpose_withdraw: "💵 Withdraw Cash (₹10,000)",
    btn_purpose_pension: "📋 Pension Credit Enquiry",
    btn_purpose_kyc: "🪪 Update KYC & Phone",
    btn_purpose_form: "📝 Submit Form 15H",
    
    passbook_upload_prompt: "Photograph or Select Your Passbook",
    btn_take_photo: "📷 Open Camera / Upload",
    btn_scan_passbook: "📷 Add a Photo of My Passbook",
    btn_sign_in: "Sign in",
    btn_close: "Close",
    profile_title: "About me",
    profile_name_label: "Your name",
    profile_save_name: "Save my name",
    profile_saved: "Saved. Sahay will use your name.",
    profile_cleared: "Name removed.",
    login_title: "Sign in with your mobile number",
    login_intro: "We will send a code by SMS. Enter it here to sign in.",
    login_phone_label: "Mobile number",
    login_send_code: "Send me a code",
    login_sent_to: "A code was sent to",
    login_code_label: "Code from the SMS",
    login_verify: "Verify and sign in",
    login_change_number: "Use a different number",
    login_signed_in: "You are signed in with",
    login_sign_out: "Sign out",
    login_not_enabled: "Signing in with a mobile number is not switched on yet. You can still save your name.",
    login_need_phone: "Please enter your mobile number.",
    login_need_code: "Please enter the code from the SMS.",
    login_success: "You are signed in.",
    login_signed_out: "You are signed out.",
    login_check_details: "Please check the details and try again.",
    login_offline: "I could not reach the server. Please check your internet and try again.",
    
    checklist_title: "Checklist: Things to Bring With You",
    route_title: "How Would You Like to Travel?",
    btn_book_cab: "🚗 Book Cab (Fare: ₹140)",
    btn_landmark_route: "🚶 Landmark Walking / Bus Route",
    
    kiosk_arrival_title: "In-Branch Assistant: Welcome to SBI Malleshwaram",
    token_label: "Your Priority Token Number",
    queue_wait_label: "Estimated Wait Time",
    counter_guide_title: "What to Do at Counter 3",
    
    followup_title: "Visit Summary & Follow-Up",
    followup_resolved_question: "Did your bank visit go smoothly today?",
    btn_resolved_yes: "✅ Yes, Everything Was Handled",
    btn_resolved_no: "⚠️ No, My Pension is Still Delayed",
    
    scam_headline_safe: "✅ Verified Safe Document",
    scam_headline_danger: "🚨 Warning: Fake Scam Alert Detected!",
    btn_report_block: "🛑 Block & Delete Message",
    btn_share_family: "📲 Share with Family to Double-Check"
  },
  hi: {
    app_title: "सहाय (Sahay)",
    tagline: "बुजुर्गों का सच्चा, सुरक्षित और भरोसेमंद साथी",
    tab_dashboard: "🏠 आज का हिसाब",
    tab_bank: "🏦 बैंक यात्रा",
    tab_transport: "🚗 गाड़ी और सामान",
    tab_health: "💊 दवाई और डॉक्टर",
    tab_scam: "🛡️ फ्रॉड से सुरक्षा",
    tab_family: "👨‍👩‍👧 परिवार लिंक",
    
    greeting_morning: "सुप्रभात!",
    greeting_sub: "सहाय आज आपकी मदद के लिए यहाँ है।",
    btn_listen_greeting: "🔊 आज का प्लान सुनें",
    
    voice_tap_prompt: "माइक दबाएं या बोलें",
    voice_listening: "सहाय सुन रहा है... बोलिए",
    voice_hint: "कहिए: 'मुझे बैंक जाना है', 'दवाई का पर्चा देखो', या 'गाड़ी बुलाओ'",
    
    step_prepare: "1. तैयारी",
    step_assist: "2. बैंक में सहायता",
    step_followup: "3. बाद का काम",
    
    btn_confirm: "हाँ, आगे बढ़ें",
    btn_change: "कुछ बदलना है",
    btn_read_back: "🔊 पढ़कर सुनाएं",
    
    bank_title: "बैंक यात्रा",
    bank_purpose_prompt: "आज आप बैंक में क्या काम करवाना चाहते हैं?",
    btn_purpose_withdraw: "💵 पैसे निकालना (₹10,000)",
    btn_purpose_pension: "📋 पेंशन का पता करना",
    btn_purpose_kyc: "🪪 आधार व मोबाइल लिंक",
    btn_purpose_form: "📝 फॉर्म 15H जमा करना",
    
    passbook_upload_prompt: "पासबुक की फोटो खींचें या चुनें",
    btn_take_photo: "📷 कैमरा खोलें / फोटो अपलोड",
    btn_scan_passbook: "📷 अपनी पासबुक की फोटो जोड़ें",
    btn_sign_in: "साइन इन",
    btn_close: "बंद करें",
    profile_title: "मेरे बारे में",
    profile_name_label: "आपका नाम",
    profile_save_name: "मेरा नाम सहेजें",
    profile_saved: "सहेज लिया। सहाय अब आपके नाम का उपयोग करेगा।",
    profile_cleared: "नाम हटा दिया गया।",
    login_title: "मोबाइल नंबर से साइन इन करें",
    login_intro: "हम एसएमएस से एक कोड भेजेंगे। साइन इन करने के लिए उसे यहाँ डालें।",
    login_phone_label: "मोबाइल नंबर",
    login_send_code: "मुझे कोड भेजें",
    login_sent_to: "कोड भेजा गया:",
    login_code_label: "एसएमएस में आया कोड",
    login_verify: "जाँचें और साइन इन करें",
    login_change_number: "दूसरा नंबर इस्तेमाल करें",
    login_signed_in: "आप इस नंबर से साइन इन हैं:",
    login_sign_out: "साइन आउट",
    login_not_enabled: "मोबाइल नंबर से साइन इन अभी चालू नहीं है। आप अपना नाम फिर भी सहेज सकते हैं।",
    login_need_phone: "कृपया अपना मोबाइल नंबर डालें।",
    login_need_code: "कृपया एसएमएस में आया कोड डालें।",
    login_success: "आप साइन इन हो गए हैं।",
    login_signed_out: "आप साइन आउट हो गए हैं।",
    login_check_details: "कृपया जानकारी जाँचकर फिर कोशिश करें।",
    login_offline: "सर्वर से संपर्क नहीं हो सका। कृपया इंटरनेट जाँचकर फिर कोशिश करें।",
    
    checklist_title: "साथ ले जाने वाले ज़रूरी दस्तावेज़",
    route_title: "आप बैंक कैसे जाना चाहेंगे?",
    btn_book_cab: "🚗 कैब बुक करें (किराया: ₹140)",
    btn_landmark_route: "🚶 पैदल या बस का आसान रास्ता",
    
    kiosk_arrival_title: "बैंक में स्वागत: एसबीआई मल्लेश्वरम",
    token_label: "आपका टोकन नंबर",
    queue_wait_label: "अनुमानित समय",
    counter_guide_title: "काउंटर नंबर 3 पर क्या करना है",
    
    followup_title: "विज़िट का हिसाब और फॉलो-अप",
    followup_resolved_question: "क्या आज बैंक में आपका काम पूरा हो गया?",
    btn_resolved_yes: "✅ हाँ, काम पूरा हो गया",
    btn_resolved_no: "⚠️ नहीं, पेंशन अभी भी अटकी है",
    
    scam_headline_safe: "✅ सुरक्षित और प्रामाणिक दस्तावेज़",
    scam_headline_danger: "🚨 सावधान: यह एक फर्जी संदेश (Scam) है!",
    btn_report_block: "🛑 संदेश हटाएं और ब्लॉक करें",
    btn_share_family: "📲 परिवार को भेजकर पुष्टि करें"
  }
};

let currentLang = localStorage.getItem("sahay_lang") || "en";

function t(key) {
  return (translations[currentLang] && translations[currentLang][key]) || translations["en"][key] || key;
}

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("sahay_lang", lang);
  document.documentElement.lang = lang;
  updateUITranslations();
}
