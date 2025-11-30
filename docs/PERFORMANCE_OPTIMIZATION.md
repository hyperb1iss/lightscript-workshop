# 🚀 Performance Optimization Guide

## Quick Wins for 6-Day Development Cycles

### 🏃‍♀️ Development Speed Optimizations

#### 1. **Parallel Builds** (30-60% faster)

```bash
# Old: Sequential builds (~5-10 seconds per effect)
npm run build

# New: Parallel builds with batching
npm run build  # Now uses up to 4 parallel workers
```

#### 2. **Fast Effect Switching**

```bash
# Interactive dev tools
npm run dev:tools

# Direct effect loading
EFFECT=glow-particles npm run dev:fast
```

#### 3. **Bundle Analysis**

```bash
# Analyze current build sizes
npm run bundle:size

# Build with analysis
npm run build:analyze
```

### 🔧 Development Workflow

#### Hot Reload Enhancements

- **Shader hot reload**: Changes to .glsl files trigger instant updates
- **Effect switching**: No server restart needed
- **Dependency optimization**: Faster cold starts with pre-bundled deps

#### Development Tools

```bash
# Launch interactive dev environment
npm run dev:tools

# Available tools:
# 1. Quick effect switching (no restart)
# 2. Single effect builds (faster iteration)
# 3. Shader file watching
# 4. Bundle size analysis
# 5. Performance profiling
```

### 📊 Bundle Size Optimization

#### Current Optimizations

- **Terser with beautification**: SignalRGB compatible
- **Tree shaking**: Unused code elimination
- **Dynamic imports**: Code splitting where beneficial
- **Dependency analysis**: THREE.js usage tracking

#### Size Monitoring

```bash
# Check effect sizes
npm run bundle:size

# Expected sizes:
# - Small effects: < 50KB
# - Medium effects: 50-100KB
# - Large effects: > 100KB (optimize these)
```

### 🚀 CI/CD Performance

#### Pipeline Optimizations

- **Parallel job execution**: Build + Test + Analysis
- **Dependency caching**: ~50% faster installs
- **Build artifact caching**: Skip unchanged effects
- **Bundle size reporting**: Automatic size alerts

#### Build Times

- **Local development**: < 2 seconds per effect
- **CI pipeline**: < 3 minutes total
- **Hot reload**: < 500ms

### 💡 6-Day Sprint Optimizations

#### Day 1-2: Rapid Prototyping

```bash
# Start with template
npm run dev:tools
# Select "1" for quick effect switching
# Build single effects for fast iteration
```

#### Day 3-4: Feature Development

```bash
# Continuous testing
npm run test:watch

# Bundle monitoring
npm run bundle:size  # Run after major changes
```

#### Day 5-6: Polish & Deploy

```bash
# Full build with analysis
npm run build:analyze

# Performance profiling
npm run dev:tools  # Option 5 for profiling
```

### 🎯 Performance Targets

#### Development Experience

- **Dev server start**: < 500ms
- **Hot reload**: < 200ms
- **Effect switching**: < 1 second
- **Single effect build**: < 2 seconds

#### Build Performance

- **Full build**: < 30 seconds
- **CI pipeline**: < 3 minutes
- **Bundle analysis**: < 5 seconds

#### Bundle Sizes

- **Per effect**: < 100KB recommended
- **Total workspace**: Monitor growth trends
- **Shader files**: Optimize for GPU memory

### 🔍 Monitoring & Analytics

#### Automatic Tracking

- Bundle size changes in PRs
- Build time regressions
- Test execution time
- Dependency size impact

#### Manual Checks

```bash
# Regular bundle analysis
npm run bundle:size

# Performance profiling
npm run dev:tools  # Interactive profiling

# Build time analysis
time npm run build
```

### 🛠️ Troubleshooting

#### Slow Builds

1. Check for large dependencies: `npm run bundle:size`
2. Profile individual effects: `npm run dev:tools` → Option 2
3. Clear build cache: `rm -rf dist/ .vite/`

#### Memory Issues

1. Limit parallel builds: Set `maxConcurrency = 2` in build script
2. Check for memory leaks in effects
3. Monitor THREE.js memory usage

#### Hot Reload Issues

1. Restart dev server: `npm run dev:fast`
2. Clear browser cache
3. Check shader compilation errors

---

_These optimizations are designed to keep your 6-day development cycles flowing smoothly. The goal is to eliminate all friction between idea and implementation._ ✨
