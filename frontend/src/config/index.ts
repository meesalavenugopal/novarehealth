/**
 * Application Configuration
 * 
 * Centralized configuration for the NovareHealth frontend.
 * Values can be overridden via environment variables (VITE_*)
 */

// Country-specific phone validation rules (must match backend)
interface CountryPhoneRules {
  name: string;
  localLength: number;
  validPrefixes: string[];
  prefixLength: number;
  description: string;
}

const COUNTRY_PHONE_RULES: Record<string, CountryPhoneRules> = {
  // Mozambique
  '258': {
    name: 'Mozambique',
    localLength: 9,
    validPrefixes: ['82', '83', '84', '85', '86', '87'],
    prefixLength: 2,
    description: 'Mobile numbers must start with 82, 83, 84, 85, 86, or 87'
  },
  // South Africa
  '27': {
    name: 'South Africa',
    localLength: 9,
    validPrefixes: ['6', '7', '8'],
    prefixLength: 1,
    description: 'Mobile numbers must start with 6, 7, or 8'
  },
  // Kenya
  '254': {
    name: 'Kenya',
    localLength: 9,
    validPrefixes: ['7', '1'],
    prefixLength: 1,
    description: 'Mobile numbers must start with 7 or 1'
  },
  // Nigeria
  '234': {
    name: 'Nigeria',
    localLength: 10,
    validPrefixes: ['70', '80', '81', '90', '91'],
    prefixLength: 2,
    description: 'Mobile numbers must start with 70, 80, 81, 90, or 91'
  },
  // Tanzania
  '255': {
    name: 'Tanzania',
    localLength: 9,
    validPrefixes: ['6', '7'],
    prefixLength: 1,
    description: 'Mobile numbers must start with 6 or 7'
  },
  // Zimbabwe
  '263': {
    name: 'Zimbabwe',
    localLength: 9,
    validPrefixes: ['71', '73', '77', '78'],
    prefixLength: 2,
    description: 'Mobile numbers must start with 71, 73, 77, or 78'
  },
  // India
  '91': {
    name: 'India',
    localLength: 10,
    validPrefixes: ['6', '7', '8', '9'],
    prefixLength: 1,
    description: 'Mobile numbers must start with 6, 7, 8, or 9'
  },
  // Brazil
  '55': {
    name: 'Brazil',
    localLength: 11,
    validPrefixes: ['9'],
    prefixLength: 1,
    description: 'Mobile numbers must have 9 as the 3rd digit (after area code)'
  },
  // Default fallback
  'default': {
    name: 'Default',
    localLength: 9,
    validPrefixes: [],
    prefixLength: 0,
    description: 'No specific prefix validation'
  }
};

function getCountryRules(countryCode: string): CountryPhoneRules {
  return COUNTRY_PHONE_RULES[countryCode] || COUNTRY_PHONE_RULES['default'];
}

