// Presentation-only clock formatting. API payloads and <input type="time">
// values intentionally remain canonical 24-hour strings.
export function formatTime12(value) {
  if (value === null || value === undefined || value === "")
    return ""

  if (value instanceof Date && !Number.isNaN(value.getTime()))
    return formatDateTimeValue(value)

  const raw = String(value).trim()
  const parsed = raw.includes("T") ? new Date(raw) : null
  if (parsed && !Number.isNaN(parsed.getTime()))
    return formatDateTimeValue(parsed)

  const match = raw.match(/(\d{1,2}):(\d{2})/)
  if (!match)
    return raw

  let hour = Number(match[1])
  const minute = match[2]
  const lower = raw.toLowerCase()
  const isPm = raw.includes("مساء") || /(^|\s)م(\s|$)/.test(raw) || /(^|\s)pm(\s|$)/.test(lower)
  const isAm = raw.includes("صباح") || /(^|\s)ص(\s|$)/.test(raw) || /(^|\s)am(\s|$)/.test(lower)
  if (isPm && hour < 12)
    hour += 12
  if (isAm && hour === 12)
    hour = 0
  if (!Number.isInteger(hour) || hour < 0 || hour > 23)
    return raw

  const suffix = hour >= 12 ? "م" : "ص"
  const hour12 = hour % 12 || 12
  return `${hour12}:${minute} ${suffix}`
}

export function formatTimeRange12(start, end) {
  const from = formatTime12(start)
  const to = formatTime12(end)
  if (!from)
    return to
  if (!to)
    return from
  return `${from} - ${to}`
}

export function formatDateTime12(value, options = {}) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime()))
    return value ? String(value) : ""

  const datePart = date.toLocaleDateString("ar-IQ", {
    day: "2-digit",
    month: "2-digit",
    ...(options.includeYear === false ? {} : { year: "numeric" }),
  })

  return `${datePart} ${formatDateTimeValue(date)}`
}

export function formatLocaleDateTime12(value) {
  return formatDateTime12(value) || "—"
}

function formatDateTimeValue(date) {
  return date.toLocaleTimeString("ar-IQ", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}
