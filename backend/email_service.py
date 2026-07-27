from dotenv import load_dotenv

load_dotenv()
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
print("SMTP_SERVER:", os.getenv("SMTP_SERVER"))
print("SMTP_PORT:", os.getenv("SMTP_PORT"))
print("SMTP_EMAIL:", os.getenv("SMTP_EMAIL"))


SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")


def send_otp_email(receiver_email: str, otp: str):
    subject = "NearSell Password Reset OTP"

    body = f"""
Hello,

We received a request to reset your NearSell account password.

Your One-Time Password (OTP) is:

{otp}

This OTP is valid for 5 minutes.

If you did not request a password reset, you can safely ignore this email.

Regards,
NearSell Team
"""

    message = MIMEMultipart()
    message["From"] = SMTP_EMAIL
    message["To"] = receiver_email
    message["Subject"] = subject

    message.attach(MIMEText(body, "plain"))

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.send_message(message)
        server.quit()

        print(f"OTP email sent successfully to {receiver_email}")

    except Exception as e:
        print("Email sending failed:", e)
        raise