const LOGO_URL = "https://lihctrhzsyjqnlzwwkzo.supabase.co/storage/v1/object/public/email-assets/logo.png";

const brandedHeader = `
  <div style="text-align: center; padding: 30px 0 20px 0; background: linear-gradient(135deg, #c026d3 0%, #7c3aed 50%, #f97316 100%); border-radius: 12px 12px 0 0;">
    <img src="${LOGO_URL}" alt="ArtistrySynk" style="height: 80px; width: auto;" />
  </div>
`;

export interface NewsletterTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  generateHtml: (content: string, subject: string) => string;
}

export const newsletterTemplates: NewsletterTemplate[] = [
  {
    id: "minimal",
    name: "Minimal",
    description: "Clean and simple design with focus on content",
    thumbnail: "📝",
    generateHtml: (content: string, subject: string) => `
      <div style="max-width: 600px; margin: 0 auto;">
        ${brandedHeader}
        <div style="padding: 32px 24px;">
          <h1 style="color: #18181b; font-size: 24px; margin-bottom: 24px;">${subject}</h1>
          <div style="color: #52525b; font-size: 16px; line-height: 1.7;">
            ${content}
          </div>
          <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;" />
          <p style="color: #a1a1aa; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} ArtistrySynk • <a href="https://artistrysynk.com" style="color: #c026d3;">Visit Website</a>
          </p>
        </div>
      </div>
    `,
  },
  {
    id: "gradient-header",
    name: "Gradient Header",
    description: "Bold gradient header with branded colors",
    thumbnail: "🎨",
    generateHtml: (content: string, subject: string) => `
      <div style="max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #c026d3 0%, #7c3aed 50%, #f97316 100%); padding: 40px 24px; text-align: center; border-radius: 12px 12px 0 0;">
          <img src="${LOGO_URL}" alt="ArtistrySynk" style="height: 80px; width: auto; margin-bottom: 12px;" />
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">${subject}</p>
        </div>
        <div style="background-color: #18181b; padding: 32px 24px; border-radius: 0 0 12px 12px;">
          <div style="color: #a1a1aa; font-size: 16px; line-height: 1.7;">
            ${content}
          </div>
        </div>
        <p style="color: #52525b; font-size: 12px; text-align: center; margin-top: 24px;">
          © ${new Date().getFullYear()} ArtistrySynk
        </p>
      </div>
    `,
  },
  {
    id: "featured-card",
    name: "Featured Card",
    description: "Elegant card-based design with shadow effects",
    thumbnail: "💎",
    generateHtml: (content: string, subject: string) => `
      <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="${LOGO_URL}" alt="ArtistrySynk" style="height: 60px; width: auto; margin-bottom: 8px;" />
        </div>
        <div style="background: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); padding: 32px; border: 1px solid #e4e4e7;">
          <h2 style="color: #18181b; font-size: 22px; margin: 0 0 20px 0; border-bottom: 2px solid #c026d3; padding-bottom: 12px;">
            ${subject}
          </h2>
          <div style="color: #52525b; font-size: 15px; line-height: 1.8;">
            ${content}
          </div>
        </div>
        <div style="text-align: center; margin-top: 24px;">
          <a href="https://artistrysynk.com" style="display: inline-block; background: linear-gradient(135deg, #c026d3, #7c3aed); color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600;">
            Explore ArtistrySynk
          </a>
        </div>
        <p style="color: #a1a1aa; font-size: 11px; text-align: center; margin-top: 32px;">
          © ${new Date().getFullYear()} ArtistrySynk • Global Creative Network
        </p>
      </div>
    `,
  },
  {
    id: "dark-mode",
    name: "Dark Mode",
    description: "Sleek dark theme for a modern look",
    thumbnail: "🌙",
    generateHtml: (content: string, subject: string) => `
      <div style="max-width: 600px; margin: 0 auto; background-color: #0a0a0b; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(180deg, #27272a 0%, #18181b 100%); padding: 32px 24px; text-align: center; border-bottom: 1px solid #3f3f46;">
          <img src="${LOGO_URL}" alt="ArtistrySynk" style="height: 60px; width: auto; margin-bottom: 12px;" />
          <h1 style="color: #ffffff; font-size: 24px; margin: 0;">
            <span style="background: linear-gradient(135deg, #c026d3, #f97316); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
              ${subject}
            </span>
          </h1>
        </div>
        <div style="padding: 32px 24px;">
          <div style="color: #d4d4d8; font-size: 15px; line-height: 1.8;">
            ${content}
          </div>
        </div>
        <div style="background-color: #18181b; padding: 20px 24px; text-align: center; border-top: 1px solid #27272a;">
          <a href="https://artistrysynk.com" style="color: #c026d3; text-decoration: none; font-size: 13px;">
            Visit ArtistrySynk
          </a>
          <span style="color: #52525b; margin: 0 8px;">•</span>
          <span style="color: #52525b; font-size: 13px;">© ${new Date().getFullYear()}</span>
        </div>
      </div>
    `,
  },
  {
    id: "announcement",
    name: "Announcement",
    description: "High-impact design for important announcements",
    thumbnail: "📢",
    generateHtml: (content: string, subject: string) => `
      <div style="max-width: 600px; margin: 0 auto;">
        <div style="background: #c026d3; padding: 16px; text-align: center;">
          <span style="color: #fff; font-size: 14px; font-weight: 600; letter-spacing: 1px;">📢 ANNOUNCEMENT</span>
        </div>
        <div style="background: linear-gradient(135deg, #18181b 0%, #27272a 100%); padding: 40px 24px; text-align: center;">
          <img src="${LOGO_URL}" alt="ArtistrySynk" style="height: 60px; width: auto; margin-bottom: 16px;" />
          <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 16px 0; line-height: 1.3;">
            ${subject}
          </h1>
          <div style="width: 60px; height: 3px; background: linear-gradient(90deg, #c026d3, #f97316); margin: 0 auto 24px auto; border-radius: 2px;"></div>
        </div>
        <div style="background-color: #ffffff; padding: 32px 24px;">
          <div style="color: #52525b; font-size: 16px; line-height: 1.8;">
            ${content}
          </div>
          <div style="text-align: center; margin-top: 32px;">
            <a href="https://artistrysynk.com" style="display: inline-block; background: #c026d3; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
              Learn More
            </a>
          </div>
        </div>
        <div style="background-color: #f4f4f5; padding: 20px; text-align: center;">
          <p style="color: #71717a; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} ArtistrySynk • <a href="https://artistrysynk.com" style="color: #c026d3; text-decoration: none;">Unsubscribe</a>
          </p>
        </div>
      </div>
    `,
  },
  {
    id: "creative-spotlight",
    name: "Creative Spotlight",
    description: "Perfect for featuring artists or content",
    thumbnail: "🌟",
    generateHtml: (content: string, subject: string) => `
      <div style="max-width: 600px; margin: 0 auto; background: #0a0a0b;">
        <div style="padding: 32px 24px; text-align: center;">
          <img src="${LOGO_URL}" alt="ArtistrySynk" style="height: 60px; width: auto; margin-bottom: 16px;" />
          <h1 style="color: #ffffff; font-size: 26px; margin: 0; font-weight: 300;">
            ${subject}
          </h1>
          <div style="width: 80px; height: 2px; background: linear-gradient(90deg, transparent, #f97316, transparent); margin: 20px auto;"></div>
        </div>
        <div style="background: linear-gradient(180deg, #18181b 0%, #27272a 100%); border-radius: 20px; margin: 0 16px; padding: 32px 24px;">
          <div style="color: #d4d4d8; font-size: 15px; line-height: 1.9;">
            ${content}
          </div>
        </div>
        <div style="padding: 32px 24px; text-align: center;">
          <a href="https://artistrysynk.com/discover" style="display: inline-block; border: 2px solid #c026d3; color: #c026d3; text-decoration: none; padding: 12px 28px; border-radius: 25px; font-weight: 500;">
            Discover More Creatives
          </a>
        </div>
        <div style="padding: 20px; text-align: center; border-top: 1px solid #27272a;">
          <p style="color: #52525b; font-size: 11px; margin: 0;">
            ArtistrySynk • Connecting the Global Creative Community
          </p>
        </div>
      </div>
    `,
  },
];

export const getTemplateById = (id: string): NewsletterTemplate | undefined => {
  return newsletterTemplates.find((t) => t.id === id);
};
