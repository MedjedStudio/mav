// タイムゾーン変換ユーティリティ

// タイムゾーンマッピング（ID -> IANA タイムゾーン名）
const TIMEZONE_MAP = {
  1: 'UTC',                          // UTC
  2: 'America/New_York',             // EST/EDT
  3: 'America/Chicago',              // CST/CDT
  4: 'America/Denver',               // MST/MDT
  5: 'America/Los_Angeles',          // PST/PDT
  6: 'America/Anchorage',            // AKST/AKDT
  7: 'America/Adak',                 // HST
  8: 'America/Toronto',              // EST/EDT
  9: 'America/Vancouver',            // PST/PDT
  10: 'America/Mexico_City',         // CST/CDT
  11: 'America/Sao_Paulo',           // BRT/BRST
  12: 'America/Argentina/Buenos_Aires', // ART
  13: 'America/Lima',                // PET
  14: 'America/Bogota',              // COT
  15: 'America/Caracas',             // VET
  16: 'America/Santiago',            // CLT/CLST
  17: 'Europe/London',               // GMT/BST
  18: 'Europe/Paris',                // CET/CEST
  19: 'Europe/Berlin',               // CET/CEST
  20: 'Europe/Madrid',               // CET/CEST
  21: 'Europe/Rome',                 // CET/CEST
  22: 'Europe/Amsterdam',            // CET/CEST
  23: 'Europe/Zurich',               // CET/CEST
  24: 'Europe/Vienna',               // CET/CEST
  25: 'Europe/Stockholm',            // CET/CEST
  26: 'Europe/Oslo',                 // CET/CEST
  27: 'Europe/Copenhagen',           // CET/CEST
  28: 'Europe/Helsinki',             // EET/EEST
  29: 'Europe/Moscow',               // MSK
  30: 'Europe/Warsaw',               // CET/CEST
  31: 'Europe/Prague',               // CET/CEST
  32: 'Europe/Budapest',             // CET/CEST
  33: 'Europe/Bucharest',            // EET/EEST
  34: 'Europe/Athens',               // EET/EEST
  35: 'Europe/Istanbul',             // TRT
  36: 'Europe/Kiev',                 // EET/EEST
  37: 'Asia/Tokyo',                  // JST
  38: 'Asia/Seoul',                  // KST
  39: 'Asia/Shanghai',               // CST
  40: 'Asia/Shanghai',               // CST (Beijing)
  41: 'Asia/Hong_Kong',              // HKT
  42: 'Asia/Taipei',                 // CST
  43: 'Asia/Singapore',              // SGT
  44: 'Asia/Kuala_Lumpur',           // MYT
  45: 'Asia/Jakarta',                // WIB
  46: 'Asia/Bangkok',                // ICT
  47: 'Asia/Ho_Chi_Minh',            // ICT
  48: 'Asia/Manila',                 // PHT
  49: 'Asia/Dhaka',                  // BST
  50: 'Asia/Kolkata',                // IST
  51: 'Asia/Karachi',                // PKT
  52: 'Asia/Tashkent',               // UZT
  53: 'Asia/Dubai',                  // GST
  54: 'Asia/Tehran',                 // IRST/IRDT
  55: 'Asia/Riyadh',                 // AST
  56: 'Asia/Kuwait',                 // AST
  57: 'Asia/Qatar',                  // AST
  58: 'Asia/Muscat',                 // GST
  59: 'Asia/Baku',                   // AZT
  60: 'Asia/Yerevan',                // AMT
  61: 'Asia/Tbilisi',                // GET
  62: 'Asia/Almaty',                 // ALMT
  63: 'Asia/Novosibirsk',            // NOVT
  64: 'Asia/Krasnoyarsk',            // KRAT
  65: 'Asia/Irkutsk',                // IRKT
  66: 'Asia/Yakutsk',                // YAKT
  67: 'Asia/Vladivostok',            // VLAT
  68: 'Asia/Magadan',                // MAGT
  69: 'Africa/Cairo',                // EET/EEST
  70: 'Africa/Johannesburg',         // SAST
  71: 'Africa/Nairobi',              // EAT
  72: 'Africa/Lagos',                // WAT
  73: 'Africa/Casablanca',           // WET/WEST
  74: 'Africa/Algiers',              // CET
  75: 'Africa/Tunis',                // CET
  76: 'Africa/Addis_Ababa',          // EAT
  77: 'Africa/Dar_es_Salaam',        // EAT
  78: 'Africa/Accra',                // GMT
  79: 'Africa/Abidjan',              // GMT
  80: 'Australia/Sydney',            // AEST/AEDT
  81: 'Australia/Melbourne',         // AEST/AEDT
  82: 'Australia/Brisbane',          // AEST
  83: 'Australia/Perth',             // AWST
  84: 'Australia/Adelaide',          // ACST/ACDT
  85: 'Australia/Darwin',            // ACST
  86: 'Pacific/Auckland',            // NZST/NZDT
  87: 'Pacific/Fiji',                // FJT/FJST
  88: 'Pacific/Tahiti',              // TAHT
  89: 'Pacific/Honolulu',            // HST
  90: 'Pacific/Guam',                // ChST
  91: 'Atlantic/Azores',             // AZOT/AZOST
  92: 'Atlantic/Cape_Verde',         // CVT
  93: 'Indian/Maldives',             // MVT
  94: 'Indian/Mauritius'             // MUT
}

