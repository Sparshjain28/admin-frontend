import React from 'react';

const SUPPORT_EMAIL = 'finonestmedia@gmail.com';
const APP_NAME = 'Finonest Pro';
const LAST_UPDATED = 'August 31, 2026';

export default function AccountDeletion() {
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <header style={styles.header}>
          <img
            src="/Finonest%20logo.png"
            alt="Finonest Pro"
            style={styles.logo}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div style={styles.headerText}>
            <p style={styles.badge}>ACCOUNT</p>
            <h1 style={styles.title}>Account Deletion</h1>
            <p style={styles.subtitle}>
              This page explains how to request permanent deletion of your {APP_NAME} account,
              the data that will be removed, and records that may need to be retained.
            </p>
            <p style={styles.lastUpdated}>LAST UPDATED: {LAST_UPDATED.toUpperCase()}</p>
          </div>
        </header>

        <hr style={styles.divider} />

        {/* Section 1 — How to Request */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>How to Request Account Deletion</h2>
          <p style={styles.paragraph}>
            To request permanent deletion of your {APP_NAME} account, send an email to our team:
          </p>
          <div style={styles.emailCard}>
            <p style={styles.emailLabel}>Send your request to</p>
            <a href={`mailto:${SUPPORT_EMAIL}?subject=Account%20Deletion%20Request`} style={styles.emailLink}>
              {SUPPORT_EMAIL}
            </a>
          </div>
          <p style={styles.paragraph}>Please include the following in your email:</p>
          <ol style={styles.orderedList}>
            <li style={styles.listItem}>
              Use the subject line: <strong>"Account Deletion Request"</strong>
            </li>
            <li style={styles.listItem}>
              Your <strong>registered mobile number</strong> linked to your {APP_NAME} account.
            </li>
            <li style={styles.listItem}>
              Send from your <strong>registered email address</strong>, if possible.
            </li>
          </ol>
          <p style={styles.paragraph}>
            Our team will verify your identity and process the deletion request.
          </p>
        </section>

        <hr style={styles.divider} />

        {/* Section 2 — Data Deleted */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Information That Will Be Deleted</h2>
          <p style={styles.paragraph}>
            When your account deletion request is completed, the following information
            linked to your account will be permanently deleted:
          </p>
          <ul style={styles.bulletList}>
            <li style={styles.listItem}>
              <strong>Personal profile details</strong>
              <ul style={styles.subList}>
                <li>Full name (first name, last name)</li>
                <li>Email address</li>
                <li>Mobile number</li>
                <li>Date of birth and gender</li>
                <li>Address, city, state, pincode</li>
                <li>Profile photo, if any</li>
              </ul>
            </li>
            <li style={styles.listItem}>
              <strong>KYC verification data</strong>
              <ul style={styles.subList}>
                <li>PAN number</li>
                <li>Aadhaar details</li>
              </ul>
            </li>
            <li style={styles.listItem}>
              <strong>Bank account details</strong>
              <ul style={styles.subList}>
                <li>Bank account number and IFSC code</li>
              </ul>
            </li>
            <li style={styles.listItem}>
              <strong>Account login credentials</strong>
              <ul style={styles.subList}>
                <li>MPIN and authentication tokens</li>
              </ul>
            </li>
            <li style={styles.listItem}>
              <strong>Saved preferences and app session data</strong>
            </li>
          </ul>
        </section>

        <hr style={styles.divider} />

        {/* Section 3 — Data Retained */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Information That May Be Retained</h2>
          <p style={styles.paragraph}>
            Some information may be retained when required for legal, regulatory,
            security, fraud prevention, or business record purposes:
          </p>
          <ul style={styles.bulletList}>
            <li style={styles.listItem}>Loan application records and disbursement history.</li>
            <li style={styles.listItem}>Payment and transaction records.</li>
            <li style={styles.listItem}>Payout records.</li>
            <li style={styles.listItem}>Audit logs and security logs.</li>
            <li style={styles.listItem}>Credit report pull history.</li>
            <li style={styles.listItem}>Records required under Indian tax, RBI, or financial regulations.</li>
          </ul>
        </section>

        <hr style={styles.divider} />

        {/* Section 4 — Timeline */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Deletion Timeline</h2>
          <ul style={styles.bulletList}>
            <li style={styles.listItem}>
              Account deletion requests are usually processed within <strong>15 to 30 days</strong>.
            </li>
            <li style={styles.listItem}>
              Some retained records may remain stored for a longer period if legally required.
            </li>
            <li style={styles.listItem}>
              Once deleted, the account <strong>cannot be restored</strong>.
            </li>
          </ul>
        </section>

        <hr style={styles.divider} />

        {/* Section 5 — Important Note */}
        <section style={styles.section}>
          <div style={styles.warningBox}>
            <h2 style={styles.warningTitle}>⚠️ Important Note</h2>
            <p style={styles.warningText}>
              Deleting your account is <strong>permanent</strong>. You will lose access to your
              profile, loan tracking history, saved data, and all associated information
              linked to your {APP_NAME} account.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer style={styles.footer}>
          <img
            src="/Finonest%20logo.png"
            alt="Finonest Pro"
            style={styles.footerLogo}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <p style={styles.footerText}>{APP_NAME}</p>
          <p style={styles.footerSubtext}>
            For questions, contact{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} style={styles.footerLink}>{SUPPORT_EMAIL}</a>
          </p>
          <p style={styles.copyright}>© {new Date().getFullYear()} Finonest. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    display: 'flex',
    justifyContent: 'center',
    padding: '40px 16px',
    fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
  },
  container: {
    width: '100%',
    maxWidth: 720,
    background: '#ffffff',
    borderRadius: 16,
    padding: '48px 40px',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  logo: {
    height: 48,
    marginBottom: 20,
    objectFit: 'contain' as const,
  },
  headerText: {},
  badge: {
    display: 'inline-block',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 2,
    color: '#6366f1',
    background: '#eef2ff',
    padding: '4px 12px',
    borderRadius: 20,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 800,
    color: '#0f172a',
    margin: '0 0 12px',
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 1.6,
    margin: '0 0 12px',
  },
  lastUpdated: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 1.5,
    color: '#94a3b8',
  },
  divider: {
    border: 'none',
    borderTop: '1px solid #e2e8f0',
    margin: '32px 0',
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 16px',
  },
  paragraph: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 1.7,
    margin: '0 0 16px',
  },
  emailCard: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: '20px 24px',
    textAlign: 'center' as const,
    marginBottom: 20,
  },
  emailLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: 600,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  emailLink: {
    fontSize: 18,
    fontWeight: 700,
    color: '#6366f1',
    textDecoration: 'none',
  },
  orderedList: {
    margin: '0 0 16px',
    paddingLeft: 20,
  },
  bulletList: {
    margin: '0 0 16px',
    paddingLeft: 20,
    listStyleType: 'disc' as const,
  },
  subList: {
    marginTop: 6,
    paddingLeft: 18,
    listStyleType: 'circle' as const,
    color: '#64748b',
    fontSize: 13,
    lineHeight: 1.8,
  },
  listItem: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 1.8,
    marginBottom: 6,
  },
  warningBox: {
    background: '#fef3c7',
    border: '1px solid #fcd34d',
    borderRadius: 12,
    padding: '20px 24px',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#92400e',
    margin: '0 0 8px',
  },
  warningText: {
    fontSize: 14,
    color: '#78350f',
    lineHeight: 1.7,
    margin: 0,
  },
  footer: {
    textAlign: 'center' as const,
    marginTop: 40,
    paddingTop: 24,
    borderTop: '1px solid #e2e8f0',
  },
  footerLogo: {
    height: 32,
    marginBottom: 12,
    objectFit: 'contain' as const,
  },
  footerText: {
    fontSize: 14,
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 4px',
  },
  footerSubtext: {
    fontSize: 13,
    color: '#64748b',
    margin: '0 0 8px',
  },
  footerLink: {
    color: '#6366f1',
    textDecoration: 'none',
  },
  copyright: {
    fontSize: 12,
    color: '#94a3b8',
    margin: 0,
  },
};
