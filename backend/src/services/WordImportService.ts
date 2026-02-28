import mammoth from 'mammoth';
import { Requirement, RequirementType, RequirementStatus, Priority } from '../types';

interface WordImportOptions {
  projectId: string;
  defaultType?: RequirementType;
  defaultStatus?: RequirementStatus;
  defaultPriority?: Priority;
}

interface ParsedRequirement {
  level: number;
  title: string;
  description: string;
  parentIndex: number | null;
}

export class WordImportService {
  /**
   * Parse a Word document and extract requirements based on heading structure
   */
  async parseWordDocument(
    buffer: Buffer,
    options: WordImportOptions
  ): Promise<Requirement[]> {
    // Extract text with heading levels
    const result = await mammoth.convertToHtml(buffer, {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Heading 4'] => h4:fresh",
      ],
    });

    const html = result.value;
    const parsedRequirements = this.parseHtmlToRequirements(html);
    
    // Convert parsed requirements to Requirement objects with hierarchy
    return this.buildRequirementHierarchy(parsedRequirements, options);
  }

  /**
   * Parse HTML content to extract requirements with heading levels
   */
  private parseHtmlToRequirements(html: string): ParsedRequirement[] {
    const requirements: ParsedRequirement[] = [];
    
    // Simple HTML parsing - in production, use a proper HTML parser like cheerio
    const headingRegex = /<h(\d)>(.*?)<\/h\d>/g;
    const paragraphRegex = /<p>(.*?)<\/p>/g;
    
    let match;
    let currentRequirement: ParsedRequirement | null = null;
    let descriptionParts: string[] = [];

    // Extract headings
    const headings: Array<{ level: number; title: string; index: number }> = [];
    let index = 0;
    
    while ((match = headingRegex.exec(html)) !== null) {
      const level = parseInt(match[1]);
      const title = this.stripHtmlTags(match[2]);
      headings.push({ level, title, index: match.index });
    }

    // For each heading, find the content until the next heading
    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i];
      const nextHeading = headings[i + 1];
      
      const startIndex = heading.index;
      const endIndex = nextHeading ? nextHeading.index : html.length;
      const content = html.substring(startIndex, endIndex);
      
      // Extract paragraphs as description
      const description: string[] = [];
      const contentParagraphRegex = /<p>(.*?)<\/p>/g;
      let pMatch;
      
      while ((pMatch = contentParagraphRegex.exec(content)) !== null) {
        const text = this.stripHtmlTags(pMatch[1]).trim();
        if (text) {
          description.push(text);
        }
      }

      requirements.push({
        level: heading.level,
        title: heading.title,
        description: description.join('\n\n'),
        parentIndex: null, // Will be set in buildRequirementHierarchy
      });
    }

    return requirements;
  }

  /**
   * Build requirement hierarchy based on heading levels
   */
  private buildRequirementHierarchy(
    parsed: ParsedRequirement[],
    options: WordImportOptions
  ): Requirement[] {
    const requirements: Requirement[] = [];
    const levelStack: Array<{ level: number; index: number }> = [];

    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i];
      
      // Find parent based on heading level
      let parentId: string | null = null;
      
      // Pop stack until we find a parent with lower level
      while (levelStack.length > 0 && levelStack[levelStack.length - 1].level >= item.level) {
        levelStack.pop();
      }
      
      if (levelStack.length > 0) {
        const parentIndex = levelStack[levelStack.length - 1].index;
        parentId = requirements[parentIndex].id;
      }

      const requirement: Requirement = {
        id: `req-${Date.now()}-${i}`,
        displayId: `REQ-${String(i + 1).padStart(3, '0')}`,
        projectId: options.projectId,
        parentId,
        title: item.title,
        description: item.description,
        type: options.defaultType || 'system_requirement',
        status: options.defaultStatus || 'draft',
        priority: options.defaultPriority || 'medium',
        version: 1,
        tags: [],
        customFields: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'import-service',
        updatedBy: 'import-service',
      };

      requirements.push(requirement);
      levelStack.push({ level: item.level, index: i });
    }

    return requirements;
  }

  /**
   * Parse tables in Word document for structured attributes
   */
  async parseWordDocumentWithTables(
    buffer: Buffer,
    options: WordImportOptions
  ): Promise<Requirement[]> {
    // Extract raw text to look for table patterns
    const result = await mammoth.extractRawText(buffer);
    const text = result.value;

    // Simple table parsing - look for patterns like:
    // ID | Title | Description | Type | Status | Priority
    // REQ-001 | User Auth | ... | System | Draft | High
    
    const lines = text.split('\n');
    const requirements: Requirement[] = [];
    let headerFound = false;
    let columnMapping: Record<string, number> = {};

    for (const line of lines) {
      const cells = line.split('|').map(c => c.trim()).filter(c => c);
      
      if (cells.length === 0) continue;

      // Check if this is a header row
      if (!headerFound && this.isHeaderRow(cells)) {
        columnMapping = this.buildColumnMapping(cells);
        headerFound = true;
        continue;
      }

      if (headerFound && cells.length > 0) {
        const requirement = this.parseTableRow(cells, columnMapping, options);
        if (requirement) {
          requirements.push(requirement);
        }
      }
    }

    return requirements;
  }

  private isHeaderRow(cells: string[]): boolean {
    const headerKeywords = ['id', 'title', 'description', 'type', 'status', 'priority'];
    const lowerCells = cells.map(c => c.toLowerCase());
    return headerKeywords.some(keyword => lowerCells.includes(keyword));
  }

  private buildColumnMapping(headers: string[]): Record<string, number> {
    const mapping: Record<string, number> = {};
    
    headers.forEach((header, index) => {
      const lower = header.toLowerCase();
      if (lower.includes('id')) mapping['id'] = index;
      if (lower.includes('title')) mapping['title'] = index;
      if (lower.includes('description')) mapping['description'] = index;
      if (lower.includes('type')) mapping['type'] = index;
      if (lower.includes('status')) mapping['status'] = index;
      if (lower.includes('priority')) mapping['priority'] = index;
    });

    return mapping;
  }

  private parseTableRow(
    cells: string[],
    columnMapping: Record<string, number>,
    options: WordImportOptions
  ): Requirement | null {
    const title = cells[columnMapping['title']] || '';
    if (!title) return null;

    const requirement: Requirement = {
      id: `req-${Date.now()}-${Math.random()}`,
      displayId: cells[columnMapping['id']] || `REQ-${Date.now()}`,
      projectId: options.projectId,
      parentId: null,
      title,
      description: cells[columnMapping['description']] || '',
      type: this.parseType(cells[columnMapping['type']]) || options.defaultType || 'system_requirement',
      status: this.parseStatus(cells[columnMapping['status']]) || options.defaultStatus || 'draft',
      priority: this.parsePriority(cells[columnMapping['priority']]) || options.defaultPriority || 'medium',
      version: 1,
      tags: [],
      customFields: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'import-service',
      updatedBy: 'import-service',
    };

    return requirement;
  }

  private parseType(value: string | undefined): RequirementType | null {
    if (!value) return null;
    const lower = value.toLowerCase().replace(/\s+/g, '_');
    const validTypes: RequirementType[] = [
      'stakeholder_need',
      'system_requirement',
      'software_requirement',
      'hardware_requirement',
      'constraint',
      'interface_requirement',
    ];
    return validTypes.find(t => t === lower) || null;
  }

  private parseStatus(value: string | undefined): RequirementStatus | null {
    if (!value) return null;
    const lower = value.toLowerCase().replace(/\s+/g, '_');
    const validStatuses: RequirementStatus[] = ['draft', 'in_review', 'approved', 'deprecated'];
    return validStatuses.find(s => s === lower) || null;
  }

  private parsePriority(value: string | undefined): Priority | null {
    if (!value) return null;
    const lower = value.toLowerCase();
    const validPriorities: Priority[] = ['critical', 'high', 'medium', 'low'];
    return validPriorities.find(p => p === lower) || null;
  }

  private stripHtmlTags(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }

  /**
   * Validate imported requirements
   */
  validateRequirements(requirements: Requirement[]): Array<{ index: number; errors: string[] }> {
    const validationErrors: Array<{ index: number; errors: string[] }> = [];

    requirements.forEach((req, index) => {
      const errors: string[] = [];

      if (!req.title || req.title.trim().length === 0) {
        errors.push('Title is required');
      }

      if (req.title && req.title.length > 500) {
        errors.push('Title must be less than 500 characters');
      }

      if (errors.length > 0) {
        validationErrors.push({ index, errors });
      }
    });

    return validationErrors;
  }
}
