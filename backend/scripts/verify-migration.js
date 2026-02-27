#!/usr/bin/env node

/**
 * Verify migration file structure and syntax
 * 
 * This script validates that migration files have the correct structure
 * without requiring a database connection.
 */

const fs = require('fs');
const path = require('path');

function verifyMigration(migrationPath) {
  console.log(`\nVerifying migration: ${path.basename(migrationPath)}`);
  console.log('='.repeat(60));

  try {
    // Load the migration
    const migration = require(migrationPath);

    // Check for required exports
    const checks = [
      {
        name: 'Has up function',
        test: () => typeof migration.up === 'function',
        required: true
      },
      {
        name: 'Has down function',
        test: () => typeof migration.down === 'function',
        required: true
      },
      {
        name: 'Has shorthands export',
        test: () => 'shorthands' in migration,
        required: false
      }
    ];

    let passed = 0;
    let failed = 0;

    checks.forEach(check => {
      const result = check.test();
      const status = result ? '✓' : '✗';
      const severity = check.required ? 'REQUIRED' : 'OPTIONAL';
      
      console.log(`  ${status} ${check.name} [${severity}]`);
      
      if (result) {
        passed++;
      } else if (check.required) {
        failed++;
      }
    });

    // Try to inspect the up function
    console.log('\n  Function signatures:');
    console.log(`    up: ${migration.up.toString().split('\n')[0]}`);
    console.log(`    down: ${migration.down.toString().split('\n')[0]}`);

    console.log('\n' + '='.repeat(60));
    if (failed === 0) {
      console.log('✓ Migration structure is valid');
      return true;
    } else {
      console.log(`✗ Migration has ${failed} required check(s) failing`);
      return false;
    }
  } catch (error) {
    console.error('✗ Error loading migration:', error.message);
    return false;
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage: node verify-migration.js <migration-file>');
  console.log('   or: node verify-migration.js all');
  process.exit(1);
}

if (args[0] === 'all') {
  // Verify all migrations
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.js'))
    .sort();

  console.log(`Found ${files.length} migration file(s)`);
  
  let allPassed = true;
  files.forEach(file => {
    const migrationPath = path.join(migrationsDir, file);
    const passed = verifyMigration(migrationPath);
    if (!passed) allPassed = false;
  });

  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('✓ All migrations are valid');
    process.exit(0);
  } else {
    console.log('✗ Some migrations have errors');
    process.exit(1);
  }
} else {
  // Verify single migration
  const migrationPath = path.resolve(args[0]);
  const passed = verifyMigration(migrationPath);
  process.exit(passed ? 0 : 1);
}