// タイムゾーン名の表示用マッピング
const TIMEZONE_DISPLAY_NAMES = {
  1: 'UTC',
  2: 'Americas - New York (EST/EDT)',
  3: 'Americas - Chicago (CST/CDT)', 
  4: 'Americas - Denver (MST/MDT)',
  5: 'Americas - Los Angeles (PST/PDT)',
  6: 'Americas - Anchorage (AKST/AKDT)',
  7: 'Americas - Hawaii (HST)',
  8: 'Americas - Toronto (EST/EDT)',
  9: 'Americas - Vancouver (PST/PDT)',
  10: 'Americas - Mexico City (CST/CDT)',
  11: 'Americas - São Paulo (BRT/BRST)',
  12: 'Americas - Buenos Aires (ART)',
  13: 'Americas - Lima (PET)',
  14: 'Americas - Bogotá (COT)',
  15: 'Americas - Caracas (VET)',
  16: 'Americas - Santiago (CLT/CLST)',
  17: 'Europe - London (GMT/BST)',
  18: 'Europe - Paris (CET/CEST)',
  19: 'Europe - Berlin (CET/CEST)',
  20: 'Europe - Madrid (CET/CEST)',
  21: 'Europe - Rome (CET/CEST)',
  22: 'Europe - Amsterdam (CET/CEST)',
  23: 'Europe - Zurich (CET/CEST)',
  24: 'Europe - Vienna (CET/CEST)',
  25: 'Europe - Stockholm (CET/CEST)',
  26: 'Europe - Oslo (CET/CEST)',
  27: 'Europe - Copenhagen (CET/CEST)',
  28: 'Europe - Helsinki (EET/EEST)',
  29: 'Europe - Moscow (MSK)',
  30: 'Europe - Warsaw (CET/CEST)',
  31: 'Europe - Prague (CET/CEST)',
  32: 'Europe - Budapest (CET/CEST)',
  33: 'Europe - Bucharest (EET/EEST)',
  34: 'Europe - Athens (EET/EEST)',
  35: 'Europe - Istanbul (TRT)',
  36: 'Europe - Kiev (EET/EEST)',
  37: 'Asia/Pacific - Tokyo (JST)',
  38: 'Asia/Pacific - Seoul (KST)',
  39: 'Asia/Pacific - Shanghai (CST)',
  40: 'Asia/Pacific - Beijing (CST)',
  41: 'Asia/Pacific - Hong Kong (HKT)',
  42: 'Asia/Pacific - Taipei (CST)',
  43: 'Asia/Pacific - Singapore (SGT)',
  44: 'Asia/Pacific - Kuala Lumpur (MYT)',
  45: 'Asia/Pacific - Jakarta (WIB)',
  46: 'Asia/Pacific - Bangkok (ICT)',
  47: 'Asia/Pacific - Ho Chi Minh (ICT)',
  48: 'Asia/Pacific - Manila (PHT)',
  49: 'Asia/Pacific - Dhaka (BST)',
  50: 'Asia/Pacific - Mumbai (IST)',
  51: 'Asia/Pacific - Karachi (PKT)',
  52: 'Asia/Pacific - Tashkent (UZT)',
  53: 'Asia/Pacific - Dubai (GST)',
  54: 'Asia/Pacific - Tehran (IRST/IRDT)',
  55: 'Asia/Pacific - Riyadh (AST)',
  56: 'Asia/Pacific - Kuwait (AST)',
  57: 'Asia/Pacific - Doha (AST)',
  58: 'Asia/Pacific - Muscat (GST)',
  59: 'Asia/Pacific - Baku (AZT)',
  60: 'Asia/Pacific - Yerevan (AMT)',
  61: 'Asia/Pacific - Tbilisi (GET)',
  62: 'Asia/Pacific - Almaty (ALMT)',
  63: 'Asia/Pacific - Novosibirsk (NOVT)',
  64: 'Asia/Pacific - Krasnoyarsk (KRAT)',
  65: 'Asia/Pacific - Irkutsk (IRKT)',
  66: 'Asia/Pacific - Yakutsk (YAKT)',
  67: 'Asia/Pacific - Vladivostok (VLAT)',
  68: 'Asia/Pacific - Magadan (MAGT)',
  69: 'Africa - Cairo (EET/EEST)',
  70: 'Africa - Johannesburg (SAST)',
  71: 'Africa - Nairobi (EAT)',
  72: 'Africa - Lagos (WAT)',
  73: 'Africa - Casablanca (WET/WEST)',
  74: 'Africa - Algiers (CET)',
  75: 'Africa - Tunis (CET)',
  76: 'Africa - Addis Ababa (EAT)',
  77: 'Africa - Dar es Salaam (EAT)',
  78: 'Africa - Accra (GMT)',
  79: 'Africa - Abidjan (GMT)',
  80: 'Asia/Pacific - Sydney (AEST/AEDT)',
  81: 'Asia/Pacific - Melbourne (AEST/AEDT)',
  82: 'Asia/Pacific - Brisbane (AEST)',
  83: 'Asia/Pacific - Perth (AWST)',
  84: 'Asia/Pacific - Adelaide (ACST/ACDT)',
  85: 'Asia/Pacific - Darwin (ACST)',
  86: 'Asia/Pacific - Auckland (NZST/NZDT)',
  87: 'Asia/Pacific - Fiji (FJT/FJST)',
  88: 'Asia/Pacific - Tahiti (TAHT)',
  89: 'Asia/Pacific - Honolulu (HST)',
  90: 'Asia/Pacific - Guam (ChST)',
  91: 'Atlantic - Azores (AZOT/AZOST)',
  92: 'Atlantic - Cape Verde (CVT)',
  93: 'Asia/Pacific - Maldives (MVT)',
  94: 'Asia/Pacific - Mauritius (MUT)'
}

