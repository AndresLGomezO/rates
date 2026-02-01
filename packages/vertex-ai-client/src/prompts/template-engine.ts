import { GenerationParameters } from '../types';

export type VariableType = 'string' | 'number' | 'boolean' | 'array';

export interface VariableDefinition {
  /** Variable name */
  name: string;

  /** Variable type */
  type: VariableType;

  /** Is required */
  required: boolean;

  /** Description */
  description?: string;

  /** Default value */
  defaultValue?: unknown;
}

export interface PromptTemplate {
  /** Template identifier */
  id: string;

  /** Template name */
  name: string;

  /** Template description */
  description?: string;

  /** Template string with {{variable}} placeholders */
  template: string;

  /** Variable definitions */
  variables: VariableDefinition[];

  /** Recommended parameters */
  recommendedParameters?: Partial<GenerationParameters>;
}

export type TemplateVariables = Record<string, unknown>;

export interface TemplateValidationResult {
  valid: boolean;
  errors: string[];
}

export class TemplateEngine {
  /**
   * Process template with variables
   */
  static process(
    template: PromptTemplate,
    variables: TemplateVariables
  ): string {
    // Validate all required variables provided
    const validation = this.validate(template, variables);
    if (!validation.valid) {
      throw new Error(
        `Template validation failed: ${validation.errors.join(', ')}`
      );
    }

    let result = template.template;

    // Replace variables
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      // In a real engine, we'd handle escaping, conditional logic etc.
      // For now, strict replacement.
      result = result.replace(
        new RegExp(this.escapeRegExp(placeholder), 'g'),
        String(value)
      );
    }

    // Check for leftover placeholders ??
    // The requirement says "Replace placeholders with values".

    return result;
  }

  /**
   * Validate template variables
   */
  static validate(
    template: PromptTemplate,
    variables: TemplateVariables
  ): TemplateValidationResult {
    const errors: string[] = [];

    // Check required variables
    for (const varDef of template.variables) {
      // Determine effective value (provided or default)
      let value = variables[varDef.name];

      if (value === undefined && varDef.defaultValue !== undefined) {
        value = varDef.defaultValue;
        // Mutate variables to include default?
        // For validate, we just check existence.
        // But process() needs it.
        // Let's assume process() caller ensures defaults or we merge defaults there.
        // Actually, typically validate checks coverage.
        variables[varDef.name] = value; // Apply default for usage
      }

      if (varDef.required && value === undefined) {
        errors.push(`Missing required variable: ${varDef.name}`);
        continue;
      }

      // Type checking
      if (value !== undefined) {
        if (!this.checkType(value, varDef.type)) {
          errors.push(
            `Variable ${varDef.name} has wrong type: expected ${varDef.type}`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Extract variable placeholders from template string
   */
  static extractVariables(templateString: string): string[] {
    const matches = templateString.match(/\{\{(\w+)\}\}/g) ?? [];
    return matches.map((m) => m.slice(2, -2));
  }

  private static checkType(
    value: unknown,
    expectedType: VariableType
  ): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      default:
        return true;
    }
  }

  private static escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }
}