export const config = {
  // API Configuration
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  
  // Country/Market Configuration
  country: {
    // Country code (without +) - used for phone validation and market identification
    code: import.meta.env.VITE_DEFAULT_COUNTRY_CODE || '258',
    
    // Get country name from phone rules
    get name(): string {
      return getCountryRules(this.code).name;
    },
    
    // Capital city
    get capital(): string {
      const capitals: Record<string, string> = {
        '258': 'Maputo',
        '27': 'Pretoria',
        '254': 'Nairobi',
        '234': 'Abuja',
        '255': 'Dodoma',
        '263': 'Harare',
        '91': 'New Delhi',
        '55': 'Brasília',
      };
      return capitals[this.code] || 'Capital';
    },
    
    // Currency
    get currency(): string {
      const currencies: Record<string, string> = {
        '258': 'MZN',
        '27': 'ZAR',
        '254': 'KES',
        '234': 'NGN',
        '255': 'TZS',
        '263': 'ZWL',
        '91': 'INR',
        '55': 'BRL',
      };
      return currencies[this.code] || 'USD';
    },
    
    // Currency name
    get currencyName(): string {
      const names: Record<string, string> = {
        '258': 'Mozambican Metical',
        '27': 'South African Rand',
        '254': 'Kenyan Shilling',
        '234': 'Nigerian Naira',
        '255': 'Tanzanian Shilling',
        '263': 'Zimbabwean Dollar',
        '91': 'Indian Rupee',
        '55': 'Brazilian Real',
      };
      return names[this.code] || 'US Dollar';
    },
  },
  
  // Phone Number Configuration
  phone: {
    // Default country code (without +)
    // Change this for different markets: "258" (Mozambique), "254" (Kenya), "27" (South Africa)
    defaultCountryCode: import.meta.env.VITE_DEFAULT_COUNTRY_CODE || '258',
    
    // Get country-specific rules
    get rules(): CountryPhoneRules {
      return getCountryRules(this.defaultCountryCode);
    },
    
    // Display format for the country code (with +)
    get displayPrefix(): string {
      return `+${this.defaultCountryCode}`;
    },
    
    // Get local number length for current country
    get minLength(): number {
      return this.rules.localLength;
    },
    
    get maxLength(): number {
      return this.rules.localLength;
    },
    
    // Placeholder example for the input
    get placeholder(): string {
      const rules = this.rules;
      const firstPrefix = rules.validPrefixes[0] || '84';
      const remainingDigits = rules.localLength - firstPrefix.length;
      
      // Generate example like "84 123 4567" for Mozambique
      let example = firstPrefix;
      for (let i = 0; i < remainingDigits; i++) {
        example += ((i + 1) % 3 === 0 ? '' : '') + ((i + 1) % 10);
      }
      
      // Format with spaces
      return this.formatDisplay(example);
    },
    
    // Format the display of phone number with spaces
    formatDisplay(phone: string): string {
      const digits = phone.replace(/\D/g, '');
      const rules = this.rules;
      
      // Different formatting based on country/length
      if (rules.localLength === 10) {
        // Format: XXX XXX XXXX (e.g., India, Nigeria)
        if (digits.length <= 3) return digits;
        if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
        return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
      } else if (rules.localLength === 11) {
        // Format: XX XXXXX XXXX (e.g., Brazil)
        if (digits.length <= 2) return digits;
        if (digits.length <= 7) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
        return `${digits.slice(0, 2)} ${digits.slice(2, 7)} ${digits.slice(7, 11)}`;
      } else {
        // Default: XX XXX XXXX (9 digits - Mozambique, South Africa, Kenya, etc.)
        if (digits.length <= 2) return digits;
        if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
        return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 9)}`;
      }
    },
    
    // Validate phone number format based on country rules
    validate(phone: string): { valid: boolean; error?: string } {
      const digits = phone.replace(/\D/g, '');
      const rules = this.rules;
      
      if (digits.length === 0) {
        return { valid: false, error: 'Phone number is required' };
      }
      
      if (digits.length < rules.localLength) {
        return { valid: false, error: `${rules.name} phone numbers must be ${rules.localLength} digits` };
      }
      
      if (digits.length > rules.localLength) {
        return { valid: false, error: `${rules.name} phone numbers must be ${rules.localLength} digits` };
      }
      
      // Validate prefix if rules exist
      if (rules.validPrefixes.length > 0) {
        const prefix = digits.slice(0, rules.prefixLength);
        const isValidPrefix = rules.validPrefixes.some(p => prefix.startsWith(p));
        
        if (!isValidPrefix) {
          return { 
            valid: false, 
            error: `${rules.name}: ${rules.description}` 
          };
        }
      }
      
      return { valid: true };
    },
    
    // Get all supported countries
    getSupportedCountries(): Array<{ code: string; name: string; localLength: number }> {
      return Object.entries(COUNTRY_PHONE_RULES)
        .filter(([code]) => code !== 'default')
        .map(([code, rules]) => ({
          code,
          name: rules.name,
          localLength: rules.localLength
        }));
    }
  },
  
  // Feature Flags
  features: {
    devMode: import.meta.env.DEV,
  },
} as const;

export default config;
