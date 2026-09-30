// ==========================================
// FILE: backend/src/ai/tools/generalTools.ts
// TRADARA AI — General Purpose Tool Family
// PHASE 2 — DYNAMIC TOOL EXECUTION
// ==========================================
//
// These tools are intentionally independent of
// marketplace functionality.
//
// They provide safe, deterministic capabilities
// that demonstrate the agent runtime is not
// marketplace-bound.
//
// Future capability families can follow the
// same ToolDefinition contract:
//
// - Research / Web
// - Developer / Coding
// - Files
// - Security
// - Multimodal
// - Automation
// - Communication
// - Finance
// etc.
//
// IMPORTANT:
// This file does NOT modify the existing
// marketplace registry.
// ==========================================

import {
  ToolDefinition,
  SecurityContext,
  ToolExecutionResult,
} from './types';


// ==========================================
// INTERNAL HELPERS
// ==========================================

function success<T>(
  data: T,
  metadata: Record<string, any> = {}
): ToolExecutionResult<T> {
  return {
    success: true,
    data,
    riskLevel: 'READ',
    metadata: {
      category: 'general',
      ...metadata,
    },
  };
}


function failure(
  error: string,
  metadata: Record<string, any> = {}
): ToolExecutionResult {
  return {
    success: false,
    error,
    riskLevel: 'READ',
    metadata: {
      category: 'general',
      ...metadata,
    },
  };
}


function normalizeUnit(
  value: string
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}


// ==========================================
// SAFE CALCULATOR
// ==========================================
//
// The calculator intentionally does NOT use
// eval(), Function(), or dynamic JavaScript
// execution.
//
// Supported:
//
// +  -  *  /  %
// parentheses
// decimal numbers
// unary + / -
//
// Examples:
//
// 25 * 16
// (100 + 50) / 3
// 10 % 3
// -25 + 5
//
// ==========================================

class SafeExpressionParser {
  private expression: string;
  private position = 0;

  constructor(expression: string) {
    this.expression = expression.replace(/\s+/g, '');
  }

  public parse(): number {
    if (!this.expression) {
      throw new Error('Expression cannot be empty.');
    }

    const result = this.parseExpression();

    if (this.position < this.expression.length) {
      throw new Error(
        `Unexpected character "${this.expression[this.position]}" at position ${this.position + 1}.`
      );
    }

    if (!Number.isFinite(result)) {
      throw new Error(
        'The calculation produced a non-finite result.'
      );
    }

    return result;
  }

  private parseExpression(): number {
    let value = this.parseTerm();

    while (this.position < this.expression.length) {
      const operator =
        this.expression[this.position];

      if (
        operator !== '+' &&
        operator !== '-'
      ) {
        break;
      }

      this.position += 1;

      const right =
        this.parseTerm();

      if (operator === '+') {
        value += right;
      } else {
        value -= right;
      }
    }

    return value;
  }

  private parseTerm(): number {
    let value = this.parseUnary();

    while (this.position < this.expression.length) {
      const operator =
        this.expression[this.position];

      if (
        operator !== '*' &&
        operator !== '/' &&
        operator !== '%'
      ) {
        break;
      }

      this.position += 1;

      const right =
        this.parseUnary();

      if (
        operator === '/' &&
        right === 0
      ) {
        throw new Error(
          'Division by zero is not allowed.'
        );
      }

      if (
        operator === '%' &&
        right === 0
      ) {
        throw new Error(
          'Modulo by zero is not allowed.'
        );
      }

      switch (operator) {
        case '*':
          value *= right;
          break;

        case '/':
          value /= right;
          break;

        case '%':
          value %= right;
          break;
      }
    }

    return value;
  }

  private parseUnary(): number {
    if (
      this.expression[this.position] === '+'
    ) {
      this.position += 1;
      return this.parseUnary();
    }

    if (
      this.expression[this.position] === '-'
    ) {
      this.position += 1;
      return -this.parseUnary();
    }

    return this.parsePrimary();
  }

  private parsePrimary(): number {
    const current =
      this.expression[this.position];

    if (current === '(') {
      this.position += 1;

      const value =
        this.parseExpression();

      if (
        this.expression[this.position] !== ')'
      ) {
        throw new Error(
          'Missing closing parenthesis.'
        );
      }

      this.position += 1;

      return value;
    }

    return this.parseNumber();
  }

