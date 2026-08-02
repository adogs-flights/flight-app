import html as html_lib
import os
import re
import smtplib
from email.header import Header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, make_msgid

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
# SENDER_NAME:   (선택) 발신자 표시 이름. 기본 "해봉티켓"
#
# 스팸 방지의 핵심은 HTML 꾸밈이 아니라 SPF/DKIM/DMARC(도메인 DNS)와 발신 평판이다.
# 여기서는 전달력에 도움 되는 것만 처리한다:
#  - text/plain + text/html 멀티파트(HTML 단독은 스팸 점수를 올린다)
#  - 발신자 표시 이름, Reply-To, Message-ID
#  - 가벼운 텍스트 위주의 공통 템플릿
# ======================================================================================

SMTP_SERVER = os.environ.get("SMTP_SERVER")
SMTP_PORT = os.environ.get("SMTP_PORT")
SMTP_USERNAME = os.environ.get("SMTP_USERNAME")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL")
SENDER_NAME = os.environ.get("SENDER_NAME", "해봉티켓")


def _looks_like_full_document(body: str) -> bool:
    lowered = body.lower()
    return "<html" in lowered or "<!doctype" in lowered


def _wrap_html(inner: str) -> str:
    """HTML 조각을 공통 브랜드 템플릿으로 감싼다(인라인 스타일, 가벼운 구조)."""
    font = "Arial,'Apple SD Gothic Neo','Malgun Gothic',sans-serif"
    return f"""<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f5f7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr><td style="background:#111827;padding:18px 24px;">
          <span style="color:#ffffff;font-family:{font};font-size:18px;font-weight:bold;">해봉티켓</span>
        </td></tr>
        <tr><td style="padding:24px;font-family:{font};font-size:15px;line-height:1.7;color:#1f2937;">
          {inner}
        </td></tr>
        <tr><td style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;font-family:{font};font-size:12px;color:#9ca3af;">
          본 메일은 해봉티켓(해외이동봉사 일정 관리)에서 발송되었습니다.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""


def _html_to_text(body: str) -> str:
    """HTML에서 읽을 만한 plain text를 뽑는다(멀티파트 대체 본문용)."""
    text = re.sub(r"(?is)<(style|script)[^>]*>.*?</\1>", "", body)
    text = re.sub(r"(?i)<br\s*/?>", "\n", text)
    text = re.sub(r"(?i)</(p|div|h[1-6]|li|tr)>", "\n", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = html_lib.unescape(text)
    lines = [line.strip() for line in text.splitlines()]
    text = "\n".join(line for line in lines if line)
    return text or "해봉티켓 알림"


def send_email(receiver_email: str, subject: str, body: str):
    """
    Sends an email using SMTP configuration from environment variables.
    If configuration is not set, it prints the email to the console instead.

    body는 HTML(조각 또는 완성 문서)로 받는다. 자동으로 plain-text 대체 본문을 만들어
    멀티파트로 발송한다.
    """
    html_body = body if _looks_like_full_document(body) else _wrap_html(body)
    text_body = _html_to_text(body)

    if not all([SMTP_SERVER, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SENDER_EMAIL]):
        print("=" * 80)
        print("!!! EMAIL SENDING IS NOT CONFIGURED !!!")
        print("To enable, set SMTP environment variables.")
        print(f"TO: {receiver_email}")
        print(f"SUBJECT: {subject}")
        print("--- TEXT ---")
        print(text_body)
        print("=" * 80)
        return

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = Header(subject, "utf-8")
        msg["From"] = formataddr((str(Header(SENDER_NAME, "utf-8")), SENDER_EMAIL))
        msg["To"] = receiver_email
        msg["Reply-To"] = SENDER_EMAIL
        msg["Message-ID"] = make_msgid()
        # 멀티파트/alternative는 마지막 파트를 선호한다 → text 먼저, html 나중에.
        msg.attach(MIMEText(text_body, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        smtp = smtplib.SMTP(SMTP_SERVER, int(SMTP_PORT))
        smtp.starttls()
        smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
        smtp.sendmail(SENDER_EMAIL, [receiver_email], msg.as_string())
        smtp.quit()
        print(f"Successfully sent email to {receiver_email}")
    except Exception as e:
        print(f"Failed to send email to {receiver_email}. Error: {e}")
