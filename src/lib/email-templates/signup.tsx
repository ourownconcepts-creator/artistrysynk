import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>ArtistrySynk</Text>
        <Heading style={h1}>Confirm your email</Heading>
        <Text style={text}>
          Thanks for signing up for{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          !
        </Text>
        <Text style={text}>
          Please confirm your email address (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) by clicking the button below:
        </Text>
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          Confirm email
        </Button>
        <Text style={helpText}>
          If the button does not open, copy this secure link into your browser:
        </Text>
        <Link href={confirmationUrl} style={confirmationLink}>
          {confirmationUrl}
        </Link>
        <Text style={footer}>
          If you didn't create an account, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const brand = {
  color: '#6d28d9',
  fontSize: '18px',
  fontWeight: 'bold' as const,
  margin: '0 0 24px',
}
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#000000',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const link = { color: 'inherit', textDecoration: 'underline' }
const button = {
  backgroundColor: '#6d28d9',
  color: '#ffffff',
  fontSize: '14px',
  border: '1px solid #6d28d9',
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const helpText = { fontSize: '12px', color: '#6b7280', margin: '24px 0 6px' }
const confirmationLink = {
  color: '#6d28d9',
  fontSize: '12px',
  lineHeight: '1.5',
  wordBreak: 'break-all' as const,
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
