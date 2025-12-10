/**
 * Populate Knowledge Base with Qualia Solutions information
 * Run with: npx tsx scripts/populate-knowledge-base.ts
 */

import { google } from '@ai-sdk/google';
import { embed } from 'ai';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Knowledge base documents for Qualia Solutions
const documents = [
  {
    title: 'Qualia Solutions - Company Overview',
    content: `Qualia Solutions is Cyprus's premier agency specializing in artificial intelligence development, intelligent automation, and modern web experiences. Founded by Fawzi and Moayad, we are a boutique software development and digital marketing agency based in Nicosia, Cyprus with operations in Jordan.

We transform businesses through cutting-edge AI solutions, from conversational agents to full-scale automation systems. Our team combines deep technical expertise with creative problem-solving to deliver solutions that drive real business value.

Our mission is to make advanced AI accessible to businesses of all sizes, helping them automate operations, enhance customer experiences, and stay ahead of the competition.`,
    metadata: { category: 'company', priority: 'high' },
  },
  {
    title: 'Qualia Solutions - Team',
    content: `Qualia Solutions Team:

**Fawzi** - Founder & Lead Developer
- Full-stack developer with expertise in AI/ML, Next.js, React, and cloud architecture
- Handles all technical development, architecture decisions, and AI implementation
- Specializes in building voice AI agents, RAG systems, and automation workflows
- Based in Cyprus

**Moayad** - Co-founder & Operations
- Manages client relationships, project coordination, and business development
- Handles sales, marketing, and strategic partnerships
- Expert in understanding client needs and translating them into technical requirements
- Based in Jordan

Together, they bring a unique combination of technical excellence and business acumen to every project.`,
    metadata: { category: 'team', priority: 'high' },
  },
  {
    title: 'Qualia Solutions - AI Agents & Voice AI',
    content: `AI Agents & Voice AI Services:

**Support Agents** (€3,000 - €8,000)
- 24/7 customer service automation
- Sentiment analysis and escalation
- Multi-language support including Arabic
- Integration with CRM and helpdesk systems

**Sales Agents** (€5,000 - €12,000)
- Lead qualification and scoring
- Automated meeting scheduling
- CRM integration (HubSpot, Salesforce)
- Follow-up automation

**Executive Assistants** (€4,000 - €10,000)
- Email triage and prioritization
- Calendar management
- Data retrieval and reporting
- Task automation

**Neural Voice Agents** (€5,000 - €15,000)
- Sub-500ms response latency
- Natural conversational AI
- Built with VAPI, ElevenLabs, Deepgram
- Custom voice cloning available
- Bilingual support (Arabic/English)

All agents include:
- Custom training on your business data
- Integration with existing systems
- Analytics dashboard
- Ongoing optimization`,
    metadata: { category: 'services', subcategory: 'ai_agents', priority: 'high' },
  },
  {
    title: 'Qualia Solutions - Web Design & Development',
    content: `Web Design & Development Services:

**Landing Pages** (€500 - €1,500)
- Single-page websites
- Lead capture forms
- Mobile responsive
- SEO optimized

**Business Websites** (€2,000 - €5,000)
- 5-10 page websites
- Custom design
- CMS integration
- Contact forms and analytics

**E-commerce** (€5,000 - €15,000)
- Full online store setup
- Payment integration
- Inventory management
- Order processing

**Custom Web Applications** (€10,000 - €50,000+)
- SaaS platforms
- Client portals
- Internal tools
- API development

**Spatial Web Experiences**
- 3D websites with Three.js
- Interactive experiences
- WebGL animations
- Virtual showrooms

Tech Stack:
- Next.js / React
- TypeScript
- Tailwind CSS
- Supabase / PostgreSQL
- Vercel deployment`,
    metadata: { category: 'services', subcategory: 'web_design', priority: 'high' },
  },
  {
    title: 'Qualia Solutions - Automation & Integration',
    content: `Automation & Integration Services:

**Workflow Automation** (€1,000 - €5,000)
- Business process automation
- Data synchronization
- Notification systems
- Scheduled tasks

**CRM Integration** (€2,000 - €8,000)
- HubSpot, Salesforce, Pipedrive
- Custom CRM development
- Data migration
- API connections

**AI Content Generation** (€1,500 - €4,000)
- Blog post automation
- Social media content
- Product descriptions
- Email templates

**RAG Systems** (€5,000 - €20,000)
- Custom knowledge bases
- Document Q&A systems
- Internal search engines
- AI-powered documentation

Tools We Use:
- n8n (self-hosted automation)
- Make.com
- Zapier
- Custom API integrations
- LangChain for LLM orchestration`,
    metadata: { category: 'services', subcategory: 'automation', priority: 'high' },
  },
  {
    title: 'Qualia Solutions - SEO & Digital Marketing',
    content: `SEO & Digital Marketing Services:

**Technical SEO Audit** (€500 - €1,500)
- Site speed optimization
- Core Web Vitals
- Schema markup
- Crawlability fixes

**Monthly SEO Retainer** (€500 - €2,000/month)
- Keyword research
- Content optimization
- Link building
- Monthly reporting

**Google Ads Management** (15-20% of ad spend, min €500/month)
- Campaign setup
- Keyword targeting
- Ad copywriting
- Conversion tracking

**Meta Ads (Facebook/Instagram)** (15-20% of ad spend, min €500/month)
- Audience targeting
- Creative development
- A/B testing
- Retargeting campaigns

**Content Marketing** (€1,000 - €3,000/month)
- Blog content strategy
- SEO content writing
- Social media management
- Email marketing

We are a certified Google Partner.`,
    metadata: { category: 'services', subcategory: 'marketing', priority: 'high' },
  },
  {
    title: 'Qualia Solutions - Development Process',
    content: `Our Development Process:

**1. Discovery (1-2 days)**
- Initial consultation call
- Understanding your business goals
- Identifying pain points and opportunities
- Defining success metrics

**2. Proposal (1-2 days)**
- Detailed project scope
- Timeline and milestones
- Pricing breakdown
- Technical approach

**3. Design (3-5 days)**
- UI/UX wireframes
- Visual mockups in Figma
- Client feedback and revisions
- Design approval

**4. Development (1-4 weeks)**
- Agile sprints
- Regular progress updates
- Client demos
- Iterative refinement

**5. Testing (2-3 days)**
- Quality assurance
- Bug fixes
- Performance optimization
- Security review

**6. Launch (1 day)**
- Production deployment
- DNS configuration
- SSL setup
- Go-live checklist

**7. Support (Ongoing)**
- 30-day warranty included
- Optional maintenance plans
- Priority support available
- Feature enhancements`,
    metadata: { category: 'process', priority: 'high' },
  },
  {
    title: 'Qualia Solutions - Technology Stack',
    content: `Technology Stack & Tools:

**Frontend Development**
- Next.js 14+ (App Router)
- React 18+
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Three.js for 3D

**Backend & Database**
- Supabase (PostgreSQL)
- Vercel Edge Functions
- Node.js
- REST & GraphQL APIs

**AI & Machine Learning**
- OpenAI GPT-4
- Anthropic Claude
- Google Gemini
- LangChain
- Vector databases (pgvector)
- RAG pipelines

**Voice AI**
- VAPI (voice orchestration)
- ElevenLabs (text-to-speech)
- Deepgram (speech-to-text)
- Custom voice cloning

**Automation**
- n8n (self-hosted)
- Make.com
- Zapier
- Custom webhooks

**DevOps & Hosting**
- Vercel
- Railway
- GitHub Actions
- Docker

**Analytics & Marketing**
- Google Analytics 4
- Google Search Console
- Ahrefs
- Meta Business Suite`,
    metadata: { category: 'technology', priority: 'medium' },
  },
  {
    title: 'Qualia Solutions - Contact Information',
    content: `Contact Qualia Solutions:

**Office Address:**
LEDRA 145, First Floor
Nicosia, Cyprus

**Secondary Address:**
6 Amathountos, Strovolos
Nicosia, Cyprus

**Phone:**
+357 99 111 668

**Email:**
info@qualiasolutions.net
hello@qualia.solutions

**Website:**
https://qualiasolutions.net

**Working Hours:**
Sunday - Thursday: 9:00 AM - 6:00 PM (Cyprus/Jordan time)
Friday - Saturday: Closed

**Response Time:**
- Email: Within 24 hours
- Phone: Immediate during business hours
- WhatsApp: Available for quick questions

**Locations Served:**
- Cyprus (primary)
- Jordan (secondary)
- Remote clients worldwide (English & Arabic)`,
    metadata: { category: 'contact', priority: 'high' },
  },
  {
    title: 'Qualia Solutions - Pricing Overview',
    content: `Pricing Overview:

**Web Design & Development**
- Simple landing page: €500 - €1,500
- Business website (5-10 pages): €2,000 - €5,000
- E-commerce site: €5,000 - €15,000
- Custom web application: €10,000 - €50,000+

**AI Agents**
- Basic chatbot: €3,000 - €5,000
- Advanced AI agent: €5,000 - €12,000
- Voice AI agent: €5,000 - €15,000
- Enterprise AI system: €15,000 - €50,000+

**Automation**
- Simple workflow: €1,000 - €3,000
- Complex integration: €3,000 - €8,000
- RAG system: €5,000 - €20,000

**SEO & Marketing**
- SEO audit: €500 - €1,500
- Monthly SEO retainer: €500 - €2,000/month
- Ad management: 15-20% of ad spend (min €500/month)

**Payment Terms:**
- 50% upfront, 50% on completion
- Monthly retainers billed in advance
- Net 15 payment terms for established clients

**Discounts:**
- 10% for annual commitments
- Startup-friendly pricing available
- Non-profit discounts`,
    metadata: { category: 'pricing', priority: 'high' },
  },
  {
    title: 'Qualia Solutions - Industries & Clients',
    content: `Industries We Serve:

**Energy & Utilities**
- Smart energy solutions
- Customer service automation
- Billing system integration

**Logistics & Transportation**
- Route optimization
- Customer tracking portals
- Dispatch automation

**Real Estate**
- Property listing platforms
- Virtual tours (3D)
- Lead management systems
- Client portals

**E-commerce & Retail**
- Online stores
- Inventory management
- Customer support bots
- Personalization engines

**Professional Services**
- Law firms
- Accounting practices
- Consulting agencies
- Healthcare providers

**Hospitality**
- Hotel booking systems
- Restaurant reservations
- Customer feedback automation

We work with businesses of all sizes:
- Startups and SMBs
- Mid-market companies
- Enterprise clients
- Non-profits and educational institutions`,
    metadata: { category: 'industries', priority: 'medium' },
  },
  {
    title: 'Qualia Solutions - Why Choose Us',
    content: `Why Choose Qualia Solutions:

**1. AI-First Approach**
We don't just build websites - we infuse intelligence into everything we create. From smart chatbots to predictive analytics, AI is at the core of our solutions.

**2. Boutique Agency Attention**
Unlike large agencies, you work directly with our founders. No account managers, no bureaucracy - just direct communication with the people building your solution.

**3. Bilingual Excellence**
We're fluent in both English and Arabic, serving clients across the Middle East and Europe with cultural understanding and language expertise.

**4. Modern Tech Stack**
We use the latest technologies (Next.js, Supabase, Vercel) ensuring your solution is fast, secure, and scalable.

**5. Transparent Pricing**
No hidden fees, no surprises. We provide detailed proposals with clear pricing before any work begins.

**6. Speed to Market**
Our streamlined process means we can launch your MVP in weeks, not months. Perfect for startups and time-sensitive projects.

**7. Ongoing Partnership**
We don't disappear after launch. We offer maintenance plans and are always available for enhancements and support.

**8. Cyprus & Jordan Based**
Strategic location serving Europe, Middle East, and beyond with favorable timezone overlap.`,
    metadata: { category: 'value_proposition', priority: 'high' },
  },
];

async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: google.textEmbeddingModel('text-embedding-004'),
    value: text,
  });
  return embedding;
}

async function populateKnowledgeBase() {
  console.log('Starting knowledge base population...\n');

  for (const doc of documents) {
    try {
      console.log(`Processing: ${doc.title}`);

      // Generate embedding for the content
      const embedding = await generateEmbedding(`${doc.title}\n\n${doc.content}`);
      console.log(`  Generated embedding (${embedding.length} dimensions)`);

      // Insert into database
      const { data, error } = await supabase
        .from('documents')
        .insert({
          title: doc.title,
          content: doc.content,
          embedding: embedding,
          metadata: doc.metadata,
        })
        .select('id')
        .single();

      if (error) {
        console.error(`  Error inserting: ${error.message}`);
      } else {
        console.log(`  Inserted with ID: ${data.id}`);
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`  Error processing ${doc.title}:`, error);
    }
  }

  console.log('\nKnowledge base population complete!');
}

populateKnowledgeBase().catch(console.error);
