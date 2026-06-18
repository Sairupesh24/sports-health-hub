const fs = require('fs');
const path = require('path');

const bodyFrontPath = path.join(__dirname, '..', 'src', 'components', 'consultant', 'bodyFront.ts');
const bodyBackPath = path.join(__dirname, '..', 'src', 'components', 'consultant', 'bodyBack.ts');
const bodySvgPath = path.join(__dirname, '..', 'src', 'components', 'consultant', 'BodySvg.tsx');

// Read files
// We will extract path strings using simple regexes.
function extractPathsFromTs(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Find all strings like "M..." or "m..."
  const matches = content.match(/"[Mm][^"]+"/g) || [];
  return matches.map(m => m.slice(1, -1));
}

const frontPaths = extractPathsFromTs(bodyFrontPath);
const backPaths = extractPathsFromTs(bodyBackPath);

// For BodySvg, let's extract the outlines
const bodySvgContent = fs.readFileSync(bodySvgPath, 'utf8');
const outlineMatches = bodySvgContent.match(/"[Mm][^"]+"/g) || [];
const outlinePaths = outlineMatches.map(m => m.slice(1, -1));

function parsePathPoints(pathStr) {
  // Extract all numbers (including negative and decimal numbers)
  const numbers = (pathStr.match(/-?\d+\.?\d*/g) || []).map(Number);
  // Separate into X and Y pairs (assuming odd indices are Y and even indices are X, roughly)
  // Let's just find the min/max X coordinates
  // Note: we can't be 100% sure which number is X without a full SVG parser,
  // but we can check if any numbers in the path string are exceptionally large or small.
  // Let's filter numbers that look like X coordinates.
  return numbers;
}

function analyzePaths(paths, label, minX, maxX) {
  console.log(`\nAnalyzing ${label} (${paths.length} paths):`);
  paths.forEach((p, idx) => {
    const numbers = parsePathPoints(p);
    if (numbers.length === 0) return;
    
    // Let's check min and max of all numbers in the path
    const minVal = Math.min(...numbers);
    const maxVal = Math.max(...numbers);
    
    // If a path is supposed to be in Front (X in 0..724) but contains numbers > 800 (except maybe SVG commands),
    // or if it spans across a huge range.
    // Let's print paths that have numbers spanning a huge range (e.g. max - min > 500)
    const range = maxVal - minVal;
    if (range > 600) {
      console.log(`Path ${idx} has exceptionally large range: min=${minVal}, max=${maxVal}, range=${range}`);
      console.log(`Snippet: ${p.slice(0, 100)}...${p.slice(-100)}`);
    }
    
    // Check for specific large values that shouldn't be there
    // If a front path contains numbers around 1000+, it might be jumping to the back view!
    if (label.includes('Front') && maxVal > 800) {
      console.log(`Front Path ${idx} contains value > 800: max=${maxVal}`);
      console.log(`Snippet: ${p.slice(0, 100)}...${p.slice(-100)}`);
    }
    
    // Check for specific small values in back paths
    if (label.includes('Back') && minVal < 200 && maxVal > 1000) {
      console.log(`Back Path ${idx} spans from low to high: min=${minVal}, max=${maxVal}`);
      console.log(`Snippet: ${p.slice(0, 100)}...${p.slice(-100)}`);
    }
  });
}

analyzePaths(frontPaths, 'Front View Paths', 0, 720);
analyzePaths(backPaths, 'Back View Paths', 724, 1448);
analyzePaths(outlinePaths, 'Outline Paths', 0, 1500);
