import { Router, Request, Response } from 'express';
import multer from 'multer';
import { WordImportService } from '../services/WordImportService';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// In-memory job storage (in production, use Redis or database)
interface ImportJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalItems: number;
  processedItems: number;
  errors: Array<{ row?: number; message: string }>;
  createdAt: Date;
  completedAt?: Date;
  result?: {
    imported: number;
    failed: number;
  };
}

const importJobs = new Map<string, ImportJob>();

/**
 * POST /api/v1/import/csv
 * Import requirements from CSV file
 */
router.post('/csv', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const projectId = req.body.projectId || 'default-project';
    const fieldMapping = req.body.fieldMapping ? JSON.parse(req.body.fieldMapping) : {};

    // Create import job
    const jobId = uuidv4();
    const job: ImportJob = {
      id: jobId,
      status: 'pending',
      progress: 0,
      totalItems: 0,
      processedItems: 0,
      errors: [],
      createdAt: new Date(),
    };
    importJobs.set(jobId, job);

    // Start async processing
    processCSVImport(jobId, req.file.buffer, projectId, fieldMapping);

    res.status(202).json({
      jobId,
      status: 'pending',
      message: 'Import job created successfully',
    });
  } catch (error) {
    console.error('CSV import error:', error);
    res.status(500).json({ error: 'Failed to process CSV import' });
  }
});

/**
 * POST /api/v1/import/reqif
 * Import requirements from ReqIF file
 */
router.post('/reqif', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const projectId = req.body.projectId || 'default-project';

    // Create import job
    const jobId = uuidv4();
    const job: ImportJob = {
      id: jobId,
      status: 'pending',
      progress: 0,
      totalItems: 0,
      processedItems: 0,
      errors: [],
      createdAt: new Date(),
    };
    importJobs.set(jobId, job);

    // Start async processing
    processReqIFImport(jobId, req.file.buffer, projectId);

    res.status(202).json({
      jobId,
      status: 'pending',
      message: 'Import job created successfully',
    });
  } catch (error) {
    console.error('ReqIF import error:', error);
    res.status(500).json({ error: 'Failed to process ReqIF import' });
  }
});

/**
 * POST /api/v1/import/word
 * Import requirements from Word document
 */
router.post('/word', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const projectId = req.body.projectId || 'default-project';
    const parseMode = req.body.parseMode || 'headings'; // 'headings' or 'tables'

    // Create import job
    const jobId = uuidv4();
    const job: ImportJob = {
      id: jobId,
      status: 'pending',
      progress: 0,
      totalItems: 0,
      processedItems: 0,
      errors: [],
      createdAt: new Date(),
    };
    importJobs.set(jobId, job);

    // Start async processing
    processWordImport(jobId, req.file.buffer, projectId, parseMode);

    res.status(202).json({
      jobId,
      status: 'pending',
      message: 'Import job created successfully',
    });
  } catch (error) {
    console.error('Word import error:', error);
    res.status(500).json({ error: 'Failed to process Word import' });
  }
});

/**
 * GET /api/v1/import/jobs/:id
 * Get import job status
 */
router.get('/jobs/:id', (req: Request, res: Response) => {
  const jobId = req.params.id;
  const job = importJobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Import job not found' });
  }

  res.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    totalItems: job.totalItems,
    processedItems: job.processedItems,
    errors: job.errors,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
    result: job.result,
  });
});

// Async processing functions

