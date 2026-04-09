
import os
import smtplib
from email.header import Header
from email.mime.text import MIMEText

# ======================================================================================
# Email Configuration
#
# For this to work, you need to set the following environment variables:
#
# SMTP_SERVER:   The address of your SMTP server (e.g., "smtp.gmail.com")
# SMTP_PORT:     The port of your SMTP server (e.g., 587 for TLS)
# SMTP_USERNAME: Your SMTP username (often your full email address)
# SMTP_PASSWORD: Your SMTP password or an app-specific password
# SENDER_EMAIL:  The email address you are sending from
#
# Example for Gmail:
# SMTP_SERVER="smtp.gmail.com"
# SMTP_PORT=587
# SMTP_USERNAME="your-email@gmail.com"
# SMTP_PASSWORD="your-app-password"
# SENDER_EMAIL="your-email@gmail.com"
# ======================================================================================

SMTP_SERVER = os.environ.get("SMTP_SERVER")
SMTP_PORT = os.environ.get("SMTP_PORT")
SMTP_USERNAME = os.environ.get("SMTP_USERNAME")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL")

def send_email(receiver_email: str, subject: str, body: str):
    """
    Sends an email using SMTP configuration from environment variables.
    If configuration is not set, it prints the email to the console instead.
    """
    if not all([SMTP_SERVER, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SENDER_EMAIL]):
        print("="*80)
        print("!!! EMAIL SENDING IS NOT CONFIGURED !!!")
        print("To enable, set SMTP environment variables.")
        print(f"TO: {receiver_email}")
        print(f"SUBJECT: {subject}")
        print("--- BODY ---")
        print(body)
        print("="*80)
        return

    try:
        smtp = smtplib.SMTP(SMTP_SERVER, int(SMTP_PORT))
        smtp.starttls()
        smtp.login(SMTP_USERNAME, SMTP_PASSWORD)

        msg = MIMEText(body, 'html', 'utf-8')
        msg['Subject'] = Header(subject, 'utf-8')
        msg['From'] = SENDER_EMAIL
        msg['To'] = receiver_email

        smtp.sendmail(SENDER_EMAIL, [receiver_email], msg.as_string())
        smtp.quit()
        print(f"Successfully sent email to {receiver_email}")
    except Exception as e:
        print(f"Failed to send email to {receiver_email}. Error: {e}")

