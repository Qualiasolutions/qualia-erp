import Link from 'next/link';
import { fadeInClasses } from '@/lib/transitions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, MessageSquare, Clock } from 'lucide-react';

const faqs = [
  {
    question: 'How do I check my project progress?',
    answer:
      'Navigate to the Projects page from the sidebar, then click on any project to view its detailed roadmap, phases, and overall progress.',
  },
  {
    question: 'How do I submit a feature request?',
    answer:
      'Go to the Requests page from the sidebar. Fill out the form with your request title, description, related project, and priority level. Our team will review it and respond.',
  },
  {
    question: 'Where can I find my invoices?',
    answer:
      'All your invoices are available on the Invoices page. You can view payment status, due dates, and download PDF copies when available.',
  },
  {
    question: 'How do I update my account details?',
    answer:
      'Visit the Account page from the sidebar to update your display name. For email changes or password resets, contact our support team.',
  },
  {
    question: 'What do the project statuses mean?',
    answer:
      'Active — currently being worked on. Demos — in demo/review stage. Launched — live in production. Delayed — temporarily paused. Archived — completed and stored.',
  },
  {
    question: 'How often is project data updated?',
    answer:
      'Project progress and phase updates are reflected in real-time as our team completes work. Dashboard statistics refresh each time you visit the page.',
  },
];

export default function PortalSupportPage() {
  return (
    <div className={`space-y-8 ${fadeInClasses}`}>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Support</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Get help, find answers, or reach out to our team
        </p>
      </div>

      {/* Contact cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-start gap-4 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-qualia-600/10">
              <Mail className="h-5 w-5 text-qualia-600" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Email Support</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                For general inquiries and project questions
              </p>
              <a
                href="mailto:support@qualiasolutions.io"
                className="mt-2 inline-block text-sm font-medium text-qualia-600 hover:text-qualia-700"
              >
                support@qualiasolutions.io
              </a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start gap-4 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-qualia-600/10">
              <Clock className="h-5 w-5 text-qualia-600" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Response Time</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                We typically respond within 24 hours on business days
              </p>
              <p className="mt-2 text-sm text-muted-foreground/70">Mon — Fri, 9:00 — 18:00 EET</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature request hint */}
      <Card className="border-qualia-200 bg-qualia-50/30">
        <CardContent className="flex items-start gap-4 p-5">
          <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-qualia-600" />
          <div>
            <h3 className="font-medium text-foreground">Have a feature idea?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Use the{' '}
              <Link href="/portal/requests" className="font-medium text-qualia-600 underline">
                Requests
              </Link>{' '}
              page to submit feature requests directly. Our team reviews all submissions and will
              respond with updates on feasibility and timeline.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {faqs.map((faq) => (
              <details key={faq.question} className="group py-4 first:pt-0 last:pb-0">
                <summary className="flex cursor-pointer items-center justify-between text-sm font-medium text-foreground hover:text-qualia-600">
                  {faq.question}
                  <span className="ml-2 shrink-0 text-muted-foreground transition-transform group-open:rotate-180">
                    &#9662;
                  </span>
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
              </details>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