async function processCSVImport(
  jobId: string,
  buffer: Buffer,
  projectId: string,
  fieldMapping: Record<string, string>
): Promise<void> {
  const job = importJobs.get(jobId);
  if (!job) return;

  try {
    job.status = 'processing';
    job.progress = 10;

    // Parse CSV
    const csvText = buffer.toString('utf-8');
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim());
    job.totalItems = lines.length - 1; // Exclude header

    // Parse rows
    const requirements = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(',').map(c => c.trim());
      
      // Map fields based on fieldMapping
      const requirement = {
        id: `req-${Date.now()}-${i}`,
        displayId: cells[headers.indexOf(fieldMapping.displayId || 'displayId')] || `REQ-${i}`,
        projectId,
        title: cells[headers.indexOf(fieldMapping.title || 'title')] || '',
        description: cells[headers.indexOf(fieldMapping.description || 'description')] || '',
        type: cells[headers.indexOf(fieldMapping.type || 'type')] || 'system_requirement',
        status: cells[headers.indexOf(fieldMapping.status || 'status')] || 'draft',
        priority: cells[headers.indexOf(fieldMapping.priority || 'priority')] || 'medium',
        version: 1,
        tags: [],
        customFields: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'import-service',
        updatedBy: 'import-service',
      };

      // Validate
      if (!requirement.title) {
        job.errors.push({ row: i, message: 'Missing required field: title' });
        continue;
      }

      requirements.push(requirement);
      job.processedItems++;
      job.progress = Math.floor((job.processedItems / job.totalItems) * 90) + 10;
    }

    // In production, save to database here
    // await requirementRepository.bulkCreate(requirements);

    job.status = 'completed';
    job.progress = 100;
    job.completedAt = new Date();
    job.result = {
      imported: requirements.length,
      failed: job.errors.length,
    };
  } catch (error) {
    job.status = 'failed';
    job.errors.push({ message: error instanceof Error ? error.message : 'Unknown error' });
  }
}

async function processReqIFImport(
  jobId: string,
  buffer: Buffer,
  projectId: string
): Promise<void> {
  const job = importJobs.get(jobId);
  if (!job) return;

  try {
    job.status = 'processing';
    job.progress = 10;

    // Parse ReqIF XML
    const xmlText = buffer.toString('utf-8');
    
    // Simple XML parsing (in production, use xml2js or similar)
    // This is a mock implementation
    const specObjectMatches = xmlText.match(/<SPEC-OBJECT[^>]*>[\s\S]*?<\/SPEC-OBJECT>/g) || [];
    job.totalItems = specObjectMatches.length;

    const requirements = [];
    for (let i = 0; i < specObjectMatches.length; i++) {
      const specObject = specObjectMatches[i];
      
      // Extract identifier
      const idMatch = specObject.match(/IDENTIFIER="([^"]+)"/);
      const id = idMatch ? idMatch[1] : `req-${i}`;

      // Extract title from attribute values
      const titleMatch = specObject.match(/<ATTRIBUTE-VALUE-STRING[^>]*THE-VALUE="([^"]+)"/);
      const title = titleMatch ? titleMatch[1] : `Requirement ${i + 1}`;

      const requirement = {
        id: `req-${Date.now()}-${i}`,
        displayId: id,
        projectId,
        title,
        description: '',
        type: 'system_requirement' as const,
        status: 'draft' as const,
        priority: 'medium' as const,
        version: 1,
        tags: [],
        customFields: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'import-service',
        updatedBy: 'import-service',
      };

      requirements.push(requirement);
      job.processedItems++;
      job.progress = Math.floor((job.processedItems / job.totalItems) * 90) + 10;
    }

    job.status = 'completed';
    job.progress = 100;
    job.completedAt = new Date();
    job.result = {
      imported: requirements.length,
      failed: 0,
    };
  } catch (error) {
    job.status = 'failed';
    job.errors.push({ message: error instanceof Error ? error.message : 'Unknown error' });
  }
}

async function processWordImport(
  jobId: string,
  buffer: Buffer,
  projectId: string,
  parseMode: string
): Promise<void> {
  const job = importJobs.get(jobId);
  if (!job) return;

  try {
    job.status = 'processing';
    job.progress = 10;

    const wordImportService = new WordImportService();
    
    let requirements;
    if (parseMode === 'tables') {
      requirements = await wordImportService.parseWordDocumentWithTables(buffer, { projectId });
    } else {
      requirements = await wordImportService.parseWordDocument(buffer, { projectId });
    }

    job.totalItems = requirements.length;

    // Validate requirements
    const validationErrors = wordImportService.validateRequirements(requirements);
    validationErrors.forEach(({ index, errors }) => {
      errors.forEach(error => {
        job.errors.push({ row: index + 1, message: error });
      });
    });

    job.processedItems = requirements.length;
    job.progress = 90;

    // In production, save to database here
    // await requirementRepository.bulkCreate(requirements);

    job.status = 'completed';
    job.progress = 100;
    job.completedAt = new Date();
    job.result = {
      imported: requirements.length - validationErrors.length,
      failed: validationErrors.length,
    };
  } catch (error) {
    job.status = 'failed';
    job.errors.push({ message: error instanceof Error ? error.message : 'Unknown error' });
  }
}

export default router;