/**
 * UTC時刻文字列をユーザーのタイムゾーンに変換
 * @param {string} utcDateString - UTC時刻文字列 (ISO format)
 * @param {number} timezoneId - ユーザーのタイムゾーンID
 * @returns {string} - ローカライズされた時刻文字列
 */
export function formatDateToUserTimezone(utcDateString, timezoneId = 1) {
  if (!utcDateString) return ''
  
  const timezone = TIMEZONE_MAP[timezoneId] || 'UTC'
  const date = new Date(utcDateString)
  
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date)
}

/**
 * UTC時刻文字列をユーザーのタイムゾーンに変換（短縮形式）
 * @param {string} utcDateString - UTC時刻文字列
 * @param {number} timezoneId - ユーザーのタイムゾーンID
 * @returns {string} - 短縮形式の時刻文字列
 */
export function formatDateTimeShort(utcDateString, timezoneId = 1) {
  if (!utcDateString) return ''
  
  const timezone = TIMEZONE_MAP[timezoneId] || 'UTC'
  const date = new Date(utcDateString)
  
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: timezone,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

/**
 * タイムゾーンの表示名を取得
 * @param {number} timezoneId - タイムゾーンID
 * @returns {string} - タイムゾーンの表示名
 */
export function getTimezoneDisplayName(timezoneId) {
  return TIMEZONE_DISPLAY_NAMES[timezoneId] || 'UTC'
}

/**
 * UTCからの時差を計算する
 * @param {number} timezoneId - タイムゾーンID
 * @returns {string} - 時差表示 (例: "+09:00", "-05:00")
 */
export function getTimezoneOffset(timezoneId) {
  try {
    const timezone = TIMEZONE_MAP[timezoneId] || 'UTC'
    const now = new Date()
    const utcTime = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }))
    const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
    
    const offsetMinutes = (localTime.getTime() - utcTime.getTime()) / (1000 * 60)
    const hours = Math.floor(Math.abs(offsetMinutes) / 60)
    const minutes = Math.abs(offsetMinutes) % 60
    
    const sign = offsetMinutes >= 0 ? '+' : '-'
    return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  } catch (error) {
    return '+00:00'
  }
}

/**
 * タイムゾーン選択用のオプション配列を取得
 * @returns {Array} - {value, label} 形式のオプション配列
 */
export function getTimezoneOptions() {
  return Object.entries(TIMEZONE_DISPLAY_NAMES).map(([id, name]) => {
    const offset = getTimezoneOffset(parseInt(id))
    return {
      value: parseInt(id),
      label: `${name} (UTC${offset})`
    }
  })
}

/**
 * 現在のユーザーのタイムゾーンIDを取得
 * @param {object} user - ユーザーオブジェクト
 * @returns {number} - タイムゾーンID
 */
export function getUserTimezone(user) {
  return user?.timezone || 1 // デフォルトはUTC
}