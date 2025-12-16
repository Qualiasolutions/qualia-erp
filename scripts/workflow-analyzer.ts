#!/usr/bin/env ts-node

/**
 * Workflow Analyzer - Analyzes the project to identify automation opportunities
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { execSync } from 'child_process';

interface WorkflowAnalysis {
  currentWorkflows: any[];
  manualProcesses: any[];
  automationOpportunities: any[];
  toolRecommendations: any[];
  complexityScore: number;
  buildProcess: any;
  testProcess: any;
  deploymentProcess: any;
  codeQuality: any;
}

class WorkflowAnalyzer {
  private projectPath: string;

  constructor(projectPath: string = process.cwd()) {
    this.projectPath = projectPath;
  }

  async analyze(): Promise<WorkflowAnalysis> {
    console.log('🔍 Analyzing project workflows...\n');

    const analysis: WorkflowAnalysis = {
      currentWorkflows: this.findExistingWorkflows(),
      manualProcesses: this.identifyManualProcesses(),
      automationOpportunities: [],
      toolRecommendations: [],
      complexityScore: 0,
      buildProcess: this.analyzeBuildProcess(),
      testProcess: this.analyzeTestProcess(),
      deploymentProcess: this.analyzeDeploymentProcess(),
      codeQuality: this.analyzeCodeQualityChecks()
    };

    // Generate recommendations
    this.generateRecommendations(analysis);

    // Calculate complexity score
    analysis.complexityScore = this.calculateComplexityScore(analysis);

    return analysis;
  }

  private findExistingWorkflows(): any[] {
    const workflows: any[] = [];

    // Check GitHub Actions
    const ghWorkflowPath = path.join(this.projectPath, '.github', 'workflows');
    if (fs.existsSync(ghWorkflowPath)) {
      const files = fs.readdirSync(ghWorkflowPath);
      files.forEach(file => {
        if (file.endsWith('.yml') || file.endsWith('.yaml')) {
          const content = fs.readFileSync(path.join(ghWorkflowPath, file), 'utf8');
          const workflow = yaml.load(content) as any;
          workflows.push({
            type: 'github_actions',
            name: workflow.name || file,
            file: `.github/workflows/${file}`,
            triggers: workflow.on ? Object.keys(workflow.on) : [],
            jobs: workflow.jobs ? Object.keys(workflow.jobs) : []
          });
        }
      });
    }

    // Check GitLab CI
    const gitlabCi = path.join(this.projectPath, '.gitlab-ci.yml');
    if (fs.existsSync(gitlabCi)) {
      const content = fs.readFileSync(gitlabCi, 'utf8');
      const config = yaml.load(content) as any;
      workflows.push({
        type: 'gitlab_ci',
        name: 'GitLab CI Pipeline',
        file: '.gitlab-ci.yml',
        stages: config.stages || []
      });
    }

    // Check for other CI/CD files
    const ciFiles = [
      'Jenkinsfile',
      '.circleci/config.yml',
      'azure-pipelines.yml',
      '.travis.yml',
      'bitbucket-pipelines.yml'
    ];

    ciFiles.forEach(file => {
      const filePath = path.join(this.projectPath, file);
      if (fs.existsSync(filePath)) {
        workflows.push({
          type: file.replace(/[^a-z]/gi, '_'),
          name: file,
          file: file
        });
      }
    });

    return workflows;
  }

  private identifyManualProcesses(): any[] {
    const manualProcesses: any[] = [];

    // Check for manual scripts
    const scriptPatterns = [
      'build.sh',
      'deploy.sh',
      'release.sh',
      'test.sh',
      'setup.sh',
      'install.sh'
    ];

    scriptPatterns.forEach(pattern => {
      const files = this.findFiles(pattern);
      files.forEach(file => {
        manualProcesses.push({
          type: 'script',
          file: file,
          purpose: pattern.replace('.sh', ''),
          automationPotential: 'high'
        });
      });
    });

    // Check README for manual steps
    const readmeFiles = ['README.md', 'README.rst', 'README.txt'];
    readmeFiles.forEach(readme => {
      const readmePath = path.join(this.projectPath, readme);
      if (fs.existsSync(readmePath)) {
        const content = fs.readFileSync(readmePath, 'utf8').toLowerCase();
        const manualIndicators = [
          'manually',
          'by hand',
          'step 1:',
          'steps to',
          'how to deploy',
          'installation steps'
        ];

        const foundIndicators = manualIndicators.filter(indicator =>
          content.includes(indicator)
        );

        if (foundIndicators.length > 0) {
          manualProcesses.push({
            type: 'documented_process',
            file: readme,
            indicators: foundIndicators,
            automationPotential: 'medium'
          });
        }
      }
    });

    // Check package.json scripts
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const scripts = packageJson.scripts || {};

      // Look for complex scripts that could be automated better
      Object.entries(scripts).forEach(([name, script]: [string, any]) => {
        if (script && script.includes('&&') && script.split('&&').length > 3) {
          manualProcesses.push({
            type: 'complex_npm_script',
            name: name,
            script: script,
            automationPotential: 'medium',
            recommendation: 'Consider breaking into separate workflow steps'
          });
        }
      });
    }

    return manualProcesses;
  }

  private analyzeBuildProcess(): any {
    const analysis: any = {
      hasBuildScript: false,
      buildTool: null,
      manualSteps: [],
      optimizations: []
    };

    // Check package.json
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const scripts = packageJson.scripts || {};

      if (scripts.build) {
        analysis.hasBuildScript = true;
        analysis.buildCommand = scripts.build;

        // Identify build tool
        if (scripts.build.includes('next')) {
          analysis.buildTool = 'Next.js';
        } else if (scripts.build.includes('webpack')) {
          analysis.buildTool = 'Webpack';
        } else if (scripts.build.includes('vite')) {
          analysis.buildTool = 'Vite';
        } else if (scripts.build.includes('rollup')) {
          analysis.buildTool = 'Rollup';
        } else if (scripts.build.includes('tsc')) {
          analysis.buildTool = 'TypeScript';
        }
      }

      // Check for prebuild/postbuild hooks
      if (scripts.prebuild || scripts.postbuild) {
        analysis.hasHooks = true;
      }
    }

    // Check for build configuration files
    const buildConfigs = [
      'webpack.config.js',
      'vite.config.js',
      'rollup.config.js',
      'tsconfig.json',
      'next.config.js'
    ];

    buildConfigs.forEach(config => {
      if (fs.existsSync(path.join(this.projectPath, config))) {
        analysis[config] = true;
      }
    });

    // Suggest optimizations
    if (!analysis.hasBuildScript) {
      analysis.optimizations.push('Add build script to package.json');
    }

    if (analysis.buildTool === 'Next.js') {
      analysis.optimizations.push('Consider using Turbopack for faster builds');
      analysis.optimizations.push('Enable SWC minification');
    }

    return analysis;
  }

  private analyzeTestProcess(): any {
    const analysis: any = {
      hasTests: false,
      testRunner: null,
      coverage: false,
      automatedTests: false,
      testTypes: []
    };

    // Check for test files
    const testPatterns = [
      '**/*.test.{js,jsx,ts,tsx}',
      '**/*.spec.{js,jsx,ts,tsx}',
      '__tests__/**/*',
      'test/**/*',
      'tests/**/*'
    ];

    let testFileCount = 0;
    testPatterns.forEach(pattern => {
      const files = this.findFiles(pattern);
      testFileCount += files.length;
    });

    if (testFileCount > 0) {
      analysis.hasTests = true;
      analysis.testFileCount = testFileCount;
    }

    // Check package.json for test scripts
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const scripts = packageJson.scripts || {};

      if (scripts.test) {
        analysis.automatedTests = true;
        analysis.testCommand = scripts.test;

        // Identify test runner
        if (scripts.test.includes('jest')) {
          analysis.testRunner = 'Jest';
        } else if (scripts.test.includes('vitest')) {
          analysis.testRunner = 'Vitest';
        } else if (scripts.test.includes('mocha')) {
          analysis.testRunner = 'Mocha';
        } else if (scripts.test.includes('cypress')) {
          analysis.testTypes.push('e2e');
        } else if (scripts.test.includes('playwright')) {
          analysis.testTypes.push('e2e');
        }
      }

      // Check for coverage
      if (scripts['test:coverage'] || (scripts.test && scripts.test.includes('--coverage'))) {
        analysis.coverage = true;
      }

      // Check for different test types
      Object.keys(scripts).forEach(key => {
        if (key.startsWith('test:')) {
          const testType = key.replace('test:', '');
          analysis.testTypes.push(testType);
        }
      });
    }

    // Check for test configuration files
    const testConfigs = [
      'jest.config.js',
      'jest.config.ts',
      'vitest.config.js',
      'cypress.config.js',
      'playwright.config.js',
      '.mocharc.json'
    ];

    testConfigs.forEach(config => {
      if (fs.existsSync(path.join(this.projectPath, config))) {
        analysis[config] = true;
      }
    });

    return analysis;
  }

  private analyzeDeploymentProcess(): any {
    const analysis: any = {
      deploymentTarget: null,
      manualDeployment: true,
      hasDeployScript: false,
      infrastructure: []
    };

    // Check for deployment configurations
    const deployConfigs = [
      'vercel.json',
      'netlify.toml',
      'app.yaml',  // Google App Engine
      'Dockerfile',
      'docker-compose.yml',
      'kubernetes.yml',
      'terraform',
      'ansible',
      '.elasticbeanstalk'
    ];

    deployConfigs.forEach(config => {
      const configPath = path.join(this.projectPath, config);
      if (fs.existsSync(configPath)) {
        analysis.infrastructure.push(config);

        // Identify deployment target
        if (config === 'vercel.json') {
          analysis.deploymentTarget = 'Vercel';
          analysis.manualDeployment = false;
        } else if (config === 'netlify.toml') {
          analysis.deploymentTarget = 'Netlify';
          analysis.manualDeployment = false;
        } else if (config === 'Dockerfile') {
          analysis.deploymentTarget = 'Container';
        }
      }
    });

    // Check package.json for deploy scripts
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const scripts = packageJson.scripts || {};

      if (scripts.deploy) {
        analysis.hasDeployScript = true;
        analysis.deployCommand = scripts.deploy;
        analysis.manualDeployment = false;
      }
    }

    return analysis;
  }

  private analyzeCodeQualityChecks(): any {
    const analysis: any = {
      linting: false,
      formatting: false,
      typeChecking: false,
      preCommitHooks: false,
      tools: []
    };

    // Check for linting
    const lintConfigs = [
      '.eslintrc.js',
      '.eslintrc.json',
      '.eslintrc.yml',
      '.eslintrc',
      'eslint.config.js'
    ];

    lintConfigs.forEach(config => {
      if (fs.existsSync(path.join(this.projectPath, config))) {
        analysis.linting = true;
        analysis.tools.push('ESLint');
      }
    });

    // Check for Prettier
    const prettierConfigs = ['.prettierrc', '.prettierrc.json', '.prettierrc.js'];
    prettierConfigs.forEach(config => {
      if (fs.existsSync(path.join(this.projectPath, config))) {
        analysis.formatting = true;
        analysis.tools.push('Prettier');
      }
    });

    // Check for TypeScript
    if (fs.existsSync(path.join(this.projectPath, 'tsconfig.json'))) {
      analysis.typeChecking = true;
      analysis.tools.push('TypeScript');
    }

    // Check for pre-commit hooks
    if (fs.existsSync(path.join(this.projectPath, '.husky'))) {
      analysis.preCommitHooks = true;
      analysis.tools.push('Husky');
    }

    if (fs.existsSync(path.join(this.projectPath, '.pre-commit-config.yaml'))) {
      analysis.preCommitHooks = true;
      analysis.tools.push('pre-commit');
    }

    return analysis;
  }

  private generateRecommendations(analysis: WorkflowAnalysis): void {
    const recommendations: any[] = [];

    // CI/CD recommendations
    if (analysis.currentWorkflows.length === 0) {
      recommendations.push({
        priority: 'high',
        category: 'ci_cd',
        recommendation: 'Implement CI/CD pipeline',
        tools: ['GitHub Actions', 'GitLab CI', 'CircleCI'],
        effort: 'medium',
        impact: 'high'
      });
    }

    // Build automation
    if (analysis.buildProcess && !analysis.buildProcess.hasBuildScript) {
      recommendations.push({
        priority: 'high',
        category: 'build',
        recommendation: 'Add automated build process',
        tools: ['npm scripts', 'Make', 'Gradle'],
        effort: 'low',
        impact: 'medium'
      });
    }

    // Test automation
    if (!analysis.testProcess.automatedTests) {
      recommendations.push({
        priority: 'high',
        category: 'testing',
        recommendation: 'Implement automated testing',
        tools: ['Jest', 'Vitest', 'Playwright'],
        effort: 'medium',
        impact: 'high'
      });
    }

    // Coverage
    if (analysis.testProcess.automatedTests && !analysis.testProcess.coverage) {
      recommendations.push({
        priority: 'medium',
        category: 'testing',
        recommendation: 'Add code coverage reporting',
        tools: ['Jest --coverage', 'NYC', 'Codecov'],
        effort: 'low',
        impact: 'medium'
      });
    }

    // Deployment automation
    if (analysis.deploymentProcess.manualDeployment) {
      recommendations.push({
        priority: 'critical',
        category: 'deployment',
        recommendation: 'Automate deployment process',
        tools: ['Vercel', 'Netlify', 'GitHub Actions', 'ArgoCD'],
        effort: 'high',
        impact: 'very high'
      });
    }

    // Code quality
    if (!analysis.codeQuality.linting) {
      recommendations.push({
        priority: 'medium',
        category: 'quality',
        recommendation: 'Add code linting',
        tools: ['ESLint', 'Prettier'],
        effort: 'low',
        impact: 'medium'
      });
    }

    if (!analysis.codeQuality.preCommitHooks) {
      recommendations.push({
        priority: 'medium',
        category: 'quality',
        recommendation: 'Add pre-commit hooks',
        tools: ['Husky', 'pre-commit', 'lint-staged'],
        effort: 'low',
        impact: 'medium'
      });
    }

    // Dependency management
    recommendations.push({
      priority: 'low',
      category: 'dependencies',
      recommendation: 'Automate dependency updates',
      tools: ['Dependabot', 'Renovate', 'Snyk'],
      effort: 'low',
      impact: 'medium'
    });

    analysis.automationOpportunities = recommendations;
  }

  private calculateComplexityScore(analysis: WorkflowAnalysis): number {
    let score = 0;

    // Add points based on existing automation
    score += analysis.currentWorkflows.length * 10;
    score += analysis.buildProcess.hasBuildScript ? 10 : 0;
    score += analysis.testProcess.automatedTests ? 15 : 0;
    score += analysis.testProcess.coverage ? 5 : 0;
    score += !analysis.deploymentProcess.manualDeployment ? 20 : 0;
    score += analysis.codeQuality.linting ? 5 : 0;
    score += analysis.codeQuality.formatting ? 5 : 0;
    score += analysis.codeQuality.typeChecking ? 10 : 0;
    score += analysis.codeQuality.preCommitHooks ? 10 : 0;

    // Subtract points for manual processes
    score -= analysis.manualProcesses.length * 5;

    return Math.max(0, Math.min(100, score));
  }

  private findFiles(pattern: string): string[] {
    try {
      const result = execSync(`find . -name "${pattern}" -type f 2>/dev/null`, {
        cwd: this.projectPath,
        encoding: 'utf8'
      });
      return result.split('\n').filter(line => line.trim());
    } catch {
      return [];
    }
  }

  public generateReport(analysis: WorkflowAnalysis): void {
    console.log('===================================');
    console.log('    Workflow Analysis Report');
    console.log('===================================\n');

    console.log(`📊 Automation Score: ${analysis.complexityScore}/100\n`);

    console.log('📋 Current Workflows:');
    if (analysis.currentWorkflows.length > 0) {
      analysis.currentWorkflows.forEach(workflow => {
        console.log(`  ✓ ${workflow.name} (${workflow.type})`);
        if (workflow.triggers) {
          console.log(`    Triggers: ${workflow.triggers.join(', ')}`);
        }
      });
    } else {
      console.log('  ❌ No CI/CD workflows found');
    }

    console.log('\n🔧 Manual Processes:');
    if (analysis.manualProcesses.length > 0) {
      analysis.manualProcesses.forEach(process => {
        console.log(`  ⚠️  ${process.file} (${process.type})`);
        console.log(`     Automation potential: ${process.automationPotential}`);
      });
    } else {
      console.log('  ✓ No manual processes detected');
    }

    console.log('\n🏗️  Build Process:');
    console.log(`  Build tool: ${analysis.buildProcess.buildTool || 'Not detected'}`);
    console.log(`  Has build script: ${analysis.buildProcess.hasBuildScript ? '✓' : '❌'}`);

    console.log('\n🧪 Test Process:');
    console.log(`  Test runner: ${analysis.testProcess.testRunner || 'Not detected'}`);
    console.log(`  Automated tests: ${analysis.testProcess.automatedTests ? '✓' : '❌'}`);
    console.log(`  Coverage: ${analysis.testProcess.coverage ? '✓' : '❌'}`);
    if (analysis.testProcess.testTypes.length > 0) {
      console.log(`  Test types: ${analysis.testProcess.testTypes.join(', ')}`);
    }

    console.log('\n🚀 Deployment:');
    console.log(`  Target: ${analysis.deploymentProcess.deploymentTarget || 'Not configured'}`);
    console.log(`  Automated: ${!analysis.deploymentProcess.manualDeployment ? '✓' : '❌'}`);

    console.log('\n✨ Code Quality:');
    console.log(`  Linting: ${analysis.codeQuality.linting ? '✓' : '❌'}`);
    console.log(`  Formatting: ${analysis.codeQuality.formatting ? '✓' : '❌'}`);
    console.log(`  Type checking: ${analysis.codeQuality.typeChecking ? '✓' : '❌'}`);
    console.log(`  Pre-commit hooks: ${analysis.codeQuality.preCommitHooks ? '✓' : '❌'}`);

    console.log('\n💡 Recommendations:');
    const sortedRecommendations = analysis.automationOpportunities.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority as keyof typeof priorityOrder] -
        priorityOrder[b.priority as keyof typeof priorityOrder];
    });

    sortedRecommendations.forEach((rec, index) => {
      console.log(`\n  ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.recommendation}`);
      console.log(`     Category: ${rec.category}`);
      console.log(`     Suggested tools: ${rec.tools.join(', ')}`);
      console.log(`     Effort: ${rec.effort} | Impact: ${rec.impact}`);
    });

    console.log('\n===================================');
  }
}

// Run analyzer if executed directly
if (require.main === module) {
  const analyzer = new WorkflowAnalyzer();
  analyzer.analyze().then(analysis => {
    analyzer.generateReport(analysis);

    // Save report to file
    const reportPath = path.join(process.cwd(), 'workflow-analysis.json');
    fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));
    console.log(`\n📄 Full report saved to: ${reportPath}`);
  }).catch(error => {
    console.error('Error analyzing workflows:', error);
    process.exit(1);
  });
}

export default WorkflowAnalyzer;