  private parseNumber(): number {
    const start =
      this.position;

    let hasDigits = false;
    let hasDecimal = false;

    while (
      this.position <
      this.expression.length
    ) {
      const character =
        this.expression[this.position];

      if (
        character >= '0' &&
        character <= '9'
      ) {
        hasDigits = true;
        this.position += 1;
        continue;
      }

      if (
        character === '.' &&
        !hasDecimal
      ) {
        hasDecimal = true;
        this.position += 1;
        continue;
      }

      break;
    }

    if (!hasDigits) {
      throw new Error(
        `Expected a number at position ${start + 1}.`
      );
    }

    const numberText =
      this.expression.slice(
        start,
        this.position
      );

    const value =
      Number(numberText);

    if (!Number.isFinite(value)) {
      throw new Error(
        `Invalid number "${numberText}".`
      );
    }

    return value;
  }
}


// ==========================================
// CALCULATOR TOOL
// ==========================================

const calculatorTool: ToolDefinition = {
  name: 'calculator',

  description:
    'Safely evaluates mathematical expressions using addition, subtraction, multiplication, division, modulo, decimals, unary signs, and parentheses.',

  riskLevel: 'READ',

  allowedRoles: [
    'ADMIN',
    'SELLER',
    'BUYER',
    'SUPPORT',
    'GUEST',
  ],

  parameters: {
    type: 'object',

    properties: {
      expression: {
        type: 'string',
        description:
          'Mathematical expression to calculate, for example "(25 * 16) + 10".',
        required: true,
      },
    },

    required: [
      'expression',
    ],
  },

  handler: async (
    params: any,
    _context: SecurityContext
  ) => {
    const expression =
      typeof params?.expression === 'string'
        ? params.expression.trim()
        : '';

    if (!expression) {
      return failure(
        'A mathematical expression is required.'
      );
    }

    if (expression.length > 500) {
      return failure(
        'The mathematical expression is too long.'
      );
    }

    try {
      const parser =
        new SafeExpressionParser(
          expression
        );

      const result =
        parser.parse();

      return success(
        {
          expression,
          result,
        },
        {
          tool: 'calculator',
        }
      );
    } catch (error: any) {
      return failure(
        error?.message ||
          'Unable to calculate the expression.',
        {
          tool: 'calculator',
        }
      );
    }
  },
};


// ==========================================
// PERCENTAGE TOOL
// ==========================================

const percentageTool: ToolDefinition = {
  name: 'calculate_percentage',

  description:
    'Calculates percentages, percentage changes, increases, decreases, discounts, and percentage amounts.',

  riskLevel: 'READ',

  allowedRoles: [
    'ADMIN',
    'SELLER',
    'BUYER',
    'SUPPORT',
    'GUEST',
  ],

  parameters: {
    type: 'object',

    properties: {
      operation: {
        type: 'string',
        description:
          'Percentage operation to perform.',
        required: true,
        enum: [
          'amount',
          'change',
          'increase',
          'decrease',
        ],
      },

      value: {
        type: 'number',
        description:
          'Primary numeric value.',
        required: true,
      },

      percentage: {
        type: 'number',
        description:
          'Percentage value to apply.',
        required: true,
      },

      original: {
        type: 'number',
        description:
          'Original value used for percentage-change calculations.',
        required: false,
      },
    },

    required: [
      'operation',
      'value',
      'percentage',
    ],
  },

  handler: async (
    params: any,
    _context: SecurityContext
  ) => {
    const operation =
      typeof params?.operation === 'string'
        ? params.operation
        : '';

    const value =
      Number(params?.value);

    const percentage =
      Number(params?.percentage);

    if (
      !Number.isFinite(value) ||
      !Number.isFinite(percentage)
    ) {
      return failure(
        'Both value and percentage must be finite numbers.'
      );
    }

    switch (operation) {
      case 'amount': {
        const result =
          value *
          (percentage / 100);

        return success(
          {
            operation,
            value,
            percentage,
            result,
          },
          {
            tool:
              'calculate_percentage',
          }
        );
      }

      case 'increase': {
        const change =
          value *
          (percentage / 100);

        const result =
          value + change;

        return success(
          {
            operation,
            value,
            percentage,
            change,
            result,
          },
          {
            tool:
              'calculate_percentage',
          }
        );
      }

      case 'decrease': {
        const change =
          value *
          (percentage / 100);

        const result =
          value - change;

        return success(
          {
            operation,
            value,
            percentage,
            change,
            result,
          },
          {
            tool:
              'calculate_percentage',
          }
        );
      }

      case 'change': {
        const original =
          Number(params?.original);

        if (
          !Number.isFinite(original)
        ) {
          return failure(
            'The original value is required for percentage-change calculations.'
          );
        }

        if (original === 0) {
          return failure(
            'Percentage change cannot be calculated from an original value of zero.'
          );
        }

        const result =
          ((value - original) /
            Math.abs(original)) *
          100;

        return success(
          {
            operation,
            original,
            value,
            percentageChange:
              result,
          },
          {
            tool:
              'calculate_percentage',
          }
        );
      }

      default:
        return failure(
          `Unsupported percentage operation "${operation}".`
        );
    }
  },
};


