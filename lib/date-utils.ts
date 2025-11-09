/**
 * Date formatting utilities that use local machine time
 * All functions use local timezone methods to ensure correct display
 */

export function formatTime(dateString: string): string {
  // Create date object - JavaScript automatically handles timezone conversion
  const date = new Date(dateString)
  
  // Use local time methods (getHours, getMinutes return local time)
  const hours = date.getHours() // Local hours
  const minutes = date.getMinutes() // Local minutes
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  const displayMinutes = minutes.toString().padStart(2, '0')
  return `${displayHours}:${displayMinutes} ${ampm}`
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  // Use local time methods
  const year = date.getFullYear() // Local year
  const month = (date.getMonth() + 1).toString().padStart(2, '0') // Local month
  const day = date.getDate().toString().padStart(2, '0') // Local day
  return `${year}-${month}-${day}`
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  // Use local time methods
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours() // Local hours
  const minutes = date.getMinutes() // Local minutes
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  const displayMinutes = minutes.toString().padStart(2, '0')
  return `${year}-${month}-${day} ${displayHours}:${displayMinutes} ${ampm}`
}

export function formatDateTimeFull(dateString: string): string {
  const date = new Date(dateString)
  // Use local time methods
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours() // Local hours
  const minutes = date.getMinutes() // Local minutes
  const seconds = date.getSeconds() // Local seconds
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  const displayMinutes = minutes.toString().padStart(2, '0')
  const displaySeconds = seconds.toString().padStart(2, '0')
  return `${year}-${month}-${day} ${displayHours}:${displayMinutes}:${displaySeconds} ${ampm}`
}

/**
 * Get current local time as ISO string for datetime-local input
 */
export function getLocalDateTimeString(date: Date): string {
  // Get local date components
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * Convert UTC/ISO date string to local datetime-local format
 */
export function toLocalDateTimeString(dateString: string): string {
  const date = new Date(dateString)
  return getLocalDateTimeString(date)
}




