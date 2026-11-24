/**
 * competitors.js — Competitor Trend & Product Analyzer API Routes.
 * Implements competitor URL management, Jina Reader parallel scraping,
 * Groq Qwen 3.8-27B AI synthesis, and persistent report storage.
 */

const express = require('express');
const crypto = require('crypto');
const pool = require('../db/pool');

const router = express.Router();

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'qwen/qwen3.8-27b';

/**
 * Clean Jina Reader markdown by removing image references and collapsing whitespace.
 */
function cleanJinaText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/!\[.*?\]\(.*?\)/g, '')                         // Standard markdown images
    .replace(/\[Image[^\]]*\]/gi, '')                        // [Image ...] tags
    .replace(/\[.*?\]\(https?:\/\/[^\s)]+\.(?:png|jpg|jpeg|gif|webp|svg)[^)]*\)/gi, '') // Image hyperlinks
    .replace(/\r\n|\r/g, '\n')
    .replace(/[ \t]+/g, ' ')                                 // Collapse horizontal spaces
    .replace(/\n\s*\n\s*\n+/g, '\n\n')                       // Collapse excessive line breaks
    .trim();
}

/**
 * 1. GET /api/competitors (and /api/v1/competitors)
 * Fetch all active competitors ordered by created_at ASC.
 */
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT competitor_id, brand_name, url, is_active, created_at FROM public.competitors WHERE is_active = TRUE ORDER BY created_at ASC'
    );
    res.json({ success: true, data: rows, message: 'Competitors retrieved successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * 2. POST /api/competitors
 * Add a new competitor with maximum 5 active competitors limit.
 */
router.post('/', async (req, res, next) => {
  try {
    const brandName = (req.body.brand_name || req.body.brandName || '').trim();
    let url = (req.body.url || '').trim();

    if (!brandName) {
      return res.status(400).json({ success: false, data: null, message: 'Brand name is required' });
    }
    if (!url) {
      return res.status(400).json({ success: false, data: null, message: 'Competitor collection URL is required' });
    }

    // Ensure valid protocol
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    try {
      new URL(url);
    } catch (_) {
      return res.status(400).json({ success: false, data: null, message: 'Invalid URL format' });
    }

    // Check active competitor limit (Max 5)
    const { rows: countRows } = await pool.query(
      'SELECT COUNT(*)::int AS count FROM public.competitors WHERE is_active = TRUE'
    );
    const activeCount = countRows[0]?.count || 0;

    if (activeCount >= 5) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Maximum limit of 5 active competitors reached. Please delete an existing competitor before adding a new one.'
      });
    }

    const { rows } = await pool.query(
      'INSERT INTO public.competitors (brand_name, url, is_active) VALUES ($1, $2, TRUE) RETURNING competitor_id, brand_name, url, is_active, created_at',
      [brandName, url]
    );

    res.status(201).json({ success: true, data: rows[0], message: 'Competitor added successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * 3. DELETE /api/competitors/:id
 * Delete a competitor by competitor_id.
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const competitorId = parseInt(req.params.id, 10);
    if (isNaN(competitorId)) {
      return res.status(400).json({ success: false, data: null, message: 'Invalid competitor ID' });
    }

    const { rowCount } = await pool.query(
      'DELETE FROM public.competitors WHERE competitor_id = $1',
      [competitorId]
    );

    if (rowCount === 0) {
      return res.status(404).json({ success: false, data: null, message: 'Competitor not found' });
    }

    res.json({ success: true, data: null, message: 'Competitor deleted successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * 4. GET /api/competitors/reports/latest
 * Fetch the most recent report from public.competitor_reports.
 */
router.get('/reports/latest', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT report_id, analyzed_brands, new_products, trending_hashtags, caption_ideas, trending_angles, executive_summary, created_at FROM public.competitor_reports ORDER BY created_at DESC LIMIT 1'
    );

    if (rows.length === 0) {
      return res.json({ success: true, data: null, message: 'No competitor reports found' });
    }

    res.json({ success: true, data: rows[0], message: 'Latest report retrieved successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * 5. POST /api/competitors/analyze
 * Execute scraping via Jina Reader in parallel, synthesize with Groq AI, and save report.
 */
router.post('/analyze', async (req, res, next) => {
  try {
    // 1. Query all active competitors
    const { rows: competitors } = await pool.query(
      'SELECT competitor_id, brand_name, url FROM public.competitors WHERE is_active = TRUE ORDER BY created_at ASC'
    );

    if (competitors.length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'No active competitors found. Please add at least one competitor URL to analyze.'
      });
    }

    // 2. Scrape competitor URLs in parallel using Promise.allSettled via Jina Reader
    const scrapeResults = await Promise.allSettled(
      competitors.map(async (c) => {
        const jinaUrl = `https://r.jina.ai/${c.url}`;
        const response = await fetch(jinaUrl, {
          headers: {
            'Accept': 'text/plain',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          signal: AbortSignal.timeout(15000)
        });

        if (!response.ok) {
          throw new Error(`Jina Reader HTTP ${response.status}`);
        }

        const rawText = await response.text();
        return {
          brand: c.brand_name,
          url: c.url,
          raw: rawText
        };
      })
    );

    // 3. Dynamic character budget (~4500 chars total across all active competitors)
    const perSiteLimit = Math.max(900, Math.floor(4500 / competitors.length));
    const validExtracts = [];
    for (const resItem of scrapeResults) {
      if (resItem.status === 'fulfilled' && resItem.value?.raw) {
        const cleaned = cleanJinaText(resItem.value.raw).slice(0, perSiteLimit);
        if (cleaned.length >= 50) {
          validExtracts.push({
            brand: resItem.value.brand,
            url: resItem.value.url,
            text: cleaned
          });
        }
      }
    }

    if (validExtracts.length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Unable to scrape product information from any of the configured competitor URLs. Please ensure the URLs point to active, publicly reachable collections or websites.'
      });
    }

    // 4. Check Groq API Key
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey || groqApiKey === 'your_groq_api_key_here') {
      return res.status(500).json({
        success: false,
        data: null,
        message: 'GROQ_API_KEY is not configured in the server environment.'
      });
    }

    // Format competitor excerpts for the AI prompt
    const formattedCompetitorData = validExtracts
      .map((item, idx) => `--- Competitor #${idx + 1}: ${item.brand} (${item.url}) ---\n${item.text}\n`)
      .join('\n');

    const promptMessages = [
      {
        role: 'system',
        content: `You are a world-class senior luxury jewelry & fashion social media strategist, brand consultant, and market trend analyst.
Analyze real-time competitor collections and new arrivals extracts to identify emerging jewelry designs, viral content angles, and marketing opportunities.

You must reply with STRICTLY VALID JSON adhering to this exact schema with NO extra outer text or markdown code fences:
{
  "new_products": [
    "Item / Design / Material with brief styling note (5 to 8 items total)"
  ],
  "trending_hashtags": [
    "#hashtag (10 to 12 high-converting Instagram/TikTok tags)"
  ],
  "caption_ideas": [
    "Ready-to-use luxury Instagram caption hook with emojis, tone, and CTA (4 to 5 captions total)"
  ],
  "trending_angles": [
    "Strategic marketing angle, styling advice, or seasonal gifting theme (3 to 5 angles total)"
  ],
  "executive_summary": "A concise 2 to 3 sentence strategic overview summarizing key competitor moves and our immediate brand opportunity."
}`
      },
      {
        role: 'user',
        content: `Below are fresh scraped website extracts from ${validExtracts.length} luxury jewelry competitor collection(s):\n\n${formattedCompetitorData}\n\nPerform a thorough competitor trend analysis and return strictly valid JSON matching the 5 required keys.`
      }
    ];

    // Call Groq Chat Completions API (no strict json_object mode so Qwen never 400s)
    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        reasoning_effort: 'none',
        messages: [
          ...promptMessages,
          {
            role: 'system',
            content: 'Keep each array item concise (under 15 words) so the entire JSON fits comfortably within 700 tokens. Start your response immediately with { and end with }.'
          }
        ],
        temperature: 0.4,
        max_tokens: 950
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error('[Groq API Error]:', groqResponse.status, errText);
      return res.status(502).json({
        success: false,
        data: null,
        message: `Groq AI generation failed (${groqResponse.status}): ${errText.slice(0, 200)}`
      });
    }

    const groqJson = await groqResponse.json();
    const rawContent = groqJson.choices?.[0]?.message?.content || '';

    // Safely extract JSON object even if wrapped in ```json fences or leading text
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[AI Output Parse Error]:', rawContent);
      return res.status(502).json({
        success: false,
        data: null,
        message: 'Groq AI did not return a valid JSON object. Please try again.'
      });
    }

    let parsedAiOutput;
    try {
      parsedAiOutput = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error('[AI JSON Syntax Error]:', rawContent);
      return res.status(502).json({
        success: false,
        data: null,
        message: 'Groq AI returned incomplete JSON. Please try again.'
      });
    }

    // Normalize keys and fallback defensively
    const newProducts = Array.isArray(parsedAiOutput.new_products) ? parsedAiOutput.new_products : [];
    const trendingHashtags = Array.isArray(parsedAiOutput.trending_hashtags) ? parsedAiOutput.trending_hashtags : [];
    const captionIdeas = Array.isArray(parsedAiOutput.caption_ideas) ? parsedAiOutput.caption_ideas : [];
    const trendingAngles = Array.isArray(parsedAiOutput.trending_angles) ? parsedAiOutput.trending_angles : [];
    const executiveSummary = typeof parsedAiOutput.executive_summary === 'string'
      ? parsedAiOutput.executive_summary
      : 'Competitor analysis completed successfully based on recent arrivals.';

    // 5. Generate unique report_id and insert into database
    const reportId = `REP-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const analyzedBrands = validExtracts.map((v) => v.brand);

    const insertQuery = `
      INSERT INTO public.competitor_reports (
        report_id,
        analyzed_brands,
        new_products,
        trending_hashtags,
        caption_ideas,
        trending_angles,
        executive_summary,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING report_id, analyzed_brands, new_products, trending_hashtags, caption_ideas, trending_angles, executive_summary, created_at
    `;

    const { rows: savedRows } = await pool.query(insertQuery, [
      reportId,
      JSON.stringify(analyzedBrands),
      JSON.stringify(newProducts),
      JSON.stringify(trendingHashtags),
      JSON.stringify(captionIdeas),
      JSON.stringify(trendingAngles),
      executiveSummary
    ]);

    res.status(201).json({
      success: true,
      data: savedRows[0],
      message: 'Competitor analysis completed and report saved successfully'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