// ==========================================
// UNIT CONVERSION TOOL
// ==========================================
//
// Supported categories:
//
// length
// weight
// temperature
// volume
//
// ==========================================

type UnitCategory =
  | 'length'
  | 'weight'
  | 'temperature'
  | 'volume';


const UNIT_ALIASES: Record<
  UnitCategory,
  Record<string, string>
> = {
  length: {
    m: 'm',
    meter: 'm',
    meters: 'm',

    km: 'km',
    kilometer: 'km',
    kilometers: 'km',

    cm: 'cm',
    centimeter: 'cm',
    centimeters: 'cm',

    mm: 'mm',
    millimeter: 'mm',
    millimeters: 'mm',

    mi: 'mi',
    mile: 'mi',
    miles: 'mi',

    yd: 'yd',
    yard: 'yd',
    yards: 'yd',

    ft: 'ft',
    foot: 'ft',
    feet: 'ft',

    in: 'in',
    inch: 'in',
    inches: 'in',
  },

  weight: {
    kg: 'kg',
    kilogram: 'kg',
    kilograms: 'kg',

    g: 'g',
    gram: 'g',
    grams: 'g',

    mg: 'mg',
    milligram: 'mg',
    milligrams: 'mg',

    lb: 'lb',
    lbs: 'lb',
    pound: 'lb',
    pounds: 'lb',

    oz: 'oz',
    ounce: 'oz',
    ounces: 'oz',
  },

  temperature: {
    c: 'c',
    celcius: 'c',
    celsius: 'c',

    f: 'f',
    fahrenheit: 'f',

    k: 'k',
    kelvin: 'k',
  },

  volume: {
    l: 'l',
    liter: 'l',
    liters: 'l',
    litre: 'l',
    litres: 'l',

    ml: 'ml',
    milliliter: 'ml',
    milliliters: 'ml',
    millilitre: 'ml',
    millilitres: 'ml',

    gallon: 'gal',
    gallons: 'gal',
    gal: 'gal',

    quart: 'qt',
    quarts: 'qt',
    qt: 'qt',

    pint: 'pt',
    pints: 'pt',
    pt: 'pt',

    cup: 'cup',
    cups: 'cup',
  },
};


function resolveUnit(
  category: UnitCategory,
  unit: string
): string | null {
  const normalized =
    normalizeUnit(unit);

  return (
    UNIT_ALIASES[category][
      normalized
    ] || null
  );
}


function convertTemperature(
  value: number,
  from: string,
  to: string
): number {
  let celsius: number;

  switch (from) {
    case 'c':
      celsius = value;
      break;

    case 'f':
      celsius =
        (value - 32) *
        (5 / 9);
      break;

    case 'k':
      celsius =
        value - 273.15;
      break;

    default:
      throw new Error(
        `Unsupported temperature unit "${from}".`
      );
  }

  switch (to) {
    case 'c':
      return celsius;

    case 'f':
      return (
        celsius *
          (9 / 5) +
        32
      );

    case 'k':
      return (
        celsius +
        273.15
      );

    default:
      throw new Error(
        `Unsupported temperature unit "${to}".`
      );
  }
}


const LENGTH_TO_METERS: Record<
  string,
  number
> = {
  m: 1,
  km: 1000,
  cm: 0.01,
  mm: 0.001,
  mi: 1609.344,
  yd: 0.9144,
  ft: 0.3048,
  in: 0.0254,
};


const WEIGHT_TO_KG: Record<
  string,
  number
> = {
  kg: 1,
  g: 0.001,
  mg: 0.000001,
  lb: 0.45359237,
  oz: 0.028349523125,
};


const VOLUME_TO_LITERS: Record<
  string,
  number
> = {
  l: 1,
  ml: 0.001,
  gal: 3.785411784,
  qt: 0.946352946,
  pt: 0.473176473,
  cup: 0.2365882365,
};


