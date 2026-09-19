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
    
    greeting_morning: "Good morning, Ajay uncle!",
    greeting_sub: "You have 2 items planned today: your blood pressure tablet and your State Bank pension visit.",
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
    
    greeting_morning: "सुप्रभात, अजय अंकल जी!",
    greeting_sub: "आज आपके 2 काम हैं: सुबह की बीपी की दवाई और एसबीआई बैंक से पेंशन की जानकारी।",
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
