// Ad-hoc tests for extraction logic (JS mirror of the TS implementation)
// This mirrors normalizeJa, pickLocationFromMessage, extractUserInfo, extractSecondPersonInfo

function normalizeJa(input) {
  return input
    .replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xFEE0))
    .replace(/午前/g, 'AM')
    .replace(/午後/g, 'PM')
    .replace(/：/g, ':')
    .replace(/[．\.]/g, '/')
    .replace(/[／]/g, '/')
    .replace(/(\d{1,2})時半/g, (_m, h) => `${h}時30分`)
    .trim()
}

const PREFECTURES = [
  '北海道','青森','岩手','宮城','秋田','山形','福島','茨城','栃木','群馬','埼玉','千葉','東京','神奈川',
  '新潟','富山','石川','福井','山梨','長野','岐阜','静岡','愛知','三重','滋賀','京都','大阪','兵庫','奈良','和歌山',
  '鳥取','島根','岡山','広島','山口','徳島','香川','愛媛','高知','福岡','佐賀','長崎','熊本','大分','宮崎','鹿児島','沖縄'
]

const MAJOR_CITIES = [
  '札幌','仙台','さいたま','千葉','東京','横浜','川崎','新潟','金沢','静岡','浜松','名古屋','京都','大阪','神戸','堺',
  '岡山','広島','高松','松山','北九州','福岡','熊本','鹿児島','那覇'
]

function pickLocationFromMessage(msg) {
  const candidates = new Set()
  const m = /(?:生まれ|出生|出身)(?:は|が|で)?(.{1,12}?)(?:です|で|[。.，,]|$)/.exec(msg)
  const ctx = m && m[1] && m[1].trim()
  const dateLike = /(\d{4}).{0,2}(?:年|\/|-).{0,2}(\d{1,2}).{0,2}(?:月|\/|-).{0,2}(\d{1,2})/
  if (ctx && !dateLike.test(ctx) && !/[年月日]/.test(ctx)) candidates.add(ctx)
  for (const p of PREFECTURES) if (msg.includes(p)) candidates.add(p)
  for (const c of MAJOR_CITIES) if (msg.includes(c)) candidates.add(c)
  for (const p of PREFECTURES) if (candidates.has(p)) return p
  for (const c of MAJOR_CITIES) if (candidates.has(c)) return c
  if (ctx && !dateLike.test(ctx) && !/[年月日]/.test(ctx)) return ctx
}

function extractUserInfo(message) {
  const result = {}
  const msg = normalizeJa(message)

  if (msg.includes('男性') || msg.includes('男')) result.gender = 'male'
  else if (msg.includes('女性') || msg.includes('女')) result.gender = 'female'

  const dateIso = /(\d{4})-(\d{1,2})-(\d{1,2})/
  const dateJp = /(\d{4})年(\d{1,2})月(\d{1,2})日/
  const dateSlash = /(\d{4})\/(\d{1,2})\/(\d{1,2})/
  const dm = msg.match(dateIso) || msg.match(dateJp) || msg.match(dateSlash)
  if (dm) {
    const y = dm[1]
    const m = dm[2].padStart(2, '0')
    const d = dm[3].padStart(2, '0')
    result.dateOfBirth = `${y}-${m}-${d}`
  }

  if (result.dateOfBirth) {
    const timeAmpm = /(AM|PM)?\s*(\d{1,2})(?::|時)(\d{1,2})?/i
    const t1 = msg.match(timeAmpm)
    if (t1) {
      let h = parseInt(t1[2] || '0', 10)
      const mi = parseInt(t1[3] || '0', 10)
      const ampm = (t1[1] || '').toUpperCase()
      if (ampm === 'PM' && h < 12) h += 12
      if (ampm === 'AM' && h === 12) h = 0
      result.datetime = `${result.dateOfBirth}T${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}:00+09:00`
    } else {
      result.timeUnknown = true
    }
  }

  const loc = pickLocationFromMessage(msg)
  if (loc) result.location = loc

  return result
}

function extractSecondPersonInfo(message) {
  const result = {}
  const msg = normalizeJa(message)
  const partnerKeywords = ['相手','パートナー','彼','彼氏','彼女','妻','嫁','夫','旦那','恋人','婚約者','元彼','元カノ']
  const hasPartnerKeyword = partnerKeywords.some((k) => msg.includes(k))
  if (!hasPartnerKeyword) return result

  const scopeMatch = /(?:相手|彼氏|彼女|夫|妻|恋人|婚約者)[^。\n]*/.exec(msg)
  const scope = scopeMatch?.[0] || msg

  if (scope.includes('彼女') || scope.includes('妻') || scope.includes('女性') || scope.includes('嫁')) {
    result.gender = 'female'; result.name = '彼女'
  } else if (scope.includes('彼') || scope.includes('夫') || scope.includes('男性') || scope.includes('旦那')) {
    result.gender = 'male'; result.name = '彼'
  }

  const dateIso = /(\d{4})-(\d{1,2})-(\d{1,2})/
  const dateJp = /(\d{4})年(\d{1,2})月(\d{1,2})日/
  const dateSlash = /(\d{4})\/(\d{1,2})\/(\d{1,2})/
  const dm = scope.match(dateIso) || scope.match(dateJp) || scope.match(dateSlash)
  if (dm) {
    const y = dm[1]; const m = dm[2].padStart(2, '0'); const d = dm[3].padStart(2, '0')
    result.dateOfBirth = `${y}-${m}-${d}`
  }

  if (result.dateOfBirth) {
    const timeAmpm = /(AM|PM)?\s*(\d{1,2})(?::|時)(\d{1,2})?/i
    const tm = scope.match(timeAmpm)
    if (tm) {
      let h = parseInt(tm[2] || '0', 10)
      const mi = parseInt(tm[3] || '0', 10)
      const ampm = (tm[1] || '').toUpperCase()
      if (ampm === 'PM' && h < 12) h += 12
      if (ampm === 'AM' && h === 12) h = 0
      result.datetime = `${result.dateOfBirth}T${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}:00+09:00`
    } else {
      result.timeUnknown = true
    }
  }

  const loc = pickLocationFromMessage(scope)
  if (loc) result.location = loc
  return result
}

const cases = [
  '1990年1月1日14時30分、東京で生まれです',
  '1988/7/9 午後2時半 名古屋出身',
  '1995-05-15に生まれました。女性です。出身は大阪です。',
  '生年月日は1990年5月15日、出身は北海道です',
  '1990年5月15日生まれ。出生は金沢。',
  '1990/05/15 男 性',
]

console.log('=== extractUserInfo ===')
for (const s of cases) {
  console.log('\nInput:', s)
  console.log('Output:', extractUserInfo(s))
}

const partnerCases = [
  '相手は1990年5月15日14:30生まれ、大阪出身です',
  '彼女は1995-05-15 生まれ。東京。',
  '彼氏の出生は1992年1月2日。時刻不明。',
]

console.log('\n=== extractSecondPersonInfo ===')
for (const s of partnerCases) {
  console.log('\nInput:', s)
  console.log('Output:', extractSecondPersonInfo(s))
}