const unitConversionTool: ToolDefinition = {
  name: 'convert_units',

  description:
    'Converts measurements between supported length, weight, temperature, and volume units.',

  riskLevel: 'READ',

  allowedRoles: [
    'ADMIN',
    'SELLER',
    'BUYER',
    'SUPPORT',
    'GUEST',
  ],

  parameters: {
    type: 'object',

    properties: {
      category: {
        type: 'string',
        description:
          'Conversion category.',
        required: true,
        enum: [
          'length',
          'weight',
          'temperature',
          'volume',
        ],
      },

      value: {
        type: 'number',
        description:
          'Numeric value to convert.',
        required: true,
      },

      from: {
        type: 'string',
        description:
          'Unit to convert from.',
        required: true,
      },

      to: {
        type: 'string',
        description:
          'Unit to convert to.',
        required: true,
      },
    },

    required: [
      'category',
      'value',
      'from',
      'to',
    ],
  },

  handler: async (
    params: any,
    _context: SecurityContext
  ) => {
    const category =
      params?.category;

    const value =
      Number(params?.value);

    const fromInput =
      typeof params?.from === 'string'
        ? params.from
        : '';

    const toInput =
      typeof params?.to === 'string'
        ? params.to
        : '';

    if (
      ![
        'length',
        'weight',
        'temperature',
        'volume',
      ].includes(category)
    ) {
      return failure(
        'Unsupported conversion category.'
      );
    }

    if (
      !Number.isFinite(value)
    ) {
      return failure(
        'Value must be a finite number.'
      );
    }

    const from =
      resolveUnit(
        category as UnitCategory,
        fromInput
      );

    const to =
      resolveUnit(
        category as UnitCategory,
        toInput
      );

    if (!from) {
      return failure(
        `Unsupported "${category}" source unit "${fromInput}".`
      );
    }

    if (!to) {
      return failure(
        `Unsupported "${category}" destination unit "${toInput}".`
      );
    }

    try {
      let result: number;

      if (
        category === 'temperature'
      ) {
        result =
          convertTemperature(
            value,
            from,
            to
          );
      } else {
        let baseValue: number;

        if (
          category === 'length'
        ) {
          baseValue =
            value *
            LENGTH_TO_METERS[
              from
            ];

          result =
            baseValue /
            LENGTH_TO_METERS[
              to
            ];
        } else if (
          category === 'weight'
        ) {
          baseValue =
            value *
            WEIGHT_TO_KG[
              from
            ];

          result =
            baseValue /
            WEIGHT_TO_KG[
              to
            ];
        } else {
          baseValue =
            value *
            VOLUME_TO_LITERS[
              from
            ];

          result =
            baseValue /
            VOLUME_TO_LITERS[
              to
            ];
        }
      }

      return success(
        {
          category,
          value,
          from,
          to,
          result,
        },
        {
          tool:
            'convert_units',
        }
      );
    } catch (error: any) {
      return failure(
        error?.message ||
          'Unable to convert units.',
        {
          tool:
            'convert_units',
        }
      );
    }
  },
};


// ==========================================
// DATE / TIME TOOL
// ==========================================

const dateTimeTool: ToolDefinition = {
  name: 'get_current_datetime',

  description:
    'Returns the current server date and time, with optional IANA timezone formatting.',

  riskLevel: 'READ',

  allowedRoles: [
    'ADMIN',
    'SELLER',
    'BUYER',
    'SUPPORT',
    'GUEST',
  ],

  parameters: {
    type: 'object',

    properties: {
      timezone: {
        type: 'string',
        description:
          'Optional IANA timezone such as Africa/Lagos, Europe/London, or America/New_York.',
        required: false,
      },
    },
  },

  handler: async (
    params: any,
    _context: SecurityContext
  ) => {
    const timezone =
      typeof params?.timezone === 'string' &&
      params.timezone.trim()
        ? params.timezone.trim()
        : 'UTC';

    const now =
      new Date();

    try {
      const formatted =
        new Intl.DateTimeFormat(
          'en-US',
          {
            timeZone:
              timezone,

            dateStyle:
              'full',

            timeStyle:
              'long',
          }
        ).format(now);

      return success(
        {
          iso:
            now.toISOString(),

          timezone,

          formatted,
        },
        {
          tool:
            'get_current_datetime',
        }
      );
    } catch {
      return failure(
        `Invalid or unsupported IANA timezone "${timezone}".`
      );
    }
  },
};


// ==========================================
// TEXT UTILITIES
// ==========================================

