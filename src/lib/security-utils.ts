// Security utilities for input sanitization and validation

/**
 * HTML-encodes a string to prevent XSS attacks
 */
export const escapeHtml = (unsafe: string): string => {
  if (typeof unsafe !== 'string') return String(unsafe);
  
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/\//g, "&#x2F;");
};

/**
 * Sanitizes text input by removing potentially harmful characters
 */
export const sanitizeText = (input: string, maxLength: number = 1000): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
};

/**
 * Validates email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254;
};

/**
 * Validates phone number format (international)
 */
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
};

/**
 * Rate limiting check (simple client-side implementation)
 */
const rateLimitStore = new Map<string, number[]>();

export const checkRateLimit = (identifier: string, maxAttempts: number = 5, windowMs: number = 60000): boolean => {
  const now = Date.now();
  const attempts = rateLimitStore.get(identifier) || [];
  
  // Remove attempts outside the time window
  const recentAttempts = attempts.filter(time => now - time < windowMs);
  
  if (recentAttempts.length >= maxAttempts) {
    return false; // Rate limit exceeded
  }
  
  // Add current attempt
  recentAttempts.push(now);
  rateLimitStore.set(identifier, recentAttempts);
  
  return true; // Within rate limit
};

/**
 * Validates and sanitizes form data
 */
export interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

export const validateContactForm = (data: ContactFormData): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Validate name
  if (!data.name || data.name.length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  if (data.name.length > 100) {
    errors.push('Name must be less than 100 characters');
  }
  
  // Validate email
  if (!isValidEmail(data.email)) {
    errors.push('Invalid email format');
  }
  
  // Validate phone
  if (!isValidPhone(data.phone)) {
    errors.push('Invalid phone number format');
  }
  
  // Validate message
  if (!data.message || data.message.length < 10) {
    errors.push('Message must be at least 10 characters long');
  }
  if (data.message.length > 2000) {
    errors.push('Message must be less than 2000 characters');
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /on\w+=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i
  ];
  
  const allText = `${data.name} ${data.email} ${data.subject} ${data.message}`;
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(allText)) {
      errors.push('Invalid characters detected in form data');
      break;
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Sanitizes contact form data
 */
export const sanitizeContactForm = (data: ContactFormData): ContactFormData => {
  return {
    name: sanitizeText(data.name, 100),
    email: data.email.trim().toLowerCase().slice(0, 254),
    phone: data.phone.replace(/[^\d+\s-]/g, '').slice(0, 20),
    subject: sanitizeText(data.subject, 200),
    message: sanitizeText(data.message, 2000)
  };
};