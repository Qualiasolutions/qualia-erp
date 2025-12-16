// Semantic Release Configuration
module.exports = {
  branches: [
    'main',
    'master',
    { name: 'beta', prerelease: true },
    { name: 'alpha', prerelease: true },
    { name: 'next', prerelease: true }
  ],
  plugins: [
    // Analyze commits to determine version bump
    ['@semantic-release/commit-analyzer', {
      preset: 'angular',
      releaseRules: [
        { type: 'feat', release: 'minor' },
        { type: 'fix', release: 'patch' },
        { type: 'perf', release: 'patch' },
        { type: 'docs', scope: 'README', release: 'patch' },
        { type: 'refactor', release: 'patch' },
        { type: 'style', release: false },
        { type: 'test', release: false },
        { type: 'build', release: false },
        { type: 'ci', release: false },
        { type: 'chore', release: false },
        { type: 'revert', release: 'patch' },
        { breaking: true, release: 'major' },
        { revert: true, release: 'patch' }
      ],
      parserOpts: {
        noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES', 'BREAKING']
      }
    }],

    // Generate release notes
    ['@semantic-release/release-notes-generator', {
      preset: 'angular',
      writerOpts: {
        commitsSort: ['subject', 'scope']
      }
    }],

    // Update CHANGELOG.md
    ['@semantic-release/changelog', {
      changelogFile: 'CHANGELOG.md',
      changelogTitle: '# Changelog\n\nAll notable changes to this project will be documented in this file.'
    }],

    // Update package.json version
    ['@semantic-release/npm', {
      npmPublish: false // Don't publish to npm registry
    }],

    // Commit changes
    ['@semantic-release/git', {
      assets: [
        'CHANGELOG.md',
        'package.json',
        'package-lock.json'
      ],
      message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
    }],

    // Create GitHub release
    ['@semantic-release/github', {
      assets: [
        { path: '.next/**/*', label: 'Build artifacts' }
      ],
      successComment: false,
      failComment: false,
      labels: ['release'],
      releasedLabels: ['released']
    }],

    // Custom plugin for Slack notifications
    ['@semantic-release/exec', {
      publishCmd: 'echo "Release ${nextRelease.version} published"',
      successCmd: `curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"🚀 Version ${nextRelease.version} has been released!"}' \
        $SLACK_WEBHOOK || true`
    }]
  ]
};