const textUtilitiesTool: ToolDefinition = {
  name: 'text_utilities',

  description:
    'Performs safe text operations such as counting characters, words, lines, and extracting basic text statistics.',

  riskLevel: 'READ',

  allowedRoles: [
    'ADMIN',
    'SELLER',
    'BUYER',
    'SUPPORT',
    'GUEST',
  ],

  parameters: {
    type: 'object',

    properties: {
      operation: {
        type: 'string',
        description:
          'Text operation to perform.',
        required: true,
        enum: [
          'statistics',
          'uppercase',
          'lowercase',
          'trim',
        ],
      },

      text: {
        type: 'string',
        description:
          'Text to process.',
        required: true,
      },
    },

    required: [
      'operation',
      'text',
    ],
  },

  handler: async (
    params: any,
    _context: SecurityContext
  ) => {
    const operation =
      typeof params?.operation === 'string'
        ? params.operation
        : '';

    const text =
      typeof params?.text === 'string'
        ? params.text
        : '';

    if (
      text.length > 100_000
    ) {
      return failure(
        'Text input is too large. Maximum length is 100,000 characters.'
      );
    }

    switch (operation) {
      case 'statistics': {
        const words =
          text
            .trim()
            ? text
                .trim()
                .split(/\s+/)
                .length
            : 0;

        const lines =
          text
            ? text.split(/\r?\n/).length
            : 0;

        const characters =
          text.length;

        const charactersWithoutSpaces =
          text.replace(
            /\s/g,
            ''
          ).length;

        return success(
          {
            characters,
            charactersWithoutSpaces,
            words,
            lines,
          },
          {
            tool:
              'text_utilities',
          }
        );
      }

      case 'uppercase':
        return success(
          {
            result:
              text.toUpperCase(),
          },
          {
            tool:
              'text_utilities',
          }
        );

      case 'lowercase':
        return success(
          {
            result:
              text.toLowerCase(),
          },
          {
            tool:
              'text_utilities',
          }
        );

      case 'trim':
        return success(
          {
            result:
              text.trim(),
          },
          {
            tool:
              'text_utilities',
          }
        );

      default:
        return failure(
          `Unsupported text operation "${operation}".`
        );
    }
  },
};


// ==========================================
// JSON INSPECTION TOOL
// ==========================================
//
// This does NOT execute JSON as code.
//
// It only parses JSON and reports basic
// structural information.
// ==========================================

const jsonInspectorTool: ToolDefinition = {
  name: 'inspect_json',

  description:
    'Safely parses a JSON string and reports its basic structure, type, and top-level keys.',

  riskLevel: 'READ',

  allowedRoles: [
    'ADMIN',
    'SELLER',
    'BUYER',
    'SUPPORT',
    'GUEST',
  ],

  parameters: {
    type: 'object',

    properties: {
      json: {
        type: 'string',
        description:
          'JSON text to inspect.',
        required: true,
      },
    },

    required: [
      'json',
    ],
  },

  handler: async (
    params: any,
    _context: SecurityContext
  ) => {
    const json =
      typeof params?.json === 'string'
        ? params.json.trim()
        : '';

    if (!json) {
      return failure(
        'JSON input cannot be empty.'
      );
    }

    if (json.length > 200_000) {
      return failure(
        'JSON input is too large. Maximum length is 200,000 characters.'
      );
    }

    try {
      const parsed =
        JSON.parse(json);

      let type:
        | 'null'
        | 'array'
        | 'object'
        | 'string'
        | 'number'
        | 'boolean';

      if (parsed === null) {
        type = 'null';
      } else if (
        Array.isArray(parsed)
      ) {
        type = 'array';
      } else {
        type =
          typeof parsed as
            | 'object'
            | 'string'
            | 'number'
            | 'boolean';
      }

      const keys =
        type === 'object'
          ? Object.keys(parsed)
          : [];

      const size =
        type === 'array'
          ? parsed.length
          : type === 'object'
            ? keys.length
            : undefined;

      return success(
        {
          valid: true,
          type,
          keys,
          size,
        },
        {
          tool:
            'inspect_json',
        }
      );
    } catch (error: any) {
      return success(
        {
          valid: false,

          error:
            error?.message ||
            'Invalid JSON.',
        },
        {
          tool:
            'inspect_json',
        }
      );
    }
  },
};


// ==========================================
// EXPORT GENERAL TOOL FAMILY
// ==========================================
//
// The registry will import this array later.
//
// Keeping the family exported as a collection
// makes future capability registration clean.
// ==========================================

export const generalTools: ToolDefinition[] = [
  calculatorTool,
  percentageTool,
  unitConversionTool,
  dateTimeTool,
  textUtilitiesTool,
  jsonInspectorTool,
];


// ==========================================
// INDIVIDUAL EXPORTS
// ==========================================
//
// These are useful for future tests,
// diagnostics, or selective registration.
// ==========================================

export {
  calculatorTool,
  percentageTool,
  unitConversionTool,
  dateTimeTool,
  textUtilitiesTool,
  jsonInspectorTool,
};