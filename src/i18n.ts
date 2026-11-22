export type Locale = 'am' | 'en';

export interface Translations {
  schoolName: string;
  nav: {
    ariaMain: string;
    ariaMobile: string;
    home: string;
    apps: string;
    guide: string;
    admin: string;
    downloadCta: string;
    downloadShort: string;
  };
  langSwitcher: {
    label: string;
    amharic: string;
    english: string;
  };
  hero: {
    kicker: string;
    subtitle: string;
    campusAlt: string;
    crestAlt: string;
  };
  cards: {
    ariaSection: string;
    downloadTitle: string;
    downloadDesc: string;
    checkingApps: string;
    zeroApps: string;
    readyApps: (count: number) => string;
    open: string;
    adminTitle: string;
    adminDesc: string;
    adminProtected: string;
    adminSignedIn: (user: string) => string;
    login: string;
    goToAdmin: string;
  };
  download: {
    backHome: string;
    refresh: string;
    title: string;
    subtitle: string;
    loading: string;
    emptyTitle: string;
    emptySubtitle: string;
    downloadsCount: (count: number) => string;
    downloadBtn: string;
    guideTitle: string;
    step1Label: string;
    step1Text: string;
    step2Label: string;
    step2Text: string;
    step3Label: string;
    step3Text: string;
  };
  admin: {
    backHome: string;
    loginTitle: string;
    loginDesc: string;
    usernameLabel: string;
    usernamePlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    showPassword: string;
    hidePassword: string;
    verifying: string;
    loginBtn: string;
    missingCredsError: string;
    loginFailedError: string;
    adminLabel: string;
    logout: string;
    uploadTitle: string;
    uploadDesc: string;
    pickFileTitle: string;
    pickFileHint: string;
    sizePrefix: string;
    changeFile: string;
    appNameLabel: string;
    versionLabel: string;
    descLabel: string;
    descPlaceholder: string;
    uploadBtn: string;
    cancelBtn: string;
    uploadingTitle: string;
    uploadCompleteBadge: string;
    publishPrompt: string;
    publishingBtn: string;
    publishBtn: string;
    uploadAnotherBtn: string;
    listTitle: (count: number) => string;
    refreshing: string;
    listEmpty: string;
    statusPublished: string;
    statusStaged: string;
    downloadsShort: (count: number) => string;
    unpublishBtn: string;
    confirmDeleteYes: string;
    confirmDeleteNo: string;
    deleteBtn: string;
    onlyApkError: string;
    defaultAppName: string;
    publishedSuccess: (name: string) => string;
    unpublishedSuccess: string;
    deletedSuccess: string;
    networkError: string;
    serverParseError: string;
    fetchAppsError: string;
    unknownError: string;
    storageGithubActive: string;
    storageLocalNotice: string;
  };
  footer: {
    copyright: (year: number) => string;
  };
}

