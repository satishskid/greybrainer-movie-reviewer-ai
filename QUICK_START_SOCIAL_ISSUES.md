# Quick Start: Social Issues Implementation

## Immediate Next Steps

Based on the comprehensive enhancement plan, here's how we can start implementing the social issues focus:

## ✅ Feasibility Assessment

**YES, this enhancement is highly feasible** because:

1. **Existing Infrastructure**: The three-layer analysis framework is already built
2. **AI Integration**: Gemini API is already integrated and working
3. **Component Architecture**: Modular design makes it easy to add new features
4. **Type Safety**: TypeScript provides strong foundation for new data models
5. **UI Framework**: React + Tailwind CSS allows rapid development

## Phase 1: Minimal Viable Enhancement (1-2 days)

### Step 1: Update the Insights Component

Replace the generic insight generation with social issue-focused prompts:

**File**: `services/geminiService.ts`

Find the `generateGreybrainerInsightWithGemini` function and update the prompt to:

```typescript
const prompt = `
You are a distinguished film scholar analyzing social issues in cinema.

Generate a concise insight (80-120 words) about how movies depict social issues through character portrayal, narrative patterns, or performance.

Focus on ONE of these three layers:
1. STORY LAYER: Character archetypes (protagonist, hero, heroine), narrative modes (comedy, tragedy, dramedy)
2. ORCHESTRATION LAYER: Directorial choices, casting, visual language
3. PERFORMANCE LAYER: Acting authenticity, emotional truth, cultural representation

Analyze a specific PATTERN or EVOLUTION in:
- Gender representation
- Racial/ethnic diversity
- LGBTQ+ visibility
- Class depiction
- Mental health portrayal
- Or other social issues

Requirements:
- Cite 2-3 specific recent films (2015-2024)
- Explain WHAT THE PATTERN REVEALS about cinema and society
- Start with "[STORY LAYER]", "[ORCHESTRATION LAYER]", or "[PERFORMANCE LAYER]"

Example:
"[PERFORMANCE LAYER] The evolution from tragic-queer to fully-realized queer characters demands performance authenticity. *Moonlight* (2016) and *Portrait of a Lady on Fire* (2019) showcase actors embodying queer experience with emotional specificity rather than symbolic representation, marking cinema's shift from performance-as-statement to performance-as-humanity."

Generate insight:
`.trim();
```

### Step 2: Enhance the UI Labels

**File**: `components/GreybrainerInsights.tsx`

Update the section title from "Greybrainer Insights & Research" to:

```typescript
<h2 className="text-2xl font-bold text-amber-300">
  Greybrainer Social Issues Research
</h2>
<p className="text-slate-300 mt-2 text-sm">
  Academic analysis of social issues depicted in cinema across Story, Orchestration, and Performance layers
</p>
```

### Step 3: Update the Landing Page

**File**: `components/EnhancedLandingPage.tsx`

Add social issues focus to the hero section description.

## Phase 2: Add Category Filtering (2-3 days)

### Step 1: Create Social Issue Type

**File**: `types.ts`

Add:

```typescript
export enum SocialIssueCategory {
  GENDER = 'Gender & Representation',
  RACE_ETHNICITY = 'Race & Ethnicity',
  LGBTQ = 'LGBTQ+ Visibility',
  CLASS = 'Class & Economics',
  MENTAL_HEALTH = 'Mental Health',
  DISABILITY = 'Disability',
  AGE = 'Age & Generation',
  ENVIRONMENT = 'Environmental',
  ALL = 'All Social Issues'
}
```

### Step 2: Add Category Selector to Insights Component

**File**: `components/GreybrainerInsights.tsx`

Add state and UI:

```typescript
const [selectedCategory, setSelectedCategory] = useState<SocialIssueCategory>(
  SocialIssueCategory.ALL
);

// Add category selector before the insight display
<div className="mb-4">
  <label className="block text-sm font-medium text-slate-300 mb-2">
    Focus Area:
  </label>
  <select
    value={selectedCategory}
    onChange={(e) => setSelectedCategory(e.target.value as SocialIssueCategory)}
    className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg"
  >
    {Object.values(SocialIssueCategory).map(category => (
      <option key={category} value={category}>{category}</option>
    ))}
  </select>
</div>
```

### Step 3: Pass Category to AI Service

Update the `generateGreybrainerInsightWithGemini` function to accept optional category parameter.

## Installation & Setup

```bash
cd /Users/spr/greybrainer

# Install dependencies (if needed)
npm install

# Start development server
npm run dev
```

## File Modification Checklist

### Priority 1 (Core Changes - Day 1)
- [ ] Update `generateGreybrainerInsightWithGemini` prompt in `services/geminiService.ts`
- [ ] Update heading in `components/GreybrainerInsights.tsx`
- [ ] Test insight quality with multiple generations

### Priority 2 (Enhanced Features - Day 2-3)
- [ ] Add `SocialIssueCategory` enum to `types.ts`
- [ ] Add category selector to `GreybrainerInsights.tsx`
- [ ] Update prompt to accept category parameter
- [ ] Update landing page copy

### Priority 3 (New Features - Day 4-5)
- [ ] Create `MovieSocialIssueAnalyzer.tsx` component
- [ ] Add `generateSocialIssueAnalysisForMovie` service function
- [ ] Integrate analyzer into main app flow
- [ ] Add routing/navigation

### Priority 4 (Polish - Day 6-7)
- [ ] Add data visualization components
- [ ] Implement export/download features
- [ ] Create example showcase
- [ ] Update documentation

## Success Criteria

### Minimum Viable Product (MVP)
✅ Insights focus on social issues  
✅ Three-layer framework clearly applied  
✅ Specific films cited as examples  
✅ Analysis reveals patterns, not just descriptions  
✅ Academic tone maintained  

### Full Enhancement
✅ All MVP criteria  
✅ Category filtering working  
✅ Movie-specific analysis functional  
✅ Export/share features implemented  
✅ Visual improvements and branding updated  
✅ Documentation complete  

## Next Actions

Would you like me to:

1. **Start with Priority 1** - Implement the core prompt changes right now?
2. **Create a new branch** - Set up git branch for these changes?
3. **Build the full type system** - Implement all TypeScript types first?
4. **Test current system** - Run the app and see current behavior?

Let me know which approach you'd prefer, and I'll proceed with the implementation!