export const TRANSLATIONS: Record<Locale, Translations> = {
  am: {
    schoolName: 'ዋግ ስዩም አድማሱ ወሰን 2ኛ ደረጃ ትምህርት ቤት',
    nav: {
      ariaMain: 'ዋና ማውጫ',
      ariaMobile: 'የሞባይል ማውጫ',
      home: 'መነሻ',
      apps: 'አፕሊኬሽኖች',
      guide: 'አጫጫን መመሪያ',
      admin: 'አድሚን',
      downloadCta: 'አፕ አውርድ',
      downloadShort: 'አውርድ',
    },
    langSwitcher: {
      label: 'ቋንቋ / Language',
      amharic: 'አማርኛ',
      english: 'English',
    },
    hero: {
      kicker: 'ይፋዊ የትምህርት ቤት መተግበሪያ ማውረጃ ድረ-ገጽ',
      subtitle:
        'የትምህርት ቤቱን የአንድሮይድ (APK) መተግበሪያዎች ያለ ምንም ሎጊን በቀጥታ ያውርዱና በስልክዎ ላይ ይጫኑ።',
      campusAlt: 'ዋግ ስዩም አድማሱ ወሰን 2ኛ ደረጃ ትምህርት ቤት ግቢ',
      crestAlt: 'የዋግ ስዩም አድማሱ ወሰን 2ኛ ደረጃ ትምህርት ቤት አርማ',
    },
    cards: {
      ariaSection: 'ዋና አገልግሎቶች',
      downloadTitle: 'አፕሊኬሽን ለማውረድ',
      downloadDesc:
        'ለተማሪዎችና ለጎብኚዎች። ምንም አይነት የይለፍ ቃል ወይም ሎጊን ሳይጠይቅ የተለቀቁትን የኤፒኬ ፋይሎች በቀጥታ ያውርዱ።',
      checkingApps: 'በመፈለግ ላይ...',
      zeroApps: '0 አፕሊኬሽኖች ተጭነዋል',
      readyApps: (count) => `${count} አፕሊኬሽን ለማውረድ ዝግጁ ነው`,
      open: 'ክፈት',
      adminTitle: 'አድሚን',
      adminDesc:
        'ለትምህርት ቤቱ አስተዳዳሪ ብቻ። ከስልክ ፋይል ማኔጀር ኤፒኬ ፋይሎችን አፕሎድ ለማድረግ እና ለተጠቃሚዎች ለመልቀቅ።',
      adminProtected: 'በተጠቃሚ ስም እና የይለፍ ቃል የተጠበቀ',
      adminSignedIn: (user) => `ገብተዋል (${user})`,
      login: 'ግባ',
      goToAdmin: 'ወደ አድሚን ሂድ',
    },
    download: {
      backHome: 'ወደ መነሻ ተመለስ',
      refresh: 'አድስ',
      title: 'አፕሊኬሽን ለማውረድ',
      subtitle:
        'የዋግ ስዩም አድማሱ ወሰን 2ኛ ደረጃ ትምህርት ቤት የአንድሮይድ (APK) መተግበሪያዎችን ያለ ምንም መግቢያ እዚህ ማውረድ እና በስልክዎ ላይ መጫን ይችላሉ።',
      loading: 'አፕሊኬሽኖች በመፈለግ ላይ ናቸው...',
      emptyTitle: 'ምንም አይነት አፕሊኬሽን አልተጫነም',
      emptySubtitle:
        'አስተዳዳሪው አዲስ የኤፒኬ (APK) ፋይል ሲጭን እና ሲለቅ ወዲያውኑ እዚህ ዝርዝር ውስጥ ይመጣል።',
      downloadsCount: (count) => `${count} ጊዜ ወርዷል`,
      downloadBtn: 'ዳውንሎድ አድርግ (.apk)',
      guideTitle: 'አፕሊኬሽኑን ካወረዱ በኋላ በስልክዎ እንዴት ይጫናል?',
      step1Label: '01. ያውርዱ',
      step1Text: 'ከላይ ያለውን «ዳውንሎድ አድርግ» የሚለውን ቁልፍ ይጫኑና የኤፒኬ ፋይሉ እስኪወርድ ይጠብቁ።',
      step2Label: '02. ፋይሉን ይክፈቱ',
      step2Text: 'ሲወርድ ከላይ በሚመጣው ማሳወቂያ ወይም በስልክዎ «Downloads» አቃፊ ውስጥ ያለውን ፋይል ይንኩት።',
      step3Label: '03. ኢንስታል ያድርጉ',
      step3Text: 'ስልክዎ ከጠየቀ «Allow from this source» የሚለውን አብርተው «Install» የሚለውን በመጫን ይክፈቱት።',
    },
    admin: {
      backHome: 'ወደ መነሻ ተመለስ',
      loginTitle: 'አድሚን መግቢያ',
      loginDesc:
        'ይህ ክፍል ለአስተዳዳሪው ብቻ ነው። የኤፒኬ (APK) ፋይሎችን ለመጫንና ለመልቀቅ የተጠቃሚ ስም እና የይለፍ ቃል ያስገቡ።',
      usernameLabel: 'የተጠቃሚ ስም (Username)',
      usernamePlaceholder: 'የተጠቃሚ ስም ያስገቡ',
      passwordLabel: 'የይለፍ ቃል (Password)',
      passwordPlaceholder: 'የይለፍ ቃል ያስገቡ',
      showPassword: 'የይለፍ ቃል አሳይ',
      hidePassword: 'የይለፍ ቃል ደብቅ',
      verifying: 'በማረጋገጥ ላይ...',
      loginBtn: 'ግባ',
      missingCredsError: 'እባክዎ የተጠቃሚ ስም እና የይለፍ ቃል ያስገቡ።',
      loginFailedError: 'መግባት አልተቻለም።',
      adminLabel: 'አድሚን',
      logout: 'ውጣ',
      uploadTitle: 'ፋይል ኤፒኬ አፕሎድ ለማድረግ',
      uploadDesc:
        'ከስልክዎ ወይም ከኮምፒውተርዎ የኤፒኬ (.apk) ፋይል ይምረጡ፣ አፕሎድ ያድርጉና 100% ሲሞላ «ልቀቅ» የሚለውን ይጫኑ።',
      pickFileTitle: 'ፋይል ኤፒኬ አፕሎድ ለማድረግ ይምረጡ',
      pickFileHint: 'ይህንን ሲነኩ ወደ ስልክዎ ፋይሎች (Internal Storage) ይወስድዎታል · .apk እስከ 250 MB',
      sizePrefix: 'መጠን:',
      changeFile: 'ሌላ ፋይል ቀይር',
      appNameLabel: 'የአፕሊኬሽኑ ስም',
      versionLabel: 'ስሪት (Version)',
      descLabel: 'አጭር መግለጫ (አማራጭ)',
      descPlaceholder: 'ለምሳሌ: የ2018 ዓ.ም የተማሪዎች መማሪያ መተግበሪያ',
      uploadBtn: 'አፕሎድ አድርግ',
      cancelBtn: 'ሰርዝ',
      uploadingTitle: 'ኤፒኬ ፋይሉ በመጫን ላይ ነው...',
      uploadCompleteBadge: '100% አፕሎድ ተጠናቋል!',
      publishPrompt: 'ተማሪዎች እና ተጠቃሚዎች አፕሊኬሽኑን ማውረድ እንዲችሉ አሁን «ልቀቅ» የሚለውን ቁልፍ ይጫኑ።',
      publishingBtn: 'በመልቀቅ ላይ...',
      publishBtn: 'ልቀቅ',
      uploadAnotherBtn: 'ሌላ ፋይል ጫን',
      listTitle: (count) => `የተጫኑ አፕሊኬሽኖች ዝርዝር (${count})`,
      refreshing: 'በማደስ ላይ...',
      listEmpty: 'እስካሁን የተጫነ የኤፒኬ ፋይል የለም። ከላይ ያለውን ቁልፍ ተጭነው የመጀመሪያውን ኤፒኬ ይጫኑ።',
      statusPublished: 'ተለቋል (ለህዝብ ክፍት)',
      statusStaged: 'ለመልቀቅ ዝግጁ (ገና አልተለቀቀም)',
      downloadsShort: (count) => `${count} ዳውንሎድ`,
      unpublishBtn: 'ደብቅ',
      confirmDeleteYes: 'አዎ አጥፋ',
      confirmDeleteNo: 'ተው',
      deleteBtn: 'አጥፋ',
      onlyApkError: 'እባክዎ .apk ፋይል ብቻ ይምረጡ።',
      defaultAppName: 'ዋግ ስዩም አድማሱ ወሰን አፕሊኬሽን',
      publishedSuccess: (name) => `«${name}» በተሳካ ሁኔታ ተለቋል! ተጠቃሚዎች አሁን ማውረድ ይችላሉ።`,
      unpublishedSuccess: 'አፕሊኬሽኑ ከህዝብ ማውረጃ ዝርዝር ተነስቷል።',
      deletedSuccess: 'አፕሊኬሽኑ ተሰርዟል።',
      networkError: 'የኢንተርኔት ወይም የሰርቨር ግንኙነት ተቋርጧል። እባክዎ እንደገና ይሞክሩ።',
      serverParseError: 'የሰርቨር ምላሽ ስህተት ተከስቷል።',
      fetchAppsError: 'ዝርዝሩን ማምጣት አልተቻለም።',
      unknownError: 'ያልታወቀ ስህተት ተከስቷል።',
      storageGithubActive: 'ቋሚ ማከማቻ (GitHub Releases) በርቷል — የተጫኑ ፋይሎች Render ቢታደስም አይጠፉም።',
      storageLocalNotice: 'ጊዜያዊ ማከማቻ ላይ ነው — በRender ላይ ፋይሎች ቋሚ እንዲሆኑ GITHUB_TOKEN ያስገቡ።',
    },
    footer: {
      copyright: (year) => `© ${year} ዋግ ስዩም አድማሱ ወሰን 2ኛ ደረጃ ትምህርት ቤት — የመተግበሪያ ማውረጃ ፖርታል`,
    },
  },
  en: {
    schoolName: 'Wag Siyum Admasu Wosen Secondary School',
    nav: {
      ariaMain: 'Main navigation',
      ariaMobile: 'Mobile navigation',
      home: 'Home',
      apps: 'Applications',
      guide: 'Install Guide',
      admin: 'Admin',
      downloadCta: 'Download App',
      downloadShort: 'Download',
    },
    langSwitcher: {
      label: 'Language',
      amharic: 'አማርኛ',
      english: 'English',
    },
    hero: {
      kicker: 'Official School Application Download Portal',
      subtitle:
        'Download the school Android (APK) applications directly with no login required and install them on your phone.',
      campusAlt: 'Wag Siyum Admasu Wosen Secondary School campus',
      crestAlt: 'Wag Siyum Admasu Wosen Secondary School emblem',
    },
    cards: {
      ariaSection: 'Main Services',
      downloadTitle: 'Download Application',
      downloadDesc:
        'For students and visitors. Directly download published APK files without any password or login.',
      checkingApps: 'Checking apps...',
      zeroApps: '0 applications uploaded',
      readyApps: (count) =>
        `${count} ${count === 1 ? 'application' : 'applications'} ready to download`,
      open: 'Open',
      adminTitle: 'Admin',
      adminDesc:
        'For the school administrator only. Upload APK files from your phone storage and publish them for users.',
      adminProtected: 'Protected by username and password',
      adminSignedIn: (user) => `Signed in (${user})`,
      login: 'Login',
      goToAdmin: 'Go to Admin',
    },
    download: {
      backHome: 'Back to Home',
      refresh: 'Refresh',
      title: 'Download Application',
      subtitle:
        'Download official Android (APK) applications from Wag Siyum Admasu Wosen Secondary School with no login required.',
      loading: 'Loading applications...',
      emptyTitle: 'No application has been uploaded yet',
      emptySubtitle:
        'Once the administrator uploads and publishes a new APK file, it will appear right here.',
      downloadsCount: (count) => `${count} ${count === 1 ? 'download' : 'downloads'}`,
      downloadBtn: 'Download (.apk)',
      guideTitle: 'How to install the application on your phone after downloading',
      step1Label: '01. Download',
      step1Text: 'Tap the "Download (.apk)" button above and wait for the APK file to finish downloading.',
      step2Label: '02. Open the file',
      step2Text: 'Tap the completed download notification or open the file in your phone’s "Downloads" folder.',
      step3Label: '03. Install',
      step3Text: 'If prompted, turn on "Allow from this source", then tap "Install" to open the app.',
    },
    admin: {
      backHome: 'Back to Home',
      loginTitle: 'Admin Login',
      loginDesc:
        'This section is for the administrator only. Enter your authorized username and password to upload and publish APK files.',
      usernameLabel: 'Username',
      usernamePlaceholder: 'Enter username',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter password',
      showPassword: 'Show password',
      hidePassword: 'Hide password',
      verifying: 'Verifying...',
      loginBtn: 'Login',
      missingCredsError: 'Please enter both username and password.',
      loginFailedError: 'Unable to log in.',
      adminLabel: 'Admin',
      logout: 'Logout',
      uploadTitle: 'Upload APK File',
      uploadDesc:
        'Choose an APK (.apk) file from your phone or computer, upload it to 100%, and tap "Publish" to release it.',
      pickFileTitle: 'Choose APK File to Upload',
      pickFileHint: 'Tapping this opens your phone storage / file manager · .apk up to 250 MB',
      sizePrefix: 'Size:',
      changeFile: 'Change file',
      appNameLabel: 'Application Name',
      versionLabel: 'Version',
      descLabel: 'Short Description (Optional)',
      descPlaceholder: 'Example: Student study guide application',
      uploadBtn: 'Upload',
      cancelBtn: 'Cancel',
      uploadingTitle: 'Uploading APK file...',
      uploadCompleteBadge: '100% Upload Complete!',
      publishPrompt: 'Tap "Publish" now so students and visitors can see and download this application.',
      publishingBtn: 'Publishing...',
      publishBtn: 'Publish',
      uploadAnotherBtn: 'Upload Another File',
      listTitle: (count) => `Uploaded Applications (${count})`,
      refreshing: 'Refreshing...',
      listEmpty: 'No APK files uploaded yet. Use the upload box above to add your first APK.',
      statusPublished: 'Published (Public)',
      statusStaged: 'Ready to publish (Not public yet)',
      downloadsShort: (count) => `${count} ${count === 1 ? 'download' : 'downloads'}`,
      unpublishBtn: 'Unpublish',
      confirmDeleteYes: 'Yes, Delete',
      confirmDeleteNo: 'Cancel',
      deleteBtn: 'Delete',
      onlyApkError: 'Please select a valid .apk file only.',
      defaultAppName: 'Wag Siyum Admasu Wosen App',
      publishedSuccess: (name) => `"${name}" is now published! Visitors can download it immediately.`,
      unpublishedSuccess: 'Application has been hidden from the public download list.',
      deletedSuccess: 'Application deleted.',
      networkError: 'Network or server connection lost. Please try again.',
      serverParseError: 'Invalid response received from server.',
      fetchAppsError: 'Could not load uploaded applications.',
      unknownError: 'An unknown error occurred.',
      storageGithubActive: 'Permanent storage (GitHub Releases) is active — uploaded APKs persist across restarts.',
      storageLocalNotice: 'Using temporary local disk — add GITHUB_TOKEN on Render for permanent APK storage.',
    },
    footer: {
      copyright: (year) =>
        `© ${year} Wag Siyum Admasu Wosen Secondary School — Application Download Portal`,
    },
  },
};
